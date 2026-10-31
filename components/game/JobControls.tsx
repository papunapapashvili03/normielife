"use client";

import type { Dispatch } from "react";
import { BASELINE_CASH, JOB } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { hasFlag } from "@/lib/game/history";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";

/** McDonald's shift controls: status line, rebuild-to-baseline progress, work and quit buttons. */
export function JobControls({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const busy = !!state.current || !!state.sim;
  const rebuilding = hasFlag(state, "rebuilding");
  return (
    <>
    <p className="mt-1 text-xs text-muted">
      {state.job.employed
        ? `On shift · ${state.job.stintMonths} month${state.job.stintMonths === 1 ? "" : "s"} this stint`
        : "The only job in the game. Fast-forward through shifts."}
    </p>
    {rebuilding && (
      <div className="mt-3 rounded-xl bg-mcd-yellow/15 p-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold">Back to baseline</span>
          <span className="num text-muted">
            {money(state.cash)} / {money(BASELINE_CASH)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full bg-mcd-yellow" style={{ width: `${Math.max(2, Math.min(1, state.cash / BASELINE_CASH) * 100)}%` }} />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => dispatch({ type: "WORK_TO_BASELINE" })}
          className="mt-2.5 w-full rounded-full bg-mcd-yellow py-2 text-xs font-extrabold text-[#2b1d00] hover:brightness-95 disabled:opacity-40"
        >
          Work until {money(BASELINE_CASH)}
        </button>
      </div>
    )}
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      {[1, 3, 6, 12].map((m) => (
        <button
          key={m}
          type="button"
          disabled={busy}
          onClick={() => dispatch({ type: "WORK", months: m })}
          className="num rounded-full border border-line-strong py-1.5 text-xs font-medium hover:border-amber hover:text-amber disabled:opacity-40"
        >
          {m}mo
        </button>
      ))}
    </div>
    {state.job.employed && (
      <button type="button" disabled={busy} onClick={() => dispatch({ type: "QUIT_JOB" })} className="mt-2 w-full rounded-full py-1.5 text-xs font-semibold text-muted hover:bg-hover hover:text-text disabled:opacity-40">
        Quit {JOB.name}
      </button>
    )}
    </>
  );
}
