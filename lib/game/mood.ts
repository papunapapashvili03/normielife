// Your character's mood, from what just happened to their money.
import type { GameState, Mood, SignalType } from "./types";

/** A result relative to your net worth (e.g. -0.3 = lost 30%). Small moves don't change your face. */
export function moodFromChange(rel: number): Mood | null {
  if (rel >= 0.25) return "very_happy";
  if (rel >= 0.03) return "happy";
  if (rel <= -0.5) return "rage";
  if (rel <= -0.25) return "very_sad";
  if (rel <= -0.08) return "sad";
  if (rel <= -0.01) return "disappointed";
  return null;
}

/** A trade's profit relative to what you put in. */
export function moodFromTrade(rel: number): Mood {
  if (rel >= 0.5) return "very_happy";
  if (rel >= 0.05) return "happy";
  if (rel <= -0.7) return "rage";
  if (rel <= -0.3) return "very_sad";
  if (rel <= -0.1) return "sad";
  if (rel <= -0.02) return "disappointed";
  return "neutral";
}

/** Reactions to things the market did to your bags. */
export function moodFromSignal(type: SignalType, pct = 0): Mood {
  switch (type) {
    case "rug":
      return "rage";
    case "megapump":
    case "bigpump":
    case "diamond":
      return "very_happy";
    case "pump":
      return "happy";
    case "crash":
      return pct <= -0.7 ? "very_sad" : "sad";
    case "paperhand":
      return "disappointed";
  }
}

/** Passing on (or ignoring) a trade: a moon you missed stings, a rug you dodged feels great. */
export function moodFromMissed(total: number): Mood | null {
  if (total >= 1.5) return "disappointed";
  if (total <= 0.4) return "happy";
  return null;
}

export function setMood(s: GameState, kind: Mood | null) {
  if (kind) s.mood = { kind, month: s.month };
}

/** What the portrait should show. Live trades react tick by tick; other moods fade after a month. */
export function currentMood(s: GameState): Mood {
  const sim = s.sim;
  if (sim && sim.entered && sim.stake > 0 && (sim.phase === "live" || sim.phase === "decide")) {
    const pos = s.positions.find((p) => p.coinId === sim.coinId);
    const coin = s.coins.find((c) => c.id === sim.coinId);
    const open = pos && coin ? pos.units * coin.price : 0;
    return moodFromTrade((sim.realized + open - sim.stake) / sim.stake);
  }
  if (s.mood && s.month - s.mood.month <= 1) return s.mood.kind;
  return "neutral";
}
