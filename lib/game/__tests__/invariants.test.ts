// Fuzz the real reducer with random player actions and check that the books always balance.
import { describe, expect, it } from "vitest";
import { randomDraft } from "../character";
import { getCoin } from "../coins";
import { getEvent, visibleChoices } from "../events/engine";
import { netWorth, positionValue } from "../portfolio";
import { reducer, type Action } from "../reducer";
import { rand, type RngHolder } from "../rng";
import { stakeOptions } from "../tradesim";
import type { GameState } from "../types";

function pick<T>(r: RngHolder, xs: T[]): T {
  return xs[Math.floor(rand(r) * xs.length)];
}

function randomAction(s: GameState, r: RngHolder): Action {
  if ("mcd_intro" in s.flags && rand(r) < 0.7) return { type: "DISMISS_INTRO" };
  if (s.current) {
    if (s.current.stage === "result") return { type: "CONTINUE" };
    const ev = getEvent(s.current.id)!;
    return { type: "CHOOSE", index: pick(r, visibleChoices(s, ev, s.current.ctx)).index };
  }
  if (s.sim) {
    const sim = s.sim;
    if (sim.phase === "setup") {
      const o = stakeOptions(s);
      return { type: "SIM_ENTER", choice: o.length && rand(r) < 0.8 ? pick(r, o).band : "pass" };
    }
    if (sim.phase === "decide") return { type: "SIM_DECIDE", action: pick(r, ["sell", "half", "hold", "add"] as const) };
    if (sim.phase === "live") {
      const x = rand(r);
      if (x < 0.6) return { type: "SIM_TICK" };
      if (x < 0.9) return { type: "SIM_LIVE", action: pick(r, ["sell", "half", "add"] as const) };
      // Things a player can still tap while a trade is live:
      if (x < 0.95 && s.positions.length) return { type: "SELL", coinId: pick(r, s.positions).coinId, fraction: pick(r, [0.25, 0.5, 1]) };
      return { type: "SIM_SKIP" };
    }
    return { type: "SIM_CLOSE" };
  }
  if (s.offer) {
    const x = rand(r);
    if (x < 0.45) return { type: "CALL_GO_IN" };
    if (x < 0.75) return { type: "CALL_IGNORE" };
    // While the notification is up, the rest of the phone still works.
    if (x < 0.85) return { type: "BUY", coinId: s.offer.sim.coinId, amount: Math.floor(s.cash * rand(r)) };
    return pick(r, [{ type: "POST" }, { type: "HUNT_TRADE" }, { type: "WORK", months: 1 }, { type: "WORK_TO_BASELINE" }, { type: "NEXT_MONTH" }] as Action[]);
  }
  const x = rand(r);
  const alive = s.coins.filter((c) => !c.dead);
  if (x < 0.25) return { type: "CALL_PING" };
  if (x < 0.4 && alive.length) return { type: "BUY", coinId: pick(r, alive).id, amount: Math.floor(s.cash * rand(r) * 0.6) };
  if (x < 0.5 && s.positions.length) return { type: "SELL", coinId: pick(r, s.positions).coinId, fraction: pick(r, [0.25, 0.5, 1]) };
  if (x < 0.56) return { type: "HUNT_TRADE" };
  if (x < 0.6) return { type: "WORK", months: pick(r, [1, 3]) };
  if (x < 0.62) return { type: "WORK_TO_BASELINE" };
  if (x < 0.64 && s.job.employed) return { type: "QUIT_JOB" };
  if (x < 0.66) return { type: "POST" };
  return { type: "NEXT_MONTH" };
}

