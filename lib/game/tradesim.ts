// Intraday trade simulations: set the scene, show the chart, ask for a decision,
// then play the day forward in three legs with a decision after each.
import { SIM, SIZE_BANDS } from "./config";
import { getCoin, holders, marketCap, spawnCoin } from "./coins";
import { compact, money, pct } from "./format";
import { addLog } from "./history";
import { KOLS } from "./kols";
import { moveCoin } from "./market";
import { buy, getPosition, maxBuy, netWorth, positionValue, sell, settleRugs } from "./portfolio";
import { chance, pick, range, weightedKey, type RngHolder } from "./rng";
import { updateProgress } from "./status";
import type { CoinFate, GameState, SimNote, SimScenario, SimScript, SizeBand, Tone, TradeSim } from "./types";

export const LEG_LABELS = ["First hour", "Afternoon", "End of day"];

/** Multiplier ranges for each of the three legs. Tuned so simple strategies are roughly break-even. */
const SCRIPT_LEGS: Record<SimScript, [number, number][]> = {
  moon: [
    [0.9, 1.4],
    [1.3, 2.0],
    [1.2, 2.2],
  ],
  pumpdump: [
    [1.2, 2.0],
    [0.3, 0.6],
    [0.7, 1.1],
  ],
  bleed: [
    [0.75, 0.97],
    [0.7, 0.95],
    [0.6, 0.92],
  ],
  rug: [
    [0.8, 1.4],
    [0.9, 1.4],
    [0, 0],
  ],
  fakeout: [
    [0.5, 0.75],
    [1.3, 2.2],
    [1.0, 1.6],
  ],
  chop: [
    [0.85, 1.15],
    [0.85, 1.15],
    [0.85, 1.15],
  ],
  legendary: [
    [1.0, 2.0],
    [2.0, 4.0],
    [2.5, 5.0],
  ],
};

const BASE_WEIGHTS: Record<SimScript, number> = { moon: 9, pumpdump: 18, bleed: 22, rug: 20, fakeout: 12, chop: 18, legendary: 0.6 };

const SCENARIO_BIAS: Record<SimScenario, Partial<Record<SimScript, number>>> = {
  kol: { pumpdump: 1.8, rug: 1.2 },
  launch: { rug: 1.4, legendary: 2, moon: 1.2 },
  dip: { fakeout: 1.8, bleed: 1.3 },
  whale: { moon: 1.3, pumpdump: 1.2 },
  breakout: { chop: 1.3, moon: 1.2 },
  rumor: { pumpdump: 1.5 },
};

/** What the coin does in later months once the day is over. */
const SCRIPT_FATE: Record<SimScript, CoinFate> = {
  moon: "pump",
  legendary: "moon",
  pumpdump: "bleed",
  bleed: "bleed",
  rug: "rug",
  fakeout: "pump",
  chop: "chop",
};

/** Price history leading up to "now" (= 1), as anchor points. */
const PRE_SHAPES: Record<SimScenario, number[]> = {
  kol: [0.55, 0.6, 0.57, 0.62, 0.6, 0.66, 1],
  launch: [0.15, 0.3, 0.45, 0.4, 0.7, 0.85, 1],
  dip: [0.7, 1.1, 1.6, 2.0, 1.7, 1.3, 1],
  whale: [0.8, 0.83, 0.81, 0.85, 0.84, 0.86, 1],
  breakout: [0.82, 0.88, 0.8, 0.87, 0.81, 0.86, 1],
  rumor: [0.6, 0.65, 0.7, 0.72, 0.8, 0.9, 1],
};

const TITLES: Record<SimScenario, string> = {
  kol: "KOL CALL",
  launch: "FRESH LAUNCH",
  dip: "BUY THE DIP?",
  whale: "WHALE BUY",
  breakout: "BREAKOUT",
  rumor: "LISTING RUMOR",
};

const DANGER: SimScript[] = ["rug", "pumpdump", "bleed"];
const PROMISING: SimScript[] = ["moon", "fakeout", "legendary"];

