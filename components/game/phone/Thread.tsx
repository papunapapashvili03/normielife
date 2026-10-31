"use client";

import type { Dispatch } from "react";
import { eventText, getEvent, render, visibleChoices } from "@/lib/game/events/engine";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { CATEGORY, ResultChips } from "../EventStage";

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** A story event, told as a text conversation. Choices are quick replies. */
export function Thread({ state, dispatch, onBack }: { state: GameState; dispatch: Dispatch<Action>; onBack: () => void }) {
  const cur = state.current;
  const ev = cur ? getEvent(cur.id) : undefined;
  if (!cur || !ev) return null;
  const paragraphs = eventText(state, ev, cur.ctx).split(/\n{2,}/);
  const result = cur.stage === "result" ? cur.result : undefined;
  const picked = cur.choice !== undefined ? ev.choices[cur.choice] : undefined;

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-line px-2 py-2">
        <button type="button" onClick={onBack} className="rounded-full px-2 py-1 text-[22px] leading-none text-mint" aria-label="Back to home screen">
          ‹
        </button>
        <span className="grid size-9 place-items-center rounded-full bg-raised text-xl" aria-hidden>
          {ev.emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{sentence(ev.title)}</p>
          <p className="text-[11px] text-muted">{CATEGORY[ev.category]}</p>
        </div>
      </header>

      <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-live="polite">
        {paragraphs.map((p, i) => (
          <Bubble key={i} delay={i * 120}>
            {p}
          </Bubble>
        ))}

        {picked && (
          <div className="msg-in flex justify-end pt-2">
            <p className="max-w-[78%] rounded-2xl rounded-br-md bg-mint-fill px-3.5 py-2 text-[15px] leading-snug text-mint-ink">{render(state, picked.text, cur.ctx)}</p>
          </div>
        )}

        {result && (
          <>
            <div className="typing-out mt-2 flex w-14 items-center justify-center gap-1 rounded-2xl rounded-bl-md bg-raised px-3 py-3" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </div>
            {result.text.split(/\n{2,}/).map((p, i) => (
              <Bubble key={`r${i}`} delay={900 + i * 140} tone={result.tone}>
                {p}
              </Bubble>
            ))}
            <div className="msg-in flex justify-center pt-1" style={{ animationDelay: "1100ms" }}>
              <ResultChips result={result} />
            </div>
          </>
        )}
      </div>

      <footer className="border-t border-line bg-white px-3 pb-4 pt-3">
        {result ? (
          <button type="button" autoFocus onClick={() => dispatch({ type: "CONTINUE" })} className="w-full rounded-full bg-text py-3 text-[15px] font-bold text-white">
            Done
          </button>
        ) : (
          <div className="space-y-1.5">
            {visibleChoices(state, ev, cur.ctx).map(({ choice, index }, i) => (
              <button
                key={index}
                type="button"
                onClick={() => dispatch({ type: "CHOOSE", index })}
                className="msg-in flex w-full items-center gap-2.5 rounded-full border border-mint/40 px-4 py-2.5 text-left text-[14px] font-semibold text-mint hover:bg-mint/[0.07]"
                style={{ animationDelay: `${paragraphs.length * 120 + i * 60}ms` }}
              >
                <span className="num text-[11px] text-mint/60">{i + 1}</span>
                {render(state, choice.text, cur.ctx)}
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

function Bubble({ children, delay = 0, tone }: { children: React.ReactNode; delay?: number; tone?: "good" | "bad" | "neutral" }) {
  const tint = tone === "good" ? "bg-mint/12 ring-1 ring-mint/30" : tone === "bad" ? "bg-rose/10 ring-1 ring-rose/25" : "bg-raised";
  return (
    <div className="msg-in flex" style={{ animationDelay: `${delay}ms` }}>
      <p className={`max-w-[82%] whitespace-pre-line rounded-2xl rounded-bl-md px-3.5 py-2 text-[15px] leading-snug ${tint}`}>{children}</p>
    </div>
  );
}
