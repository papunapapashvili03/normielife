// Monthly market simulation + signals for the player's bags.
import { MARKET, SIGNALS, STATUS_ORDER } from "./config";
import { getCoin, spawnCoin } from "./coins";
import { int, range } from "./rng";
import { getPosition, positionValue } from "./portfolio";
import type { Coin, GameState, Signal } from "./types";

export function advanceCoin(s: GameState, c: Coin) {
  c.prevPrice = c.price;
  c.ageMonths++;
  if (c.rugged) {
    c.deadFor++;
    return;
  }
  c.step++;
  if (c.step < c.path.length) {
    c.price = c.path[c.step];
  } else {
    // Off the end of the script: slow fade into irrelevance.
    c.price *= range(s, 0.55, 0.95);
  }
  if (c.price <= 0) {
    c.price = 0;
    c.rugged = true;
    c.dead = true;
  } else if (c.price < 0.02 || (c.step >= c.path.length && c.price < c.path[c.path.length - 1] * 0.2)) {
    c.dead = true;
  }
  if (c.dead) c.deadFor++;
  c.spark.push(c.price);
  if (c.spark.length > 12) c.spark.shift();
}

/** Multiply a coin's current price and its remaining script (used by events). */
export function moveCoin(c: Coin, m: number) {
  if (c.rugged) return;
  if (m <= 0) {
    c.prevPrice = c.price;
    c.price = 0;
    c.rugged = true;
    c.dead = true;
    for (let i = c.step + 1; i < c.path.length; i++) c.path[i] = 0;
    return;
  }
  c.price *= m;
  for (let i = c.step + 1; i < c.path.length; i++) c.path[i] *= m;
  c.spark[c.spark.length - 1] = c.price;
}

export function tickMarket(s: GameState): Signal[] {
  for (const c of s.coins) advanceCoin(s, c);

  // Prune dead coins nobody holds.
  s.coins = s.coins.filter((c) => !(c.dead && c.deadFor > MARKET.pruneAfter && !getPosition(s, c.id)));

  // Spawn fresh degeneracy.
  const statusIdx = STATUS_ORDER.indexOf(s.status);
  const alive = s.coins.filter((c) => !c.dead).length;
  let n = int(s, MARKET.spawnPerMonth[0], MARKET.spawnPerMonth[1]);
  if (alive < MARKET.minCoins) n += MARKET.minCoins - alive;
  if (alive + n > MARKET.maxCoins) n = Math.max(1, MARKET.maxCoins - alive);
  for (let i = 0; i < n; i++) spawnCoin(s, {}, statusIdx);

  return computeSignals(s);
}

export function computeSignals(s: GameState): Signal[] {
  const signals: Signal[] = [];
  for (const p of s.positions) {
    const c = getCoin(s, p.coinId);
    if (!c) continue;
    const value = positionValue(s, p);
    if (c.rugged) {
      signals.push({ type: "rug", coinId: c.id, data: { lost: p.cost } });
      continue;
    }
    if (value < SIGNALS.minPositionValue && p.cost < SIGNALS.minPositionValue) continue;
    const ch = c.prevPrice > 0 ? c.price / c.prevPrice - 1 : 0;
    const m = p.cost > 0 ? value / p.cost : 1;
    p.minMult = Math.min(p.minMult, m);
    const data = { pct: ch, value, cost: p.cost, multiple: m, gain: value - p.cost };
    if (!p.diamondDone && p.minMult <= SIGNALS.diamondDip && m >= SIGNALS.diamondRecover) {
      p.diamondDone = true;
      signals.push({ type: "diamond", coinId: c.id, data });
    } else if (ch >= SIGNALS.megapump) signals.push({ type: "megapump", coinId: c.id, data });
    else if (ch >= SIGNALS.bigpump) signals.push({ type: "bigpump", coinId: c.id, data });
    else if (ch >= SIGNALS.pump) signals.push({ type: "pump", coinId: c.id, data });
    else if (ch <= SIGNALS.crash) signals.push({ type: "crash", coinId: c.id, data });
  }
  // Paper hands: coins you sold that ripped afterwards.
  const keep = [];
  for (const w of s.soldWatch) {
    const c = getCoin(s, w.coinId);
    if (!c || c.dead || s.month - w.month > SIGNALS.paperhandWatchMonths) continue;
    const m = c.price / w.soldPrice;
    if (m >= SIGNALS.paperhandMult && !getPosition(s, c.id)) {
      signals.push({
        type: "paperhand",
        coinId: c.id,
        data: { sold: w.soldValue, couldBe: w.soldValue * m, pct: m - 1, multiple: m },
      });
      continue;
    }
    keep.push(w);
  }
  s.soldWatch = keep;
  return signals;
}

export function trendingCoins(s: GameState, n = 5): Coin[] {
  return s.coins
    .filter((c) => !c.dead && c.ageMonths > 0)
    .sort((a, b) => b.price / b.prevPrice - a.price / a.prevPrice)
    .slice(0, n);
}
