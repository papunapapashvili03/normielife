// Generic event engine. Content lives in ./data — adding events never requires touching this file.
import {
  BASELINE_CASH,
  CATEGORY_RULES,
  DEFAULT_COOLDOWN,
  DEFAULT_EVENT_WEIGHT,
  JOB,
  SIGNAL_PRIORITY,
  SIZE_BANDS,
  STATUS_ORDER,
  categoryWeight,
} from "../config";
import { NARRATIVE_LABEL, getCoin, isGoodFate, marketCap, rollTier, spawnCoin } from "../coins";
import { compact, money, mult, pct } from "../format";
import { addHistory, addLog, ageOf, hasFlag, setFlag } from "../history";
import { quitJob, salary, startJob } from "../job";
import { getKol, kolReadLine, KOLS } from "../kols";
import { moveCoin, trendingCoins } from "../market";
import { buy, getPosition, netWorth, portfolioValue, positionValue, sell, sellAll, settleRugs, wipePositions } from "../portfolio";
import { chance, int, pick, range, weighted } from "../rng";
import { updateProgress } from "../status";
import type {
  Amount,
  Choice,
  Ctx,
  Effect,
  EventDef,
  GameState,
  ModKey,
  Outcome,
  Requirement,
  Signal,
  StatKey,
} from "../types";
import { EVENTS } from "./data";

const BY_ID = new Map<string, EventDef>(EVENTS.map((e) => [e.id, e]));

export function getEvent(id: string): EventDef | undefined {
  return BY_ID.get(id);
}

