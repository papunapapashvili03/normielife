"use client";

import type { Dispatch } from "react";
import { JOB, RETIRE_MIN_AGE, STATUSES } from "@/lib/game/config";
import { compact, money } from "@/lib/game/format";
import { ageOf } from "@/lib/game/history";
import { salary } from "@/lib/game/job";
import type { Action } from "@/lib/game/reducer";
import { socialTier } from "@/lib/game/status";
import type { GameState } from "@/lib/game/types";
import { STAT_ROWS, StatBar } from "./bits";
import { currentMood } from "@/lib/game/mood";
import { JobControls } from "./JobControls";
import { FullPortrait } from "./Portrait";
import { nextStatus } from "./progress";

export function CharacterPanel({ state, dispatch, onExit }: { state: GameState; dispatch: Dispatch<Action>; onExit: () => void }) {
  const p = state.player;
  const st = STATUSES[state.status];
  const ns = nextStatus(state);
  const age = ageOf(state);
  const busy = !!state.current || !!state.sim;

  return (
    <div className="space-y-3">
      <section className="panel overflow-hidden">
        <div className="relative h-52 overflow-hidden border-b border-line bg-[radial-gradient(circle_at_70%_35%,color-mix(in_oklab,var(--mint)_14%,transparent),transparent_60%)]">
          <div className="absolute -bottom-12 right-2 top-9">
            <FullPortrait id={p.avatar} mood={currentMood(state)} priority />
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
        <JobControls state={state} dispatch={dispatch} />
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
