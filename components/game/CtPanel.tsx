"use client";

import type { Dispatch } from "react";
import { compact } from "@/lib/game/format";
import { hasFlag } from "@/lib/game/history";
import { ARCHETYPE_LABEL, KOLS, kolRead, kolReadLine } from "@/lib/game/kols";
import { canPost, type Action } from "@/lib/game/reducer";
import { socialTier } from "@/lib/game/status";
import type { GameState } from "@/lib/game/types";
import { Avatar } from "./Portrait";

export function CtPanel({ state, dispatch, onPosted }: { state: GameState; dispatch: Dispatch<Action>; onPosted?: () => void }) {
  const discovered = hasFlag(state, "discovered");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-raised p-3">
        <Avatar id={state.player.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold">{state.player.handle}</div>
          <div className="text-[11px] text-muted">
            <span className="num text-text">{compact(state.followers)}</span> followers · {socialTier(state.followers)}
          </div>
        </div>
        <button
          type="button"
          disabled={!canPost(state)}
          onClick={() => {
            dispatch({ type: "POST" });
            onPosted?.();
          }}
          className="rounded-full bg-text px-4 py-1.5 text-[13px] font-bold text-bg disabled:opacity-30"
          title={discovered ? "One post per month" : "Discover crypto first"}
        >
          Post
        </button>
      </div>

      <section>
        <h3 className="eyebrow mb-2">Timeline</h3>
        <ul className="divide-y divide-line">
          {state.feed.slice(0, 25).map((t) => (
            <li key={t.id} className={`flex gap-3 py-3 ${t.kind === "player" ? "-mx-2 rounded-xl bg-mint/[0.06] px-2" : ""}`}>
              {t.kind === "player" ? (
                <Avatar id={t.avatar} size={32} />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-base" aria-hidden>
                  {t.avatar}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 text-[13px]">
                  <span className="truncate font-bold">{t.name}</span>
                  <span className="truncate text-[11px] text-faint">{t.handle}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-text/90">{t.text}</p>
                <div className="num mt-1 flex gap-4 text-[11px] text-faint">
                  <span>♥ {compact(t.likes)}</span>
                  <span>↻ {compact(t.rts)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="eyebrow">KOLs</h3>
        <p className="mt-1 text-[11px] text-faint">Your read sharpens as you trade their calls.</p>
        <ul className="mt-2 space-y-1.5">
          {KOLS.map((k) => {
            const read = kolRead(state, k);
            const line = kolReadLine(state, k);
            return (
              <li key={k.id} className="rounded-xl border border-line px-3 py-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <span aria-hidden>{k.avatar}</span>
                  <span className="font-bold">{k.handle}</span>
                  <span className="num ml-auto text-[11px] text-faint">{compact(k.audience)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {read >= 0.25 ? ARCHETYPE_LABEL[k.archetype] : "Unknown type"}
                  {read >= 0.7 && (
                    <>
                      {" "}
                      · right ~<span className="num text-text">{Math.round(k.accuracy * 100)}%</span> · dumps ~<span className="num text-text">{Math.round(k.dump * 100)}%</span>
                    </>
                  )}
                </div>
                {line && <p className="mt-1 text-[11px] font-semibold text-mint">{line.replace("🧠 Your read: ", "")}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