/** Every rule the money must obey. Returns the first violation, if any. */
function violations(prev: GameState, s: GameState, a: Action): string[] {
  const out: string[] = [];
  const fin = (n: number) => Number.isFinite(n);
  if (!fin(s.cash) || s.cash < 0) out.push(`cash invalid: ${s.cash}`);
  if (!Number.isInteger(s.cash)) out.push(`cash not whole dollars: ${s.cash}`);
  const ids = new Set<string>();
  for (const p of s.positions) {
    const c = getCoin(s, p.coinId);
    if (!c) out.push(`position in missing coin ${p.coinId}`);
    if (ids.has(p.coinId)) out.push(`duplicate position ${p.coinId}`);
    ids.add(p.coinId);
    if (!fin(p.units) || p.units < -1e-9) out.push(`bad units ${p.units}`);
    if (!fin(p.cost) || p.cost < -1e-6) out.push(`bad cost ${p.cost}`);
    if (c?.rugged) out.push(`position left in rugged coin $${c.ticker} after ${a.type}`);
  }
  for (const c of s.coins) if (!fin(c.price) || c.price < 0) out.push(`coin ${c.ticker} price ${c.price}`);
  if (!fin(netWorth(s))) out.push("net worth not finite");
  if (s.run.peakNetWorth + 1e-6 < netWorth(s) && !s.current && !s.sim) out.push(`peak ${s.run.peakNetWorth} < net worth ${netWorth(s)} after ${a.type}`);
  if ((s.week ?? 0) < 0 || (s.week ?? 0) >= 4) out.push(`week out of range ${s.week}`);
  if (s.offer && !getCoin(s, s.offer.sim.coinId)) out.push("offer coin missing");
  // A call notification never overlaps anything else on the board.
  if (s.offer && (s.current || s.sim)) out.push(`call pending while ${s.current ? "event " + s.current.id : "trade"} is open after ${a.type}`);
  if (s.offer && s.positions.some((p) => p.coinId === s.offer!.sim.coinId)) out.push("holding the coin of a call you haven't answered");
  // Weeks only reset when a month actually passes.
  if ((prev.week ?? 0) > 0 && (s.week ?? 0) < (prev.week ?? 0) && s.month === prev.month) out.push(`week reset ${prev.week}→${s.week} without a new month after ${a.type}`);

  // Money conservation for direct trades.
  if (a.type === "BUY" && prev.cash !== s.cash) {
    const spent = prev.cash - s.cash;
    const before = prev.positions.find((p) => p.coinId === a.coinId)?.cost ?? 0;
    const after = s.positions.find((p) => p.coinId === a.coinId)?.cost ?? 0;
    if (Math.abs(after - before - spent) > 1e-6) out.push(`BUY: cash -${spent} but cost +${after - before}`);
  }
  if (a.type === "SELL" && s !== prev) {
    const p0 = prev.positions.find((p) => p.coinId === a.coinId);
    const c0 = p0 && getCoin(prev, p0.coinId);
    if (p0 && c0) {
      const value = p0.units * Math.min(1, a.fraction) * c0.price;
      const got = s.cash - prev.cash;
      if (got > value + 1) out.push(`SELL paid ${got} for ${value} worth`);
    }
  }

  // A trade on the board must track what you actually put into it.
  const sim = s.sim;
  if (sim && sim.entered) {
    const pos = s.positions.find((p) => p.coinId === sim.coinId);
    const coin = getCoin(s, sim.coinId);
    if (sim.stake <= 0) out.push("entered trade with no stake");
    if (sim.revealed < sim.preLen - 1 || sim.revealed > sim.points.length - 1) out.push(`revealed ${sim.revealed} out of range`);
    // (Adds buy at later prices, so this bound only holds for trades without adds.)
    if (pos && coin && !coin.rugged && sim.phase !== "setup" && sim.adds.length === 0) {
      // Position value can't exceed every dollar staked times the best price seen so far (+ slack).
      const best = Math.max(...sim.points.slice(0, sim.revealed + 1));
      const cap = sim.stake * best + 1;
      if (positionValue(s, pos) > cap) out.push(`trade bag ${positionValue(s, pos).toFixed(0)} > stake ${sim.stake} × best ${best.toFixed(2)}`);
    }
  }
  return out;
}

describe("finance invariants (fuzz)", () => {
  it("random play never breaks the books", () => {
    const problems = new Map<string, string>();
    for (let seed = 1; seed <= 120; seed++) {
      const r: RngHolder = { rng: seed * 7919 };
      let s = reducer(null, { type: "NEW_GAME", draft: randomDraft(seed), seed })!;
      s.flags.discovered = 0;
      for (let step = 0; step < 500 && !s.ended; step++) {
        const a = randomAction(s, r);
        const next = reducer(s, a)!;
        for (const v of violations(s, next, a)) {
          const key = v.replace(/[\d.$-]+/g, "#");
          if (!problems.has(key)) problems.set(key, `seed ${seed} step ${step}: ${v}`);
        }
        s = next;
      }
    }
    console.log([...problems.values()].join("\n") || "no violations");
    expect([...problems.values()]).toEqual([]);
  }, 300_000);
});
