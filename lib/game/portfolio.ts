// Money, positions, buying and selling.
import { MARKET, SIZE_BANDS, FULL_SEND_STAT_PCT } from "./config";
import { getCoin, liquidity } from "./coins";
import { money, mult } from "./format";
import { addHistory, addLog, hasFlag, setFlag } from "./history";
import type { Coin, GameState, Position, SizeBand } from "./types";

export function positionValue(s: GameState, p: Position): number {
  const c = getCoin(s, p.coinId);
  return c ? p.units * c.price : 0;
}

export function portfolioValue(s: GameState): number {
  let v = 0;
  for (const p of s.positions) v += positionValue(s, p);
  return v;
}

export function netWorth(s: GameState): number {
  return s.cash + portfolioValue(s);
}

export function getPosition(s: GameState, coinId: string | number | undefined): Position | undefined {
  return s.positions.find((p) => p.coinId === coinId);
}

export function sizeBandFor(amount: number, nw: number): SizeBand {
  const f = nw > 0 ? amount / nw : 1;
  if (f <= SIZE_BANDS.small.max) return "small";
  if (f <= SIZE_BANDS.medium.max) return "medium";
  if (f <= SIZE_BANDS.large.max) return "large";
  return "fullsend";
}

export function maxBuy(s: GameState, c: Coin): number {
  if (c.dead || c.rugged) return 0;
  return Math.max(0, Math.min(s.cash, liquidity(c) * MARKET.maxBuyLiq));
}

export interface BuyResult {
  spent: number;
  fullSend: boolean;
  revenge: boolean;
}

export function buy(s: GameState, coinId: string, dollars: number, kolId?: string): BuyResult {
  const c = getCoin(s, coinId);
  const res: BuyResult = { spent: 0, fullSend: false, revenge: false };
  if (!c) return res;
  const amount = Math.floor(Math.min(dollars, maxBuy(s, c)));
  if (amount < 1) return res;
  const nwBefore = netWorth(s);
  s.cash -= amount;
  const units = amount / c.price;
  let p = getPosition(s, coinId);
  if (!p) {
    p = { coinId, units: 0, cost: 0, openedMonth: s.month, minMult: 1, diamondDone: false, countedTier: 0 };
    s.positions.push(p);
  }
  p.units += units;
  p.cost += amount;
  if (kolId) p.kolId = kolId;
  res.spent = amount;
  s.run.trades++;

  const k = s.player.stats.knowledge;
  s.player.stats.knowledge = Math.min(100, k + (k < 30 ? 0.8 : k < 60 ? 0.35 : 0.1));

  if (!hasFlag(s, "first_trade")) {
    setFlag(s, "first_trade");
    const tiktok = hasFlag(s, "tiktok_origin");
    addHistory(s, "🐸", `Bought first memecoin: ${money(amount)} of $${c.ticker}${tiktok ? " (thanks, TikTok)" : ""}.`, true);
  }
  const frac = nwBefore > 0 ? amount / nwBefore : 0;
  if (frac >= FULL_SEND_STAT_PCT && amount >= 50) {
    res.fullSend = true;
    s.run.fullSends++;
    addHistory(s, "🗿", `FULL SEND: put ${Math.round(frac * 100)}% of net worth (${money(amount)}) into $${c.ticker}.`, amount >= 1000);
  }
  if (s.lastBigLoss && s.month - s.lastBigLoss.month <= 1 && frac >= 0.3) {
    res.revenge = true;
    s.run.revengeTrades++;
    setFlag(s, "revenge_traded");
  }
  addLog(s, `Bought ${money(amount)} of $${c.ticker}`, "neutral");
  return res;
}

export interface SellResult {
  proceeds: number;
  pnl: number;
  multiple: number;
}

export function sell(s: GameState, coinId: string, fraction: number): SellResult {
  const p = getPosition(s, coinId);
  const c = getCoin(s, coinId);
  const res: SellResult = { proceeds: 0, pnl: 0, multiple: 0 };
  if (!p || !c || c.rugged) return res;
  const f = Math.min(1, Math.max(0, fraction));
  const units = p.units * f;
  const value = units * c.price;
  const liq = Math.max(1, liquidity(c));
  const impact = Math.min(MARKET.sellImpactCap, value / (liq * MARKET.sellImpactK));
  const proceeds = Math.floor(value * (1 - impact));
  const costPart = p.cost * f;
  p.units -= units;
  p.cost -= costPart;
  s.cash += proceeds;
  const pnl = proceeds - costPart;
  const multiple = costPart > 0 ? proceeds / costPart : 0;
  res.proceeds = proceeds;
  res.pnl = pnl;
  res.multiple = multiple;

  if (pnl >= 0) s.run.wins++;
  else s.run.losses++;
  if (costPart >= 10 && multiple > s.run.biggestWin) {
    s.run.biggestWin = multiple;
    s.run.biggestWinCoin = c.ticker;
  }
  if (pnl > s.run.biggestWinProfit) s.run.biggestWinProfit = pnl;
  if (costPart >= 10) recordMultipleTier(s, p, c, multiple, pnl);
  if (pnl < 0) recordLoss(s, -pnl, c.ticker);

  if (proceeds >= 20) {
    s.soldWatch.push({ coinId, soldPrice: c.price, soldValue: proceeds, month: s.month });
  }
  if (p.units <= 1e-9 || f >= 0.999) s.positions = s.positions.filter((x) => x !== p);
  addLog(s, `Sold ${money(proceeds)} of $${c.ticker} (${money(pnl, { sign: true })})`, pnl >= 0 ? "good" : "bad");
  return res;
}

