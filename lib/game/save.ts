// Browser save (localStorage). Every access is guarded: storage can be blocked or missing.
import { SAVE_VERSION } from "./config";
import type { GameState } from "./types";

const KEY = "degen-life:save";

export function readSaveRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    if (s?.version !== SAVE_VERSION || !s.player) return null;
    return s;
  } catch {
    return null;
  }
}

export function writeSave(s: GameState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked — the run continues in memory.
  }
  notify();
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

export function subscribeSave(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
