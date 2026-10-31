// KOL calls: famous traders post coins in real time. Each call is a decision —
// go in (a live trade) or ignore it (and find out later what you missed).
// Every call costs a week; four of them and the month moves on.
import { SIM } from "./config";
import { getCoin } from "./coins";
import { pct } from "./format";
import { addLog } from "./history";
import { KOLS } from "./kols";
import { nextMonth } from "./life";
import { moveCoin } from "./market";
import { moodFromMissed, setMood } from "./mood";
import { settleRugs } from "./portfolio";
import { pick, range, weighted } from "./rng";
import { buildTradeSim } from "./tradesim";
import type { GameState, Kol } from "./types";

export const WEEKS_PER_MONTH = 4;

const LINES = [
  "This is the one. ${t}",
  "${t}. Don't fade me on this one.",
  "Loaded a fat bag of ${t}. NFA 🫡",
  "${t} is about to send. You've been warned.",
  "If you're not in ${t} by tonight, don't cry tomorrow.",
  "${t} chart is the cleanest thing I've seen all week.",
  "Aping ${t} with my whole chest.",
  "Dev of ${t} is legit. Talked to them for hours.",
];

export function canCall(s: GameState): boolean {
  return !s.ended && !s.current && !s.sim && !s.offer && "discovered" in s.flags && s.cash >= SIM.minCash;
}

/** A famous trader posts a coin. Lands as a notification you have to answer. */
export function pingCall(s: GameState): boolean {
  if (!canCall(s)) return false;
  const kol: Kol = weighted(s, KOLS, (k) => k.influence);
  const sim = buildTradeSim(s, "kol", kol.id);
  const coin = getCoin(s, sim.coinId)!;
  const text = pick(s, LINES).replace("${t}", `$${coin.ticker}`);
  const id = s.nextCallId ?? 1;
  s.nextCallId = id + 1;
  s.offer = { id, kolId: kol.id, text, sim: { ...sim, live: true, fromCall: true } };
  const likes = Math.round(kol.audience * range(s, 0.004, 0.03));
  s.feed.unshift({ id: s.nextTweetId++, month: s.month, handle: kol.handle, name: kol.name, avatar: kol.avatar, text, likes, rts: Math.round(likes * 0.25), kind: "kol", coinId: coin.id });
  if (s.feed.length > 40) s.feed.length = 40;
  return true;
}

/** Go in: the call becomes a live trade waiting for your bag size. */
export function goIn(s: GameState) {
  const offer = s.offer;
  if (!offer || s.sim || s.current) return;
  s.sim = offer.sim;
  s.offer = null;
  s.kolIntel[offer.kolId] = Math.min(1, (s.kolIntel[offer.kolId] ?? 0) + 0.08);
  s.lastSeen["trade_sim"] = s.month;
}

/** Ignore: the coin plays out without you, and you hear how it went. */
export function ignoreCall(s: GameState, advance = true) {
  const offer = s.offer;
  if (!offer) return;
  s.offer = null;
  const coin = getCoin(s, offer.sim.coinId);
  const kol = KOLS.find((k) => k.id === offer.kolId);
  const total = offer.sim.legMults.reduce((a, b) => a * b, 1);
  if (coin) {
    moveCoin(coin, total);
    settleRugs(s);
    const who = kol?.handle ?? "A KOL";
    const text =
      total <= 0
        ? `Dodged it. ${who}'s $${coin.ticker} rugged to zero.`
        : total >= 1.2
          ? `You ignored ${who}'s $${coin.ticker}. It closed the day ${pct(total - 1)}.`
          : total <= 0.8
            ? `Dodged it. ${who}'s $${coin.ticker} closed the day ${pct(total - 1)}.`
            : `${who}'s $${coin.ticker} went nowhere. ${pct(total - 1)}.`;
    const tone = total >= 1.2 ? "bad" : total <= 0.8 ? "good" : "neutral";
    s.callResult = { id: offer.id, text, tone };
    setMood(s, moodFromMissed(total));
    addLog(s, text, tone);
    s.kolIntel[offer.kolId] = Math.min(1, (s.kolIntel[offer.kolId] ?? 0) + 0.05);
  }
  if (advance) advanceWeek(s);
}

/** A call used up a week. Four weeks and the month rolls over. */
export function advanceWeek(s: GameState) {
  s.week = (s.week ?? 0) + 1;
  if (s.week >= WEEKS_PER_MONTH) {
    s.week = 0;
    nextMonth(s, 1);
  }
}
