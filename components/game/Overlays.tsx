"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { BASELINE_CASH, JOB } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { hasFlag } from "@/lib/game/history";
import { salary } from "@/lib/game/job";
import { expenses } from "@/lib/game/life";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { EventStage } from "./EventStage";

/** Events that interrupt as a pop-up instead of playing on the board. */
export const MODAL_EVENTS = new Set(["sys_broke"]);

function Backdrop({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="fade-in fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[2px]">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className="rise-in w-full max-w-lg outline-none">
        {children}
      </div>
    </div>
  );
}

export function BrokeModal({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  return (
    <Backdrop label="You are broke">
      <div className="panel overflow-hidden">
        <div className="border-b border-line bg-rose/[0.06] px-6 pb-5 pt-6 text-center">
          <p className="num text-5xl font-medium tracking-tight text-rose">$0.00</p>
          <p className="mt-1 text-sm text-muted">
            Started with {money(state.run.startCash)}. Peaked at {money(state.run.peakNetWorth)}.
          </p>
        </div>
        <div className="px-6 py-6">
          <EventStage state={state} dispatch={dispatch} />
        </div>
      </div>
    </Backdrop>
  );
}

/** Generic stand-in for the arches: two yellow humps on red. */
function Arches() {
  return (
    <div className="pop grid size-28 place-items-center rounded-[28px] bg-mcd-red shadow-lg shadow-mcd-red/25" style={{ animationDelay: "0ms" }}>
      <svg viewBox="0 0 100 80" className="h-16 w-20" aria-hidden>
        <path d="M10 76 V44 C10 2 46 2 50 46 C54 2 90 2 90 44 V76 M50 46 V76" fill="none" stroke="var(--mcd-yellow)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="arches" />
      </svg>
    </div>
  );
}

const MENU = [
  ["🍔", "Burger", 5.99],
  ["🍟", "Fries", 3.49],
  ["🍗", "Nuggets", 4.99],
  ["🥤", "Soda", 1.99],
  ["🍦", "Sundae", 2.49],
  ["🥧", "Apple pie", 1.49],
] as const;

export function McdIntro({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const rebuilding = hasFlag(state, "rebuilding");
  const pay = salary(state);
  const perMonth = Math.max(1, pay - expenses(state));
  const need = Math.max(0, BASELINE_CASH - state.cash);
  const months = Math.ceil(need / perMonth);
  const progress = Math.min(1, state.cash / BASELINE_CASH);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dispatch({ type: "DISMISS_INTRO" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <Backdrop label={`Clocking in at ${JOB.name}`}>
      <div className="panel overflow-hidden text-center">
        <div className="flex flex-col items-center bg-mcd-yellow/15 px-6 pb-6 pt-8">
          <Arches />
          <p className="pop mt-5 text-xs font-bold uppercase tracking-[0.2em] text-mcd-red" style={{ animationDelay: "700ms" }}>
            {JOB.name} · Now hiring
          </p>
          <h2 className="pop mt-2 text-3xl font-extrabold tracking-tight" style={{ animationDelay: "800ms" }}>
            {rebuilding ? `Back to ${money(BASELINE_CASH)}.` : "Welcome to the crew."}
          </h2>
          <p className="pop mt-1.5 max-w-sm text-[15px] text-muted" style={{ animationDelay: "900ms" }}>
            {rebuilding
              ? `Every shift gets you closer to the ${money(BASELINE_CASH)} you started with. Rebuild the stack, then trade again.`
              : "Steady paychecks while you plan your next trade."}
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="pop overflow-hidden rounded-2xl border border-line text-left" style={{ animationDelay: "1000ms" }}>
            <div className="flex items-center justify-between bg-mcd-red px-4 py-2 text-white">
              <span className="text-xs font-extrabold tracking-[0.2em]">MENU</span>
              <span className="text-xs font-semibold opacity-90">Today&apos;s shift</span>
            </div>
            <ul className="grid grid-cols-2 gap-px bg-line">
              {MENU.map(([emoji, name, price], i) => (
                <li key={name} className="pop flex items-center gap-2.5 bg-panel px-4 py-2.5" style={{ animationDelay: `${1150 + i * 110}ms` }}>
                  <span className="text-xl" aria-hidden>
                    {emoji}
                  </span>
                  <span className="flex-1 text-[14px] font-semibold">{name}</span>
                  <span className="num text-[13px] text-muted">${price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          {rebuilding && (
            <div className="pop mt-5 text-left" style={{ animationDelay: "1850ms" }}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-semibold">Baseline</span>
                <span className="num text-muted">
                  {money(state.cash)} / {money(BASELINE_CASH)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-mcd-yellow" style={{ width: `${Math.max(2, progress * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {money(pay)}/mo paycheck · about {months} month{months === 1 ? "" : "s"} of shifts to get there
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: "DISMISS_INTRO" })}
            className="pop mt-5 w-full rounded-full bg-mcd-yellow py-3.5 text-[15px] font-extrabold text-[#2b1d00] hover:brightness-95"
            style={{ animationDelay: "2000ms" }}
          >
            Clock in
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
