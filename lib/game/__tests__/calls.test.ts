import { describe, expect, it } from "vitest";
import { canCall, goIn, ignoreCall, pingCall, WEEKS_PER_MONTH } from "../calls";
import { createGame, randomDraft } from "../character";
import { getCoin } from "../coins";
import { reducer } from "../reducer";
import { simEnter, simLive, simTick } from "../tradesim";
import type { GameState } from "../types";

function ready(seed: number): GameState {
  const s = createGame(randomDraft(seed), seed);
  s.current = null;
  s.queue = [];
  s.flags.discovered = 0;
  return s;
}

describe("KOL calls", () => {
  it("a call names a real KOL, adds their post to the feed, and waits for a decision", () => {
    const s = ready(21);
    expect(canCall(s)).toBe(true);
    const feed = s.feed.length;
    expect(pingCall(s)).toBe(true);
    expect(s.offer?.kolId).toBeTruthy();
    expect(s.feed.length).toBeGreaterThanOrEqual(Math.min(40, feed + 1));
    expect(s.feed[0].kind).toBe("kol");
    expect(canCall(s)).toBe(false); // one call at a time
  });

  it("going in turns the call into a live trade that ticks to the close", () => {
    const s = ready(22);
    pingCall(s);
    goIn(s);
    expect(s.offer).toBeNull();
    expect(s.sim?.live).toBe(true);
    simEnter(s, "medium");
    expect(s.sim!.phase).toBe("live");
    const coin = getCoin(s, s.sim!.coinId)!;
    const startPrice = coin.price;
    let guard = 0;
    while (s.sim!.phase === "live" && guard++ < 100) {
      simTick(s);
      // The coin's real price follows the chart tick for tick.
      const rel = s.sim!.points[s.sim!.revealed];
      if (!coin.rugged) expect(coin.price / startPrice).toBeCloseTo(rel, 6);
    }
    expect(s.sim!.phase).toBe("done");
    expect(s.sim!.revealed).toBe(s.sim!.points.length - 1);
    expect(s.sim!.legsRevealed).toBe(3);
  });

  it("you can sell mid-trade while it's live", () => {
    const s = ready(23);
    pingCall(s);
    goIn(s);
    simEnter(s, "medium");
    simTick(s);
    simTick(s);
    simLive(s, "sell");
    expect(s.positions.find((p) => p.coinId === s.sim!.coinId)).toBeUndefined();
    expect(s.sim!.realized).toBeGreaterThan(0);
    expect(s.sim!.exits.length).toBe(1);
  });

  it("ignoring plays the coin out without you and reports how it went", () => {
    const s = ready(24);
    pingCall(s);
    const coinId = s.offer!.sim.coinId;
    const total = s.offer!.sim.legMults.reduce((a, b) => a * b, 1);
    ignoreCall(s);
    expect(s.offer).toBeNull();
    expect(s.callResult?.text).toMatch(/\$/);
    const c = getCoin(s, coinId)!;
    if (total > 0) expect(c.price).toBeCloseTo(total, 6);
    else expect(c.rugged).toBe(true);
  });

  it("four calls use up a month", () => {
    let s: GameState | null = ready(25);
    const month = s.month;
    for (let i = 0; i < WEEKS_PER_MONTH; i++) {
      // Clear anything life throws at us so the next call can land.
      while (s!.current) s = reducer(s, s!.current.stage === "result" ? { type: "CONTINUE" } : { type: "CHOOSE", index: 0 });
      s = reducer(s, { type: "CALL_PING" });
      s = reducer(s, { type: "CALL_IGNORE" });
    }
    expect(s!.month).toBe(month + 1);
    expect(s!.week).toBe(0);
  });
});
