"use client";

import type { Dispatch } from "react";
import { JOB } from "@/lib/game/config";
import { compact, money } from "@/lib/game/format";
import { eventText, getEvent, render, visibleChoices } from "@/lib/game/events/engine";
import { ageOf, hasFlag } from "@/lib/game/history";
import { expenses } from "@/lib/game/life";
import { canPost, type Action } from "@/lib/game/reducer";
import { canHunt } from "@/lib/game/tradesim";
import type { EventCategory, GameState, StatKey } from "@/lib/game/types";
import { Delta, Kbd } from "./bits";
import { MONTHS } from "./progress";

export const CATEGORY: Record<EventCategory, string> = {
  onboarding: "Origin story",
  crypto: "Crypto",
  trade: "Your bags",
  kol: "Crypto Twitter",
  life: "Life",
  mcd: JOB.name,
  social: "Social",
  legendary: "Legendary",
  system: "Life",
};

const STAT_EMOJI: Record<StatKey, string> = { luck: "🍀", intelligence: "🧠", risk: "🎰", discipline: "🎯", charisma: "😎", knowledge: "🪙" };

export function EventStage({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const cur = state.current;
  const when = `${MONTHS[state.month % 12]} · Age ${ageOf(state)}`;

  if (!cur) return <IdleStage state={state} dispatch={dispatch} when={when} />;
  const ev = getEvent(cur.id);
  if (!ev) return null;
  const result = cur.stage === "result" ? cur.result : undefined;
  const legendary = ev.category === "legendary";

  return (
    <article key={`${cur.id}-${state.month}-${cur.stage}`} className="rise-in mx-auto w-full max-w-2xl" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl border text-2xl ${legendary ? "border-amber/40 bg-amber/10" : "border-line bg-raised"}`} aria-hidden>
          {ev.emoji}
        </span>
        <div>
          <p className={`text-[13px] font-extrabold tracking-wide ${legendary ? "text-amber" : ev.id === "sys_broke" ? "text-rose" : "text-mint"}`}>{ev.title}</p>
          <p className="text-xs text-muted">
            {CATEGORY[ev.category]} · {when}
          </p>
        </div>
      </div>

      <p className="mt-5 whitespace-pre-line text-[19px] leading-relaxed text-text">{eventText(state, ev, cur.ctx)}</p>

      {result ? (
        <div className="mt-6">
          <div className={`rounded-2xl border p-4 ${result.tone === "good" ? "border-mint/40 bg-mint/[0.06]" : result.tone === "bad" ? "border-rose/40 bg-rose/[0.06]" : "border-line bg-raised"}`}>
            <p className="whitespace-pre-line text-[16px] font-medium leading-relaxed">{result.text}</p>
            <ResultChips result={result} />
          </div>
          <button type="button" autoFocus onClick={() => dispatch({ type: "CONTINUE" })} className="mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-text py-3.5 text-[15px] font-bold text-bg hover:bg-text/85">
            Continue <Kbd>Space</Kbd>
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {visibleChoices(state, ev, cur.ctx).map(({ choice, index }, i) => (
            <button
              key={index}
              type="button"
              onClick={() => dispatch({ type: "CHOOSE", index })}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5 text-left text-[15px] font-semibold transition-colors hover:border-mint/60 hover:bg-raised"
            >
              <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-[11px] text-muted group-hover:border-mint group-hover:text-mint">{i + 1}</span>
              <span className="flex-1">{render(state, choice.text, cur.ctx)}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function ResultChips({ result }: { result: NonNullable<NonNullable<GameState["current"]>["result"]> }) {
  const chips: React.ReactNode[] = [];
  if (Math.abs(result.nwDelta) >= 1) {
    chips.push(
      <span key="nw" className="rounded-full bg-bg/60 px-2.5 py-1 text-[13px] text-muted">
        Net worth <Delta value={result.nwDelta} />
      </span>,
    );
  } else if (Math.abs(result.cashDelta) >= 1) {
    chips.push(
      <span key="cash" className="rounded-full bg-bg/60 px-2.5 py-1 text-[13px] text-muted">
        Cash <Delta value={result.cashDelta} />
      </span>,
    );
  }
  for (const [k, v] of Object.entries(result.statDeltas)) {
    chips.push(
      <span key={k} className={`num rounded-full bg-bg/60 px-2.5 py-1 text-[13px] ${v! > 0 ? "text-mint" : "text-rose"}`}>
        {STAT_EMOJI[k as StatKey]} {v! > 0 ? "+" : ""}
        {v}
      </span>,
    );
  }
  if (result.followersDelta) {
    chips.push(
      <span key="f" className={`num rounded-full bg-bg/60 px-2.5 py-1 text-[13px] ${result.followersDelta > 0 ? "text-mint" : "text-rose"}`}>
        🐦 {result.followersDelta > 0 ? "+" : "-"}
        {compact(Math.abs(result.followersDelta))}
      </span>,
    );
  }
  if (!chips.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2">{chips}</div>;
}

function IdleStage({ state, dispatch, when }: { state: GameState; dispatch: Dispatch<Action>; when: string }) {
  const last = state.log.slice(-3).reverse();
  const discovered = hasFlag(state, "discovered");
  return (
    <div className="rise-in mx-auto flex w-full max-w-2xl flex-col items-center py-4 text-center">
      <p className="eyebrow">{when}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Life goes on.</h2>
      <p className="mt-1 text-sm text-muted">
        Living costs <span className="num text-text">{money(expenses(state))}</span>/month{state.job.employed && <> · {JOB.emoji} paycheck incoming</>}
      </p>

      <button type="button" onClick={() => dispatch({ type: "NEXT_MONTH" })} className="age-btn mt-7 flex items-center gap-3 py-3.5 pl-3.5 pr-7 text-lg font-extrabold">
        <span className="grid size-9 place-items-center rounded-full bg-mint-ink text-2xl leading-none text-mint-fill" aria-hidden>
          +
        </span>
        Age up
      </button>
      <p className="mt-2.5 flex items-center gap-2 text-xs text-faint">
        Live until something happens <Kbd>Space</Kbd>
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {discovered && (
          <button type="button" disabled={!canHunt(state)} onClick={() => dispatch({ type: "HUNT_TRADE" })} className="rounded-full border border-line-strong px-4 py-2 text-[13px] font-semibold hover:border-mint hover:text-mint disabled:opacity-40" title="One per month">
            📊 Find a trade
          </button>
        )}
        <button type="button" disabled={!canPost(state)} onClick={() => dispatch({ type: "POST" })} className="rounded-full border border-line-strong px-4 py-2 text-[13px] font-semibold hover:border-mint hover:text-mint disabled:opacity-40">
          🐦 Post on CT
        </button>
        {!discovered && <span className="rounded-full border border-dashed border-line px-4 py-2 text-[13px] text-faint">🔒 Market unlocks when you discover crypto</span>}
      </div>

      {last.length > 0 && (
        <ul className="mt-8 w-full max-w-md space-y-1.5 text-left">
          {last.map((l, i) => (
            <li key={`${l.month}-${i}`} className="flex items-start gap-2.5 text-[13px] text-muted">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${l.tone === "good" ? "bg-mint" : l.tone === "bad" ? "bg-rose" : "bg-line-strong"}`} aria-hidden />
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
