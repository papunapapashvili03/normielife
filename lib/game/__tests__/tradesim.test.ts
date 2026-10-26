import { describe, expect, it } from "vitest";
import { createGame, randomDraft } from "../character";
import { netWorth } from "../portfolio";
import { simClose, simDecide, simEnter, stakeOptions, startTradeSim, type SimAction } from "../tradesim";
import type { GameState } from "../types";

function ready(seed: number): GameState {
  const s = createGame(randomDraft(seed), seed);
  s.current = null;
  s.queue = [];
  s.flags.discovered = 0;
  return s;
}

describe("trade simulation", () => {
  it("plays setup -> decisions -> recap with a chart that grows each step", () => {
    const s = ready(11);
    expect(startTradeSim(s)).toBe(true);
    const sim = s.sim!;
    expect(sim.phase).toBe("setup");
    expect(sim.revealed).toBe(sim.preLen - 1);
    expect(sim.points.length).toBe(sim.legEnds[2] + 1);
    expect(stakeOptions(s).length).toBeGreaterThan(0);

    simEnter(s, "medium");
    expect(s.sim!.entered).toBe(true);
    expect(s.sim!.stake).toBeGreaterThan(0);
    expect(s.sim!.revealed).toBeGreaterThan(sim.preLen - 1);
    while (s.sim!.phase === "decide") simDecide(s, "hold");
    expect(s.sim!.phase).toBe("done");
    expect(s.sim!.revealed).toBe(s.sim!.points.length - 1);
    expect(s.sim!.notes.at(-1)!.label).toBe("Recap");
    simClose(s);
    expect(s.sim).toBeNull();
  });

  it("passing still reveals the whole day", () => {
    const s = ready(12);
    startTradeSim(s);
    const cash = s.cash;
    simEnter(s, "pass");
    expect(s.sim!.phase).toBe("done");
    expect(s.cash).toBe(cash);
  });

  // Sims cost no time, so simple strategies must not be a money printer.
  it("simple strategies stay close to break-even", () => {
    const strategies: Record<string, (step: number) => SimAction> = {
      hold: () => "hold",
      firstExit: () => "sell",
      secondExit: (step) => (step === 0 ? "hold" : "sell"),
    };
    for (const [name, pick] of Object.entries(strategies)) {
      let ratio = 0;
      const N = 600;
      for (let i = 0; i < N; i++) {
        const s = ready(5000 + i);
        const before = netWorth(s);
        startTradeSim(s);
        const stake = stakeOptions(s).find((o) => o.band === "medium")!.amount;
        simEnter(s, "medium");
        let step = 0;
        while (s.sim!.phase === "decide") simDecide(s, pick(step++));
        ratio += (netWorth(s) - before + stake) / stake;
      }
      const ev = ratio / N;
      console.log(name, ev.toFixed(3));
      expect(ev, name).toBeGreaterThan(0.75);
      expect(ev, name).toBeLessThan(1.15);
    }
  });
});