function interpolate(h: RngHolder, anchors: number[], n: number): number[] {
  const out: number[] = [];
  const a = anchors.map((v, i) => (i === anchors.length - 1 ? v : v * range(h, 0.92, 1.08)));
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (a.length - 1);
    const k = Math.min(a.length - 2, Math.floor(t));
    const f = t - k;
    const v = a[k] * Math.pow(a[k + 1] / a[k], f);
    out.push(i === n - 1 ? 1 : v * range(h, 0.97, 1.03));
  }
  return out;
}

/** n points walking from `from` to `from * m`. A zero multiplier is a rug: calm, then a cliff. */
function leg(h: RngHolder, from: number, m: number, n: number): number[] {
  const out: number[] = [];
  if (m <= 0) {
    for (let i = 1; i <= n; i++) {
      if (i < n - 1) out.push(from * range(h, 0.96, 1.08));
      else if (i === n - 1) out.push(from * range(h, 0.25, 0.45));
      else out.push(0);
    }
    return out;
  }
  const to = from * m;
  for (let i = 1; i <= n; i++) {
    const base = from * Math.pow(to / from, i / n);
    out.push(i === n ? to : base * range(h, 0.94, 1.06));
  }
  return out;
}

function noteFor(s: GameState, ticker: string, label: string, m: number): SimNote {
  let text: string;
  let tone: Tone = "neutral";
  if (m <= 0) {
    text = `🚨 Liquidity pulled. $${ticker} is gone.`;
    tone = "bad";
  } else if (m >= 1.8) {
    text = pick(s, [`🚀 It rips. $${ticker} ${pct(m - 1)}.`, `🚀 Vertical green candles. $${ticker} ${pct(m - 1)}.`]);
    tone = "good";
  } else if (m >= 1.12) {
    text = pick(s, [`📈 Steady bid. $${ticker} ${pct(m - 1)}.`, `📈 Buyers keep coming. $${ticker} ${pct(m - 1)}.`]);
    tone = "good";
  } else if (m >= 0.9) {
    text = pick(s, [`😐 Sideways. $${ticker} ${pct(m - 1)}. Nobody knows anything.`, `😐 Chop. $${ticker} ${pct(m - 1)}.`]);
  } else if (m >= 0.6) {
    text = pick(s, [`📉 Sellers step in. $${ticker} ${pct(m - 1)}.`, `📉 Slow bleed. $${ticker} ${pct(m - 1)}.`]);
    tone = "bad";
  } else {
    text = pick(s, [`🩸 Dump. $${ticker} ${pct(m - 1)}. Someone big just sold.`, `🩸 Trapdoor. $${ticker} ${pct(m - 1)}.`]);
    tone = "bad";
  }
  return { label, text, tone };
}

function readFor(s: GameState, script: SimScript): string {
  const k = s.player.stats.knowledge;
  if (k < 15) return "🧠 Your read: you have no idea what you're looking at.";
  const truth = DANGER.includes(script) ? "danger" : PROMISING.includes(script) ? "promising" : "neutral";
  const accurate = chance(s, Math.min(0.9, 0.35 + k / 150));
  const shown = accurate ? truth : pick(s, (["danger", "promising", "neutral"] as const).filter((x) => x !== truth));
  if (shown === "danger") return pick(s, ["🧠 Your read: top holders look coordinated. Feels like exit liquidity.", "🧠 Your read: the dev wallet keeps moving. Careful."]);
  if (shown === "promising") return pick(s, ["🧠 Your read: organic buyers, locked liquidity. This might have legs.", "🧠 Your read: smart wallets are accumulating, not flipping."]);
  return "🧠 Your read: nothing special. Could chop around all day.";
}

