import type { GameState, Tone } from "./types";

export function ageOf(s: GameState): number {
  return s.player.startAge + Math.floor(s.month / 12);
}

export function addHistory(s: GameState, emoji: string, text: string, major = false) {
  s.history.push({ month: s.month, age: ageOf(s), emoji, text, major });
}

export function addLog(s: GameState, text: string, tone: Tone = "neutral") {
  s.log.push({ month: s.month, age: ageOf(s), text, tone });
  if (s.log.length > 60) s.log.splice(0, s.log.length - 60);
}

export function hasFlag(s: GameState, f: string): boolean {
  return f in s.flags;
}

export function setFlag(s: GameState, f: string) {
  s.flags[f] = s.month;
}
