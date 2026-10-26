"use client";

import type { Dispatch } from "react";
import { BASELINE_CASH, JOB, RETIRE_MIN_AGE, STATUSES } from "@/lib/game/config";
import { compact, money } from "@/lib/game/format";
import { ageOf, hasFlag } from "@/lib/game/history";
import { salary } from "@/lib/game/job";
import type { Action } from "@/lib/game/reducer";
import { socialTier } from "@/lib/game/status";
import type { GameState } from "@/lib/game/types";
import { STAT_ROWS, StatBar } from "./bits";
import { FullPortrait } from "./Portrait";
import { nextStatus } from "./progress";

export function CharacterPanel({ state, dispatch, onExit }: { state: GameState; dispatch: Dispatch<Action>; onExit: () => void }) {
  const p = state.player;
  const st = STATUSES[state.status];
  const ns = nextStatus(state);
  const age = ageOf(state);
  const busy = !!state.current || !!state.sim;
  const rebuilding = hasFlag(state, "rebuilding");

  return (
    <div className="space-y-3">
      <section className="panel overflow-hidden">
        <div className="relative h-44 overflow-hidden border-b border-line bg-[radial-gradient(circle_at_70%_35%,color-mix(in_oklab,var(--mint)_14%,transparent),transparent_60%)]">
          <div className="absolute -bottom-16 right-2 top-3">
            <FullPortrait id={p.avatar} priority />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-panel to-transparent" aria-hidden />
          <div className="absolute bottom-3 left-4 max-w-[55%]">
            <h2 className="truncate text-xl font-extrabold tracking-tight">{p.name}</h2>
            <p className="truncate text-[13px] text-muted">
              Age {age} · {p.country}
            </p>
            <p className="truncate text-[13px] text-faint">{p.handle}</p>
          </div>
        </div>

        <div className="m-4 rounded-xl bg-raised p-3">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">
              {st.emoji} {st.label.charAt(0) + st.label.slice(1).toLowerCase()}
            </span>
            {ns.label && <span className="text-xs text-muted">Next: {ns.label.split(" ").slice(1).join(" ").toLowerCase()}</span>}
          </div>
          <p className="mt-0.5 text-xs italic text-faint">&ldquo;{st.quote}&rdquo;</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(ns.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next status">
            <div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(2, ns.progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">{ns.hint}</p>
        </div>
      </section>

      <section className="panel space-y-2.5 p-4">
        <h3 className="eyebrow">Stats</h3>
        {STAT_ROWS.map(([k, label]) => (
          <StatBar key={k} label={label} value={p.stats[k]} compact />
        ))}
      </section>

      <section className="panel p-4" aria-labelledby="job-h">
        <div className="flex items-center justify-between">
          <h3 id="job-h" className="text-[15px] font-bold">
            {JOB.emoji} {JOB.name}
          </h3>
          <span className="num text-[13px] text-muted">{money(salary(state))}/mo</span>
        </div>
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
      </section>

      <section className="panel p-4">
        <h3 className="eyebrow">Social</h3>
        <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-[13px]">
          <dt className="text-muted">Followers</dt>
          <dd className="num text-right">{compact(state.followers)}</dd>
          <dt className="text-muted">CT rank</dt>
          <dd className="text-right">{socialTier(state.followers)}</dd>
          <dt className="text-muted">Reputation</dt>
          <dd className="num text-right">{Math.round(state.reputation)}/100</dd>
        </dl>
      </section>

      <div className="flex items-center justify-between px-1 text-xs text-faint">
        <span className="num">RUN #{state.seed}</span>
        <div className="flex gap-3">
          {age >= RETIRE_MIN_AGE && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Retire? You'll cash out everything and live out the rest of your life. This ends the run.")) dispatch({ type: "RETIRE" });
              }}
              className="font-semibold hover:text-text disabled:opacity-40"
            >
              Retire
            </button>
          )}
          <button type="button" onClick={onExit} className="font-semibold hover:text-text">
            Save and exit
          </button>
        </div>
      </div>
    </div>
  );
}