function recordMultipleTier(s: GameState, p: Position, c: Coin, m: number, pnl: number) {
  const tier = m >= 100 ? 100 : m >= 50 ? 50 : m >= 10 ? 10 : 0;
  if (tier <= p.countedTier) return;
  if (tier >= 10 && p.countedTier < 10) s.run.tens++;
  if (tier >= 50 && p.countedTier < 50) s.run.fifties++;
  if (tier >= 100 && p.countedTier < 100) s.run.hundreds++;
  p.countedTier = tier;
  const first = tier === 10 && !hasFlag(s, "first_10x");
  if (first) setFlag(s, "first_10x");
  addHistory(s, tier >= 100 ? "🚨" : "🚀", `${first ? "First 10x! " : ""}Sold $${c.ticker} for ${mult(m)} (${money(pnl, { sign: true })}).`, true);
}

export function recordLoss(s: GameState, loss: number, ticker: string) {
  if (loss > s.run.biggestLoss) {
    s.run.biggestLoss = loss;
    s.run.biggestLossCoin = ticker;
  }
  const nw = netWorth(s) + loss;
  if (loss >= 500 && loss >= nw * 0.25) {
    s.lastBigLoss = { amount: loss, month: s.month };
    if (loss >= 5_000) addHistory(s, "💀", `Lost ${money(loss)} on $${ticker}.`, true);
  }
}

export function sellAll(s: GameState): number {
  let total = 0;
  for (const p of [...s.positions]) total += sell(s, p.coinId, 1).proceeds;
  return total;
}

/** Every position vanishes (drained wallet). Returns the value lost. */
export function wipePositions(s: GameState): number {
  let total = 0;
  for (const p of s.positions) {
    const c = getCoin(s, p.coinId);
    total += positionValue(s, p);
    s.run.losses++;
    recordLoss(s, p.cost, c?.ticker ?? "???");
  }
  s.positions = [];
  return Math.floor(total);
}

/** Remove positions in rugged coins. Returns rug info for each. */
export function settleRugs(s: GameState): { coinId: string; ticker: string; lost: number }[] {
  const out: { coinId: string; ticker: string; lost: number }[] = [];
  for (const p of [...s.positions]) {
    const c = getCoin(s, p.coinId);
    if (!c) continue;
    if (c.rugged) {
      out.push({ coinId: c.id, ticker: c.ticker, lost: p.cost });
      s.run.rugs++;
      s.run.losses++;
      recordLoss(s, p.cost, c.ticker);
      s.player.stats.knowledge = Math.min(100, s.player.stats.knowledge + 2);
      if (!hasFlag(s, "first_rug")) {
        setFlag(s, "first_rug");
        addHistory(s, "🚨", `Got rugged for the first time on $${c.ticker} (-${money(p.cost)}).`, true);
      } else {
        addHistory(s, "🚨", `Rugged on $${c.ticker} (-${money(p.cost)}).`, p.cost >= 10_000);
      }
      addLog(s, `$${c.ticker} rugged. -${money(p.cost)}`, "bad");
      s.positions = s.positions.filter((x) => x !== p);
    } else if (c.dead && positionValue(s, p) < 0.5) {
      recordLoss(s, p.cost, c.ticker);
      s.run.losses++;
      s.positions = s.positions.filter((x) => x !== p);
    }
  }
  return out;
}

/** Cover a cash shortfall by selling positions (biggest first). */
export function forceSell(s: GameState, needed: number): number {
  let raised = 0;
  const sorted = [...s.positions].sort((a, b) => positionValue(s, b) - positionValue(s, a));
  for (const p of sorted) {
    if (raised >= needed) break;
    const v = positionValue(s, p);
    if (v <= 0) continue;
    const frac = Math.min(1, ((needed - raised) * 1.3) / v);
    raised += sell(s, p.coinId, frac).proceeds;
  }
  return raised;
}
