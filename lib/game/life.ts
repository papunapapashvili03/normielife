// The life loop: months pass, money moves, events happen, people die.
import {
  BASELINE_CASH,
  BROKE_THRESHOLD,
  SIM,
  EXPENSES,
  JOB,
  MAX_AGE,
  MOVED_OUT_MIN_EXPENSES,
  MOVE_OUT_AGE,
  RETIRE_MIN_AGE,
  UNBROKE_THRESHOLD,
  eventChance,
  maxFastForward,
  yearlyDeathChance,
} from "./config";
import { logSignals, pickRandomEvent, pickSignalEvent, presentDueQueue } from "./events/engine";
import { money } from "./format";
import { addHistory, addLog, ageOf, hasFlag, setFlag } from "./history";
import { payday, quitJob, startJob } from "./job";
import { tickMarket } from "./market";
import { setMood } from "./mood";
import { forceSell, netWorth, portfolioValue, sellAll, settleRugs } from "./portfolio";
import { chance, pick, rand } from "./rng";
import { passiveFollowers, updateProgress } from "./status";
import { startTradeSim } from "./tradesim";
import { generateFeed } from "./twitter";
import type { GameState, Signal } from "./types";

export function expenses(s: GameState): number {
  const base = EXPENSES[s.status];
  if (ageOf(s) >= MOVE_OUT_AGE) return Math.max(base, MOVED_OUT_MIN_EXPENSES);
  return base;
}

export function advanceOneMonth(s: GameState): Signal[] {
  const ageBefore = ageOf(s);
  s.month++;
  const age = ageOf(s);
  if (age !== ageBefore) addLog(s, `🎂 You turned ${age}.`);

  payday(s);

  const exp = expenses(s);
  if (s.cash >= exp) s.cash -= exp;
  else {
    const short = exp - s.cash;
    if (portfolioValue(s) > short) {
      const raised = forceSell(s, short);
      addLog(s, `💸 Sold ${money(raised)} of bags to pay rent.`, "bad");
    }
    // Whatever's still missing: parents, credit card, vibes.
    s.cash = Math.max(0, s.cash - exp);
  }

  const signals = tickMarket(s);
  settleRugs(s);
  generateFeed(s);
  passiveFollowers(s);
  updateProgress(s);
  checkBroke(s);
  checkDeath(s);
  return signals;
}

export function checkBroke(s: GameState) {
  const broke = hasFlag(s, "broke");
  const nw = netWorth(s);
  if (!broke && hasFlag(s, "first_trade") && !s.job.employed && s.cash < BROKE_THRESHOLD && portfolioValue(s) < BROKE_THRESHOLD) {
    setFlag(s, "broke");
    setMood(s, "very_sad");
    s.run.timesBroke++;
    addHistory(s, "💀", s.run.timesBroke === 1 ? "Went broke for the first time." : `Went broke. Again. (x${s.run.timesBroke})`, true);
    s.queue.unshift({ event: "sys_broke", at: s.month, ctx: {} });
  } else if (broke && nw >= UNBROKE_THRESHOLD) {
    delete s.flags.broke;
  }
  if (hasFlag(s, "rebuilding") && s.cash >= BASELINE_CASH) {
    delete s.flags.rebuilding;
    addHistory(s, "💵", `Back to the ${money(BASELINE_CASH)} baseline.`, true);
    s.queue.push({ event: "sys_baseline", at: s.month, ctx: {} });
  }
}

const OLD_DEATHS = [
  "peacefully in your sleep",
  "while checking charts at 3am",
  "of a heart attack watching a -90% candle",
  "of old age, surrounded by family and 47 open chart tabs",
  "mid-sentence explaining memecoins to a nurse",
  "right after typing 'gm'",
  "holding a bag you refused to sell",
];
const YOUNG_DEATHS = [
  "choking on a McFlurry",
  "falling down the stairs while refreshing a chart",
  "in a freak scooter accident",
];

export function checkDeath(s: GameState) {
  if (s.ended) return;
  const age = ageOf(s);
  const p = yearlyDeathChance(age) / 12;
  if (age >= MAX_AGE || chance(s, p)) {
    let cause = pick(s, age < 50 ? YOUNG_DEATHS : OLD_DEATHS);
    if (age < 50 && hasFlag(s, "lambo")) cause = "in a Lamborghini crash. Worth it?";
    die(s, cause);
  }
}

export function die(s: GameState, cause: string) {
  if (s.job.employed) s.job.employed = false;
  const age = ageOf(s);
  addHistory(s, "🪦", `Died at ${age}, ${cause}.`, true);
  s.ended = { cause: "death", age, month: s.month, text: `You died at ${age}, ${cause}.` };
  s.current = null;
  s.queue = [];
}

/** Retire: cash out, then live out the rest of your days quietly. */
export function retire(s: GameState) {
  if (s.ended || ageOf(s) < RETIRE_MIN_AGE) return;
  if (s.job.employed) quitJob(s);
  sellAll(s);
  updateProgress(s);
  addHistory(s, "🏖️", `Retired with ${money(s.cash)}.`, true);
  // Fast-forward to the end.
  while (!s.ended) {
    s.month++;
    const age = ageOf(s);
    if (age >= MAX_AGE || rand(s) < yearlyDeathChance(age) / 12) {
      die(s, pick(s, ["peacefully, far away from the charts", "on a beach, finally logged off", "of old age, phone face down for once"]));
    }
  }
  const end = s.ended as GameState["ended"];
  if (end) end.cause = "retired";
}

/** "Age up": fast-forward through quiet months until something happens. */
export function nextMonth(s: GameState, maxMonths?: number) {
  if (s.ended || s.current || s.sim) return;
  if (presentDueQueue(s)) return;
  const limit = maxMonths ?? maxFastForward(ageOf(s), hasFlag(s, "discovered"));
  let quiet = 0;
  for (let i = 0; i < limit; i++) {
    const signals = advanceOneMonth(s);
    if (s.ended) return;
    if (presentDueQueue(s)) {
      logSignals(s, signals, null);
      return;
    }
    const sig = pickSignalEvent(s, signals);
    logSignals(s, signals, sig);
    if (sig) return;
    if (chance(s, eventChance(ageOf(s), s.job.employed))) {
      // Some of life's "moments" are trades on the decision board.
      if (chance(s, SIM.share) && startTradeSim(s)) return;
      if (pickRandomEvent(s)) return;
    }
    quiet++;
  }
  if (quiet > 0) addLog(s, quiet === 1 ? "📅 A quiet month passed." : `📅 ${quiet} quiet months passed.`);
}

/** Work shifts until cash reaches `target` (stops early if life happens). */
export function workUntil(s: GameState, target: number, cap = 48) {
  if (s.ended || s.current || s.sim) return;
  if (!s.job.employed) startJob(s);
  const before = s.cash;
  for (let i = 0; i < cap && s.cash < target && !s.current && !s.sim && !s.ended; i++) nextMonth(s, 1);
  if (s.cash > before && !s.current && !s.sim) addLog(s, `${JOB.emoji} Shifts done. Cash is now ${money(s.cash)}.`, "good");
}

/** Work shifts for up to N months (stops early if life happens). */
export function work(s: GameState, months: number) {
  if (s.ended || s.current || s.sim) return;
  if (!s.job.employed) startJob(s);
  const before = s.cash;
  nextMonth(s, months);
  if (s.cash > before && !s.current) addLog(s, `${JOB.emoji} Shifts done. Cash is now ${money(s.cash)}.`, "good");
}