function sceneFor(s: GameState, scenario: SimScenario, ticker: string, mc: number, pre: number[], holdersN: number): string {
  const t = `$${ticker}`;
  const m = money(mc);
  const run = pct(1 / pre[0] - 1);
  switch (scenario) {
    case "kol": {
      const k = pick(s, KOLS);
      return `${k.handle} just posted ${t} to ${compact(k.audience)} followers. It's already ${run} on the day.\n\nMC ${m}. Everyone's watching the same chart.`;
    }
    case "launch":
      return `${t} launched 40 minutes ago. Holders went from 0 to ${compact(holdersN)} and volume is exploding.\n\nMC ${m}. Early, or exit liquidity?`;
    case "dip":
      return `${t} ran hard yesterday and is pulling back now. CT says "buy the dip".\n\nMC ${m}. Is this the dip, or the top of the next one down?`;
    case "whale":
      return `A wallet that's up $4M this month just market-bought ${t}. One giant green candle.\n\nMC ${m}. Copy the whale?`;
    case "breakout":
      return `${t} has been stuck in a range for days. It just broke out on big volume.\n\nMC ${m}. Real breakout or fakeout?`;
    case "rumor":
      return `Group chat rumor: ${t} gets listed on a big exchange this week. It's ${run} on the day.\n\nMC ${m}. Buy the rumor?`;
  }
}

export function canStartSim(s: GameState): boolean {
  return !s.ended && !s.current && !s.sim && "discovered" in s.flags && s.cash >= SIM.minCash;
}

export function canHunt(s: GameState): boolean {
  return canStartSim(s) && s.lastSeen["trade_hunt"] !== s.month;
}

export function startTradeSim(s: GameState, scenario?: SimScenario): boolean {
  if (!canStartSim(s)) return false;
  const sc = scenario ?? pick(s, Object.keys(PRE_SHAPES) as SimScenario[]);
  const weights = { ...BASE_WEIGHTS };
  for (const [k, v] of Object.entries(SCENARIO_BIAS[sc])) weights[k as SimScript] *= v ?? 1;
  const l = (s.player.stats.luck - 50) / 50;
  for (const k of PROMISING) weights[k] *= 1 + l * 0.3;
  for (const k of ["rug", "bleed"] as const) weights[k] *= 1 - l * 0.15;
  const script = weightedKey(s, weights);

  const coin = spawnCoin(s, { fate: SCRIPT_FATE[script], tier: chance(s, 0.75) ? "micro" : "small" });
  const pre = interpolate(s, PRE_SHAPES[sc], SIM.prePoints);
  const legMults = SCRIPT_LEGS[script].map(([a, b]) => (a === b ? a : range(s, a, b)));
  const points = [...pre];
  const legEnds: number[] = [];
  let cur = 1;
  for (const m of legMults) {
    points.push(...leg(s, cur, m, SIM.legPoints));
    legEnds.push(points.length - 1);
    cur *= m;
  }
  const mediumBag = Math.min(Math.floor(netWorth(s) * SIZE_BANDS.medium.pct), maxBuy(s, coin));

  s.sim = {
    coinId: coin.id,
    scenario: sc,
    script,
    title: TITLES[sc],
    scene: sceneFor(s, sc, coin.ticker, marketCap(coin), pre, holders(coin)),
    read: readFor(s, script),
    points,
    preLen: pre.length,
    legEnds,
    legMults,
    legsRevealed: 0,
    revealed: pre.length - 1,
    phase: "setup",
    entered: false,
    passed: false,
    stake: 0,
    realized: 0,
    exits: [],
    adds: [],
    notes: [],
    hypothetical: Math.max(0, mediumBag),
  };
  s.lastSeen["trade_sim"] = s.month;
  return true;
}

/** Stake options for the entry decision. */
export function stakeOptions(s: GameState): { band: SizeBand; amount: number }[] {
  const sim = s.sim;
  const coin = sim ? getCoin(s, sim.coinId) : undefined;
  if (!sim || !coin) return [];
  const nw = netWorth(s);
  const cap = Math.min(s.cash, maxBuy(s, coin));
  const out: { band: SizeBand; amount: number }[] = [];
  for (const band of ["small", "medium", "large", "fullsend"] as SizeBand[]) {
    const amount = Math.floor(Math.min(cap, nw * SIZE_BANDS[band].pct));
    if (amount >= 1 && !out.some((o) => o.amount === amount)) out.push({ band, amount });
  }
  return out;
}