export function allEvents(): EventDef[] {
  return EVENTS;
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export function meetsReq(s: GameState, r: Requirement | undefined, ctx: Ctx = {}): boolean {
  if (!r) return true;
  const age = ageOf(s);
  if (r.minAge !== undefined && age < r.minAge) return false;
  if (r.maxAge !== undefined && age > r.maxAge) return false;
  if (r.minCash !== undefined && s.cash < r.minCash) return false;
  if (r.maxCash !== undefined && s.cash > r.maxCash) return false;
  if (r.minNetWorth !== undefined || r.maxNetWorth !== undefined) {
    const nw = netWorth(s);
    if (r.minNetWorth !== undefined && nw < r.minNetWorth) return false;
    if (r.maxNetWorth !== undefined && nw > r.maxNetWorth) return false;
  }
  if (r.minPortfolio !== undefined || r.maxPortfolio !== undefined) {
    const pv = portfolioValue(s);
    if (r.minPortfolio !== undefined && pv < r.minPortfolio) return false;
    if (r.maxPortfolio !== undefined && pv > r.maxPortfolio) return false;
  }
  const si = STATUS_ORDER.indexOf(s.status);
  if (r.status && !r.status.includes(s.status)) return false;
  if (r.minStatus && si < STATUS_ORDER.indexOf(r.minStatus)) return false;
  if (r.maxStatus && si > STATUS_ORDER.indexOf(r.maxStatus)) return false;
  if (r.minStat) for (const [k, v] of Object.entries(r.minStat)) if (s.player.stats[k as StatKey] < v) return false;
  if (r.maxStat) for (const [k, v] of Object.entries(r.maxStat)) if (s.player.stats[k as StatKey] > v) return false;
  if (r.minReputation !== undefined && s.reputation < r.minReputation) return false;
  if (r.minFollowers !== undefined && s.followers < r.minFollowers) return false;
  if (r.maxFollowers !== undefined && s.followers > r.maxFollowers) return false;
  if (r.employed !== undefined && s.job.employed !== r.employed) return false;
  if (r.flags && !r.flags.every((f) => hasFlag(s, f))) return false;
  if (r.notFlags && r.notFlags.some((f) => hasFlag(s, f))) return false;
  if (r.seen && !r.seen.every((id) => (s.seen[id] ?? 0) > 0)) return false;
  if (r.notSeen && r.notSeen.some((id) => (s.seen[id] ?? 0) > 0)) return false;
  if (r.minRugs !== undefined && s.run.rugs < r.minRugs) return false;
  if (r.minWins !== undefined && s.run.wins < r.minWins) return false;
  if (r.minTimesBroke !== undefined && s.run.timesBroke < r.minTimesBroke) return false;
  if (r.hasPositions !== undefined && s.positions.length > 0 !== r.hasPositions) return false;
  if (r.recentBigLoss !== undefined && !(s.lastBigLoss && s.month - s.lastBigLoss.month <= r.recentBigLoss)) return false;
  if (r.ctx && !r.ctx.every((k) => ctx[k] !== undefined && ctx[k] !== "")) return false;
  return true;
}

function eligibleRandom(s: GameState, ev: EventDef): boolean {
  if (ev.chainOnly || ev.signal) return false;
  const seen = s.seen[ev.id] ?? 0;
  if (ev.once && seen > 0) return false;
  if (ev.max !== undefined && seen >= ev.max) return false;
  const last = s.lastSeen[ev.id];
  if (last !== undefined && s.month - last < (ev.cooldown ?? DEFAULT_COOLDOWN)) return false;
  if (!meetsReq(s, CATEGORY_RULES[ev.category])) return false;
  return meetsReq(s, ev.req);
}

// ---------------------------------------------------------------------------
// Presenting events
// ---------------------------------------------------------------------------

export function present(s: GameState, id: string, ctx: Ctx = {}): boolean {
  const ev = getEvent(id);
  if (!ev) return false;
  const c: Ctx = { ...ctx };
  for (const e of ev.setup ?? []) if (!applyEffect(s, e, c)) return false;
  if (Array.isArray(ev.text)) c._v = int(s, 0, ev.text.length - 1);
  s.current = { id, ctx: c, stage: "choose" };
  s.seen[id] = (s.seen[id] ?? 0) + 1;
  s.lastSeen[id] = s.month;
  return true;
}

export function pickRandomEvent(s: GameState): boolean {
  const age = ageOf(s);
  let candidates = EVENTS.filter((e) => eligibleRandom(s, e));
  for (let tries = 0; tries < 6 && candidates.length; tries++) {
    const ev = weighted(s, candidates, (e) => (e.weight ?? DEFAULT_EVENT_WEIGHT) * categoryWeight(e.category, s.job.employed, age));
    if (present(s, ev.id)) return true;
    candidates = candidates.filter((e) => e !== ev);
  }
  return false;
}

export function pickSignalEvent(s: GameState, signals: Signal[]): Signal | null {
  for (const type of SIGNAL_PRIORITY) {
    for (const sig of signals.filter((x) => x.type === type)) {
      const ctx: Ctx = { coin: sig.coinId, ...sig.data };
      const pos = getPosition(s, sig.coinId);
      if (pos?.kolId) ctx.kol = pos.kolId;
      const candidates = EVENTS.filter(
        (e) =>
          e.signal === type &&
          (e.max === undefined || (s.seen[e.id] ?? 0) < e.max) &&
          meetsReq(s, e.req, ctx),
      );
      if (!candidates.length) continue;
      const ev = weighted(s, candidates, (e) => e.weight ?? DEFAULT_EVENT_WEIGHT);
      if (present(s, ev.id, ctx)) return sig;
    }
  }
  return null;
}

/** Present the first due queued event (event chains). */
export function presentDueQueue(s: GameState): boolean {
  while (true) {
    const idx = s.queue.findIndex((q) => q.at <= s.month);
    if (idx < 0) return false;
    const [q] = s.queue.splice(idx, 1);
    const ev = getEvent(q.event);
    if (!ev || !meetsReq(s, ev.req, q.ctx)) continue;
    if (present(s, q.event, q.ctx)) return true;
  }
}

export function visibleChoices(s: GameState, ev: EventDef, ctx: Ctx): { choice: Choice; index: number }[] {
  return ev.choices.map((choice, index) => ({ choice, index })).filter(({ choice }) => meetsReq(s, choice.req, ctx));
}

// ---------------------------------------------------------------------------
// Choosing
// ---------------------------------------------------------------------------

function modValue(s: GameState, k: ModKey, ctx: Ctx): number {
  if (k === "kolAccuracy" || k === "kolDump") {
    const kol = getKol(ctx.kol);
    if (!kol) return 0;
    return ((k === "kolAccuracy" ? kol.accuracy : kol.dump) - 0.5) * 2;
  }
  if (k === "fame") return Math.max(-1.5, Math.min(1.5, (Math.log10(s.followers + 1) - 3) / 2));
  return (s.player.stats[k] - 50) / 50;
}

export function outcomeWeight(s: GameState, o: Outcome, ctx: Ctx): number {
  const base = o.weight ?? 1;
  if (!o.mods) return base;
  let m = 1;
  for (const [k, v] of Object.entries(o.mods)) m += (v ?? 0) * modValue(s, k as ModKey, ctx);
  return base * Math.min(3, Math.max(0.1, m));
}

export function choose(s: GameState, choiceIndex: number) {
  const cur = s.current;
  if (!cur || cur.stage !== "choose") return;
  const ev = getEvent(cur.id);
  if (!ev) return;
  const choice = ev.choices[choiceIndex];
  if (!choice || !meetsReq(s, choice.req, cur.ctx)) return;

  const cashBefore = s.cash;
  const nwBefore = netWorth(s);
  const statsBefore = { ...s.player.stats };
  const followersBefore = s.followers;

  const outcome = weighted(s, choice.outcomes, (o) => outcomeWeight(s, o, cur.ctx));
  for (const e of outcome.effects ?? []) applyEffect(s, e, cur.ctx);
  settleRugs(s);
  updateProgress(s);

  const statDeltas: Partial<Record<StatKey, number>> = {};
  for (const k of Object.keys(statsBefore) as StatKey[]) {
    const d = Math.round(s.player.stats[k] - statsBefore[k]);
    if (d !== 0) statDeltas[k] = d;
  }
  const nwDelta = netWorth(s) - nwBefore;
  cur.stage = "result";
  cur.result = {
    text: render(s, outcome.text, cur.ctx),
    tone: outcome.tone ?? (nwDelta > 1 ? "good" : nwDelta < -1 ? "bad" : "neutral"),
    cashDelta: s.cash - cashBefore,
    nwDelta,
    statDeltas,
    followersDelta: s.followers - followersBefore,
  };
  s.run.events++;
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export function resolveAmount(s: GameState, a: Amount, ctx: Ctx): number {
  if (typeof a === "number") return a;
  if (Array.isArray(a)) return Math.round(range(s, a[0], a[1]));
  if ("cashPct" in a) return Math.floor(s.cash * a.cashPct);
  if ("nwPct" in a) return Math.floor(netWorth(s) * a.nwPct);
  if ("salary" in a) return Math.round(salary(s) * a.salary);
  return Math.round(Number(ctx[a.ctx] ?? 0) * (a.mult ?? 1));
}

const VERDICTS = {
  rug: "🔴 Top wallets hold 70% of supply and the dev has rugged before. This is a trap.",
  bleed: "🟠 No volume, no community, no reason to exist. Slow death energy.",
  chop: "🟡 Mixed signals. Could go either way. Mostly sideways vibes.",
  pump: "🟢 Real buyers and decent liquidity. Could run for a bit.",
  moon: "🟢 Organic community, locked liquidity, smart wallets buying. This might be something.",
} as const;

/** Applies one effect. Returns false if a "pick" effect could not bind anything. */
export function applyEffect(s: GameState, e: Effect, ctx: Ctx): boolean {
  switch (e.type) {
    case "cash": {
      let amt = resolveAmount(s, e.amount, ctx);
      if (amt < 0 && -amt > s.cash) amt = -Math.floor(s.cash);
      s.cash += amt;
      ctx[e.as ?? "amount"] = Math.abs(amt);
      return true;
    }
    case "stat": {
      const st = s.player.stats;
      st[e.stat] = Math.max(1, Math.min(100, st[e.stat] + e.delta));
      return true;
    }
    case "followers": {
      let gain = 0;
      if (e.flat !== undefined) gain += Array.isArray(e.flat) ? int(s, e.flat[0], e.flat[1]) : e.flat;
      if (e.pct !== undefined) gain += Math.round(s.followers * (Array.isArray(e.pct) ? range(s, e.pct[0], e.pct[1]) : e.pct));
      s.followers = Math.max(0, s.followers + gain);
      ctx.followersGain = gain;
      return true;
    }
    case "reputation":
      s.reputation = Math.max(0, Math.min(100, s.reputation + e.delta));
      return true;
    case "spawnCoin": {
      let fate = e.fate;
      if (fate === "kol") {
        const kol = getKol(ctx.kol);
        fate = chance(s, kol ? kol.accuracy : 0.3) ? "good" : "bad";
      }
      const tier = e.tier ?? (rollTier(s, STATUS_ORDER.indexOf(s.status)) === "mid" ? "small" : "micro");
      const c = spawnCoin(s, { fate, tier, narrative: e.narrative });
      ctx[e.as ?? "coin"] = c.id;
      return true;
    }
    case "pickKol": {
      const pool = e.archetype ? KOLS.filter((k) => e.archetype!.includes(k.archetype)) : KOLS;
      if (!pool.length) return false;
      ctx[e.as ?? "kol"] = pick(s, pool).id;
      return true;
    }
    case "pickHeld": {
      const held = s.positions.filter((p) => positionValue(s, p) >= 1);
      if (!held.length) return false;
      const p = e.best ? held.reduce((a, b) => (positionValue(s, b) > positionValue(s, a) ? b : a)) : pick(s, held);
      ctx[e.as ?? "coin"] = p.coinId;
      ctx.value = positionValue(s, p);
      return true;
    }
    case "pickMarket": {
      const pool = e.trending ? trendingCoins(s, 3) : s.coins.filter((c) => !c.dead);
      if (!pool.length) return false;
      ctx[e.as ?? "coin"] = pick(s, pool).id;
      return true;
    }
    case "buy": {
      const id = String(ctx[e.coin ?? "coin"] ?? "");
      let dollars = 0;
      if (e.amount !== undefined) dollars = resolveAmount(s, e.amount, ctx);
      else if (e.size) dollars = Math.floor(netWorth(s) * SIZE_BANDS[e.size].pct);
      const kol = typeof ctx.kol === "string" ? ctx.kol : undefined;
      const r = buy(s, id, Math.min(dollars, s.cash), kol);
      ctx[e.as ?? "amount"] = r.spent;
      return true;
    }
    case "sell": {
      const r = sell(s, String(ctx[e.coin ?? "coin"] ?? ""), e.fraction);
      ctx[e.as ?? "proceeds"] = r.proceeds;
      ctx.pnl = r.pnl;
      return true;
    }
    case "sellAll":
      ctx[e.as ?? "proceeds"] = sellAll(s);
      return true;
    case "wipePositions":
      ctx[e.as ?? "proceeds"] = wipePositions(s);
      return true;
    case "coinMove": {
      const c = getCoin(s, ctx[e.coin ?? "coin"]);
      if (!c) return true;
      const m = Array.isArray(e.mult) ? range(s, e.mult[0], e.mult[1]) : e.mult;
      moveCoin(c, m);
      ctx.moved = m - 1;
      return true;
    }
    case "marketMove": {
      for (const c of s.coins) {
        if (c.dead) continue;
        if (e.heldOnly && !getPosition(s, c.id)) continue;
        moveCoin(c, range(s, e.mult[0], e.mult[1]));
      }
      return true;
    }
    case "research": {
      const c = getCoin(s, ctx[e.coin ?? "coin"]);
      if (!c) return true;
      const st = s.player.stats;
      const accuracy = Math.min(0.95, 0.45 + st.knowledge / 200 + st.intelligence / 400);
      const truthGood = isGoodFate(c.fate);
      const readGood = chance(s, accuracy) ? truthGood : !truthGood;
      let key: keyof typeof VERDICTS;
      if (readGood === truthGood) key = c.fate === "mega" || c.fate === "legendary" ? "moon" : (c.fate as keyof typeof VERDICTS);
      else key = readGood ? pick(s, ["pump", "moon"] as const) : pick(s, ["rug", "bleed"] as const);
      ctx.verdict = VERDICTS[key];
      st.knowledge = Math.min(100, st.knowledge + 1);
      return true;
    }
    case "flag":
      if (e.set) setFlag(s, e.set);
      if (e.clear) delete s.flags[e.clear];
      return true;
    case "queue": {
      const m = e.months === undefined ? 0 : Array.isArray(e.months) ? int(s, e.months[0], e.months[1]) : e.months;
      s.queue.push({ event: e.event, at: s.month + m, ctx: { ...ctx, _v: "" } });
      return true;
    }
    case "job":
      if (e.action === "start") startJob(s);
      else quitJob(s);
      return true;
    case "history":
      addHistory(s, e.emoji ?? "📌", render(s, e.text, ctx), e.major ?? false);
      return true;
    case "runStat":
      s.run[e.stat] += e.delta;
      return true;
    case "kolIntel": {
      const id = String(ctx[e.kol ?? "kol"] ?? "");
      if (id) s.kolIntel[id] = Math.min(1, (s.kolIntel[id] ?? 0) + e.delta);
      return true;
    }
  }
}

// ---------------------------------------------------------------------------
// Templating
// ---------------------------------------------------------------------------

const MONEY_KEYS = new Set([
  "amount", "value", "lost", "proceeds", "cost", "couldBe", "gain", "sold", "pnl", "raised", "cash", "nw", "salary", "mc",
]);

export function templateVar(s: GameState, key: string, ctx: Ctx): string | undefined {
  const coin = getCoin(s, ctx.coin);
  const kol = getKol(ctx.kol);
  switch (key) {
    case "name": return s.player.name;
    case "handle": return s.player.handle;
    case "job": return JOB.name;
    case "jobEmoji": return JOB.emoji;
    case "salary": return money(salary(s));
    case "baseline": return money(BASELINE_CASH);
    case "cash": return money(s.cash);
    case "nw": return money(netWorth(s));
    case "age": return String(ageOf(s));
    case "followers": return compact(s.followers);
    case "coin": return coin ? `$${coin.ticker}` : "$???";
    case "coinName": return coin?.name ?? "???";
    case "creator": return coin?.creator ?? "anon";
    case "narrative": return coin ? NARRATIVE_LABEL[coin.narrative] : "";
    case "mc": return coin ? money(marketCap(coin)) : "$???";
    case "kol": return kol?.handle ?? "@anon";
    case "kolName": return kol?.name ?? "anon";
    case "kolRead": return kol ? kolReadLine(s, kol) : "";
  }
  if (key === "value" && ctx.value === undefined && coin) {
    const p = getPosition(s, coin.id);
    return money(p ? positionValue(s, p) : 0);
  }
  const v = ctx[key];
  if (v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (key === "pnl" || key === "gain") return money(v, { sign: true });
  if (MONEY_KEYS.has(key)) return money(v);
  if (key === "pct" || key === "moved") return pct(v);
  if (key === "multiple" || key === "soldMult") return mult(v);
  if (key === "followersGain") return compact(v);
  return String(v);
}

export function render(s: GameState, text: string, ctx: Ctx): string {
  return text
    .replace(/\{(\w+)\}/g, (m, k: string) => templateVar(s, k, ctx) ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function eventText(s: GameState, ev: EventDef, ctx: Ctx): string {
  const raw = Array.isArray(ev.text) ? ev.text[Number(ctx._v) || 0] : ev.text;
  return render(s, raw, ctx);
}

export function logSignals(s: GameState, signals: Signal[], except: Signal | null) {
  for (const sig of signals) {
    if (sig === except) continue;
    const c = getCoin(s, sig.coinId);
    if (!c) continue;
    if (sig.type === "rug") addLog(s, `🚨 $${c.ticker} rugged.`, "bad");
    else if (sig.type === "paperhand") addLog(s, `🧻 $${c.ticker} (which you sold) is now ${mult(Number(sig.data.multiple))} from your exit.`, "bad");
    else if (sig.type === "crash") addLog(s, `📉 $${c.ticker} ${pct(Number(sig.data.pct))}`, "bad");
    else addLog(s, `📈 $${c.ticker} ${pct(Number(sig.data.pct))}`, "good");
  }
}
