import { describe, expect, it } from "vitest";
import { pingCall, goIn } from "../calls";
import { createGame, randomDraft } from "../character";
import { getCoin } from "../coins";
import { moveCoin } from "../market";
import { currentMood, moodFromChange, moodFromTrade, setMood } from "../mood";
import { simEnter } from "../tradesim";
import type { GameState } from "../types";

function ready(seed: number): GameState {
  const s = createGame(randomDraft(seed), seed);
  s.current = null;
  s.queue = [];
  s.flags.discovered = 0;
  return s;
}

describe("mood", () => {
  it("scales with how much of your net worth moved", () => {
    expect(moodFromChange(0.5)).toBe("very_happy");
    expect(moodFromChange(0.05)).toBe("happy");
    expect(moodFromChange(0.001)).toBeNull();
    expect(moodFromChange(-0.02)).toBe("disappointed");
    expect(moodFromChange(-0.1)).toBe("sad");
    expect(moodFromChange(-0.3)).toBe("very_sad");
    expect(moodFromChange(-0.6)).toBe("rage");
    expect(moodFromTrade(1)).toBe("very_happy");
    expect(moodFromTrade(-0.9)).toBe("rage");
  });

  it("fades back to neutral after a month", () => {
    const s = ready(31);
    setMood(s, "rage");
    expect(currentMood(s)).toBe("rage");
    s.month += 2;
    expect(currentMood(s)).toBe("neutral");
  });

  it("reacts live to an open trade", () => {
    const s = ready(32);
    pingCall(s);
    goIn(s);
    simEnter(s, "medium");
    const coin = getCoin(s, s.sim!.coinId)!;
    moveCoin(coin, 2.5);
    expect(currentMood(s)).toBe("very_happy");
    moveCoin(coin, 0.1);
    expect(["rage", "very_sad"]).toContain(currentMood(s));
  });
});