function revealLeg(s: GameState, sim: TradeSim) {
  const i = sim.legsRevealed;
  const coin = getCoin(s, sim.coinId);
  if (!coin || i >= sim.legMults.length) return;
  const m = sim.legMults[i];
  moveCoin(coin, m);
  settleRugs(s);
  sim.legsRevealed++;
  sim.revealed = sim.legEnds[i];
  sim.notes.push(noteFor(s, coin.ticker, LEG_LABELS[i], m));
}

function finish(s: GameState, sim: TradeSim) {
  while (sim.legsRevealed < sim.legMults.length) revealLeg(s, sim);
  sim.phase = "done";
  const coin = getCoin(s, sim.coinId);
  const ticker = coin ? `$${coin.ticker}` : "the coin";
  const total = sim.legMults.reduce((a, b) => a * b, 1);
  if (sim.passed) {
    const would = sim.hypothetical * total * (1 - SIM.fee);
    sim.notes.push({
      label: "Recap",
      text: `You sat this one out. ${ticker} finished the day ${pct(total - 1)}. A ${money(sim.hypothetical)} bag would be ${money(would)}.`,
      tone: total >= 1 ? "bad" : "good",
    });
  } else {
    const p = getPosition(s, sim.coinId);
    const open = p ? positionValue(s, p) : 0;
    const pnl = sim.realized + open - sim.stake;
    const tail = open > 0 ? ` You're still holding ${money(open)} of ${ticker}; it's in your bags.` : "";
    sim.notes.push({
      label: "Recap",
      text: `In for ${money(sim.stake)}, out with ${money(sim.realized + open)} (${money(pnl, { sign: true })}).${tail}`,
      tone: pnl >= 0 ? "good" : "bad",
    });
    addLog(s, `Day trade on ${ticker}: ${money(pnl, { sign: true })}`, pnl >= 0 ? "good" : "bad");
  }
  updateProgress(s);
}

/** Fees and slippage: the fresh units are worth a little less than what you paid. */
function trimForFees(s: GameState, coinId: string, spent: number) {
  const p = getPosition(s, coinId);
  const c = getCoin(s, coinId);
  if (p && c && c.price > 0 && spent > 0) p.units = Math.max(0, p.units - (spent / c.price) * SIM.fee);
}

export function simEnter(s: GameState, choice: SizeBand | "pass") {
  const sim = s.sim;
  if (!sim || sim.phase !== "setup") return;
  if (choice === "pass") {
    sim.passed = true;
    finish(s, sim);
    return;
  }
  const opt = stakeOptions(s).find((o) => o.band === choice);
  if (!opt) return;
  const r = buy(s, sim.coinId, opt.amount);
  if (r.spent < 1) return;
  trimForFees(s, sim.coinId, r.spent);
  sim.entered = true;
  sim.stake += r.spent;
  revealLeg(s, sim);
  if (getPosition(s, sim.coinId) && sim.legsRevealed < sim.legMults.length) sim.phase = "decide";
  else finish(s, sim);
  updateProgress(s);
}

export type SimAction = "sell" | "half" | "hold" | "add";

export function simDecide(s: GameState, action: SimAction) {
  const sim = s.sim;
  if (!sim || sim.phase !== "decide") return;
  const coin = getCoin(s, sim.coinId);
  if (!coin) return;
  if (action === "sell" || action === "half") {
    const r = sell(s, sim.coinId, action === "sell" ? 1 : 0.5);
    sim.realized += r.proceeds;
    sim.exits.push(sim.revealed);
  } else if (action === "add") {
    const amount = Math.floor(Math.min(s.cash, maxBuy(s, coin), netWorth(s) * SIZE_BANDS.small.pct * 2));
    const r = buy(s, sim.coinId, amount);
    if (r.spent > 0) {
      trimForFees(s, sim.coinId, r.spent);
      sim.stake += r.spent;
      sim.adds.push(sim.revealed);
    }
  }
  revealLeg(s, sim);
  if (getPosition(s, sim.coinId) && sim.legsRevealed < sim.legMults.length) sim.phase = "decide";
  else finish(s, sim);
  updateProgress(s);
}

export function simClose(s: GameState) {
  if (s.sim?.phase === "done") s.sim = null;
}
