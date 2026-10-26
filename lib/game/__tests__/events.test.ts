import { describe, expect, it } from "vitest";
import { createGame, randomDraft } from "../character";
import { allEvents, getEvent, render } from "../events/engine";
import type { Effect, EventDef } from "../types";

function effectsOf(ev: EventDef): Effect[] {
  return [...(ev.setup ?? []), ...ev.choices.flatMap((c) => c.outcomes.flatMap((o) => o.effects ?? []))];
}

describe("event content", () => {
  const events = allEvents();

  it("has at least 100 events", () => {
    expect(events.length).toBeGreaterThanOrEqual(100);
  });

  it("has unique ids", () => {
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every event has at least one choice and every choice an outcome", () => {
    for (const ev of events) {
      expect(ev.choices.length, ev.id).toBeGreaterThan(0);
      for (const c of ev.choices) expect(c.outcomes.length, `${ev.id}: ${c.text}`).toBeGreaterThan(0);
    }
  });

  it("every queued follow-up exists", () => {
    for (const ev of events) {
      for (const e of effectsOf(ev)) {
        if (e.type === "queue") expect(getEvent(e.event), `${ev.id} -> ${e.event}`).toBeDefined();
      }
    }
  });

  it("events that pick a held coin require positions", () => {
    for (const ev of events) {
      if (ev.setup?.some((e) => e.type === "pickHeld")) {
        expect(ev.req?.hasPositions, ev.id).toBe(true);
      }
    }
  });

  it("all template variables resolve", () => {
    const s = createGame(randomDraft(1234), 1234);
    const ctx = {
      coin: s.coins[0].id,
      kol: "moondaddy",
      kol2: "cryptomax",
      verdict: "v",
      amount: 1, value: 1, lost: 1, proceeds: 1, cost: 1, couldBe: 1, gain: 1, sold: 1, pnl: 1, raised: 1,
      pct: 0.5, multiple: 2, moved: 0.5, followersGain: 10, fee: 1,
    };
    for (const ev of events) {
      const texts = [
        ...(Array.isArray(ev.text) ? ev.text : [ev.text]),
        ...ev.choices.flatMap((c) => [c.text, ...c.outcomes.map((o) => o.text)]),
        ...effectsOf(ev).flatMap((e) => (e.type === "history" ? [e.text] : [])),
      ];
      for (const t of texts) {
        const out = render(s, t, ctx);
        expect(out, `${ev.id}: ${t}`).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
