import { describe, expect, it } from "vitest";
import { createGame, randomDraft } from "../character";
import { spawnCoin } from "../coins";
import { getEvent, meetsReq, pickRandomEvent } from "../events/engine";
import { advanceOneMonth } from "../life";
import { buy, netWorth, sell, sizeBandFor } from "../portfolio";
import { buildRecap } from "../recap";
import { reducer } from "../reducer";
import type { GameState } from "../types";
import { playLife } from "./sim";

function fresh(seed = 42): GameState {
  const s = createGame(randomDraft(seed), seed);
  s.current = null;
  s.flags.discovered = 0;
  return s;
}

describe("determinism", () => {
  it("same seed + same choices = identical life", () => {
    const a = playLife(777, 800);
    const b = playLife(777, 800);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("different seeds produce different lives", () => {
    const a = playLife(1, 400);
    const b = playLife(2, 400);
    expect(JSON.stringify(a.history)).not.toBe(JSON.stringify(b.history));
  });
});

describe("character", () => {
  it("starts as a normie with the TikTok origin story", () => {
    const s = createGame(randomDraft(5), 5);
    expect(s.status).toBe("normie");
    expect(s.current?.id).toBe("onboard_tiktok");
    expect(s.cash).toBe(5000);
    expect(s.player.stats.knowledge).toBeGreaterThanOrEqual(5);
    expect(s.player.stats.knowledge).toBeLessThanOrEqual(15);
  });
});

describe("trading", () => {
  it("buy, partial sell and net worth add up", () => {
    const s = fresh();
    s.cash = 1000;
    const c = spawnCoin(s, { fate: "chop", tier: "mid" });
    buy(s, c.id, 400);
    expect(s.cash).toBe(600);
    expect(netWorth(s)).toBeCloseTo(1000, 5);
    c.price = 2;
    const r = sell(s, c.id, 0.5);
    expect(r.proceeds).toBeGreaterThan(390);
    expect(r.proceeds).toBeLessThanOrEqual(400);
    expect(s.positions[0].cost).toBeCloseTo(200, 5);
  });

  it("classifies position size bands", () => {
    expect(sizeBandFor(30, 1000)).toBe("small");
    expect(sizeBandFor(150, 1000)).toBe("medium");
    expect(sizeBandFor(400, 1000)).toBe("large");
    expect(sizeBandFor(950, 1000)).toBe("fullsend");
  });

  it("a rug wipes the position and is recorded", () => {
    const s = fresh();
    s.cash = 500;
    const c = spawnCoin(s, { fate: "rug" });
    c.path = [1, 0];
    buy(s, c.id, 300);
    advanceOneMonth(s);
    expect(s.positions.length).toBe(0);
    expect(s.run.rugs).toBe(1);
  });
});

describe("requirements", () => {
  it("a $50 player never qualifies for whale events", () => {
    const s = fresh();
    s.cash = 50;
    const whaleOnly = getEvent("crypto_early_alloc")!;
    expect(meetsReq(s, whaleOnly.req)).toBe(false);
    for (let i = 0; i < 200; i++) {
      s.current = null;
      if (pickRandomEvent(s)) expect(s.current!.id).not.toBe("crypto_early_alloc");
    }
  });

  it("McDonald's events only fire while employed", () => {
    const s = fresh();
    for (let i = 0; i < 200; i++) {
      s.current = null;
      if (pickRandomEvent(s)) expect(getEvent(s.current!.id)!.category).not.toBe("mcd");
    }
  });
});

describe("broke -> McDonald's -> rebuild", () => {
  it("going broke offers the job and salary rebuilds cash", () => {
    let s: GameState | null = fresh();
    s!.flags.first_trade = 0;
    s!.cash = 0;
    s = reducer(s, { type: "NEXT_MONTH" });
    // Resolve whatever pops up until the broke screen appears.
    for (let i = 0; i < 10 && s!.current?.id !== "sys_broke"; i++) {
      if (s!.current?.stage === "choose") s = reducer(s, { type: "CHOOSE", index: s!.current.id === "sys_broke" ? 0 : 0 });
      if (s!.current?.stage === "result") s = reducer(s, { type: "CONTINUE" });
    }
    expect(s!.run.timesBroke).toBe(1);
    expect(s!.current?.id).toBe("sys_broke");
    s = reducer(s, { type: "CHOOSE", index: 0 });
    expect(s!.job.employed).toBe(true);
    s = reducer(s, { type: "CONTINUE" });
    for (let i = 0; i < 30; i++) {
      if (s!.current) {
        s = reducer(s, s!.current.stage === "result" ? { type: "CONTINUE" } : { type: "CHOOSE", index: 0 });
      } else s = reducer(s, { type: "WORK", months: 3 });
    }
    expect(s!.run.mcdMonths).toBeGreaterThan(3);
  });
});

describe("full life", () => {
  it("ends in death with a recap", () => {
    const s = playLife(31337);
    expect(s.ended).not.toBeNull();
    const r = buildRecap(s);
    expect(r.lines.length).toBeGreaterThan(5);
    expect(s.history.filter((h) => h.major).length).toBeGreaterThan(3);
  });
});
