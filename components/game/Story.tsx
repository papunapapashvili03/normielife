"use client";

import { useState } from "react";
import type { GameState, HistoryEntry } from "@/lib/game/types";

export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className="relative">
      {entries.map((h, i) => {
        const newAge = i === 0 || entries[i - 1].age !== h.age;
        return (
          <li key={i} className="grid grid-cols-[2.75rem_1fr] gap-3">
            <div className="relative flex justify-center">
              <span className="absolute inset-y-0 w-px bg-line" aria-hidden />
              {newAge ? (
                <span className="num relative mt-1 grid h-6 min-w-9 place-items-center rounded-full border border-line-strong bg-panel px-1.5 text-[11px] text-text">{h.age}</span>
              ) : (
                <span className="relative mt-2.5 size-1.5 rounded-full bg-line-strong" aria-hidden />
              )}
            </div>
            <p className={`pb-3 pt-1 text-[14px] leading-snug ${h.major ? "text-text" : "text-muted"}`}>
              <span className="mr-2" aria-hidden>
                {h.emoji}
              </span>
              {h.text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function Story({ state }: { state: GameState }) {
  const [majorOnly, setMajorOnly] = useState(true);
  const entries = majorOnly ? state.history.filter((h) => h.major) : state.history;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={majorOnly} onChange={(e) => setMajorOnly(e.target.checked)} className="size-3.5 accent-[var(--mint)]" />
          Big moments only
        </label>
      </div>
      <Timeline entries={entries} />
    </div>
  );
}
