// Headless bot that plays full lives through the real reducer. Used by tests + balance checks.
import { randomDraft } from "../character";
import { shownRisk } from "../coins";
import { getEvent, visibleChoices } from "../events/engine";
import { netWorth, positionValue } from "../portfolio";
import { reducer } from "../reducer";
import { stakeOptions } from "../tradesim";
import { rand, type RngHolder } from "../rng";
import type { GameState } from "../types";

export interface Policy {
  sellAt: number;
  sellChance: number;
  buyChance: number;
  buyFrac: [number, number];
  /** Learning player: only new coins, skips coins it reads as rugs, avoids obvious scams. */
  careful?: boolean;
  /** Sell half at sellAt, the rest at this multiple. */
  moonbag?: number;
}
export const RANDOM_POLICY: Policy = { sellAt: 3, sellChance: 0.5, buyChance: 0.4, buyFrac: [0.1, 0.35] };
export const SMART_POLICY: Policy = { sellAt: 2.5, sellChance: 1, buyChance: 0.5, buyFrac: [0.1, 0.25], careful: true, moonbag: 12 };

const SCAMMY = /seed phrase|Connect wallet|link in your DMs|FULL SEND|Drunk ape|Take the money|Execute the plan/i;

export function playLife(seed: number, maxSteps = 6000, policy: Policy = RANDOM_POLICY): GameState {
  const bot: RngHolder = { rng: seed ^ 0xb07 };
  let s = reducer(null, { type: "NEW_GAME", draft: randomDraft(seed), seed })!;
  const trimmed = new Set<string>();
  for (let step = 0; step < maxSteps && !s.ended; step++) {
    if ("mcd_intro" in s.flags) {
      s = reducer(s, { type: "DISMISS_INTRO" })!;
      continue;
    }
    if (s.sim) {
      const sim = s.sim;
      if (sim.phase === "setup") {
        const opts = stakeOptions(s).filter((o) => !policy.careful || o.band === "small" || o.band === "medium");
        const scary = policy.careful && /exit liquidity|Careful/.test(sim.read);
        const choice = scary || !opts.length || rand(bot) < 0.15 ? "pass" : opts[Math.floor(rand(bot) * opts.length)].band;
        s = reducer(s, { type: "SIM_ENTER", choice })!;
      } else if (sim.phase === "decide") {
        const p = s.positions.find((x) => x.coinId === sim.coinId);
        const m = p && sim.stake > 0 ? positionValue(s, p) / sim.stake : 1;
        const actions = ["sell", "half", "hold", "add"] as const;
        const action = policy.careful ? (m >= 1.4 ? "sell" : m <= 0.6 ? "sell" : "hold") : actions[Math.floor(rand(bot) * actions.length)];
        s = reducer(s, { type: "SIM_DECIDE", action })!;
      } else {
        s = reducer(s, { type: "SIM_CLOSE" })!;
      }
      continue;
    }
    if (s.current) {
      if (s.current.stage === "result") {
        s = reducer(s, { type: "CONTINUE" })!;
        continue;
      }
      const ev = getEvent(s.current.id)!;
      let vis = visibleChoices(s, ev, s.current.ctx);
      if (policy.careful) {
        const safe = vis.filter((v) => !SCAMMY.test(v.choice.text));
        if (safe.length) vis = safe;
      }
      const pick = vis[Math.floor(rand(bot) * vis.length)];
      s = reducer(s, { type: "CHOOSE", index: pick.index })!;
      continue;
    }
    // Manage bags.
    for (const p of [...s.positions]) {
      const m = p.cost > 0 ? positionValue(s, p) / p.cost : 1;
      if (policy.moonbag && m >= policy.sellAt && !trimmed.has(p.coinId)) {
        trimmed.add(p.coinId);
        s = reducer(s, { type: "SELL", coinId: p.coinId, fraction: 0.5 })!;
      } else if (policy.moonbag ? m >= policy.moonbag || (trimmed.has(p.coinId) && m < 1) : m >= policy.sellAt && rand(bot) < policy.sellChance) {
        s = reducer(s, { type: "SELL", coinId: p.coinId, fraction: 1 })!;
      } else if (m <= 0.3 && rand(bot) < 0.2) {
        s = reducer(s, { type: "SELL", coinId: p.coinId, fraction: 1 })!;
      }
    }
    if ("discovered" in s.flags && s.cash > 50 && rand(bot) < policy.buyChance) {
      const alive = s.coins.filter(
        (c) => !c.dead && (!policy.careful || (c.ageMonths <= 1 && shownRisk(c, s.player.stats.knowledge) !== "extreme")),
      );
      if (alive.length) {
        const c = alive[Math.floor(rand(bot) * alive.length)];
        s = reducer(s, { type: "BUY", coinId: c.id, amount: s.cash * (policy.buyFrac[0] + rand(bot) * (policy.buyFrac[1] - policy.buyFrac[0])) })!;
      }
    }
    if (!s.job.employed && s.cash < 60 && s.positions.length === 0 && "first_trade" in s.flags) {
      s = reducer(s, { type: "WORK", months: 3 })!;
      continue;
    }
    if (s.job.employed && s.cash > 6000 && !s.current) s = reducer(s, { type: "QUIT_JOB" })!;
    s = reducer(s, { type: "NEXT_MONTH" })!;
  }
  return s;
}

export function summarize(s: GameState) {
  return { peak: s.run.peakNetWorth, final: netWorth(s), broke: s.run.timesBroke, rugs: s.run.rugs, age: s.ended?.age };
}
