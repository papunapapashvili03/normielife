"use client";

// Shared plumbing for every skin: props, keyboard shortcuts, and the pop-ups that
// interrupt play (broke, McDonald's clock-in). Skins only decide how things look.
import { useCallback, type Dispatch } from "react";
import { getEvent, visibleChoices } from "@/lib/game/events/engine";
import type { Action } from "@/lib/game/reducer";
import { stakeOptions } from "@/lib/game/tradesim";
import type { GameState } from "@/lib/game/types";
import { useHotkeys } from "./hooks";
import { BrokeModal, MODAL_EVENTS, McdIntro } from "./Overlays";

export type GameProps = { state: GameState; dispatch: Dispatch<Action>; onExit: () => void };

export function introOpen(state: GameState): boolean {
  return "mcd_intro" in state.flags && !state.current;
}

export function brokeOpen(state: GameState): boolean {
  return !!state.current && MODAL_EVENTS.has(state.current.id);
}

/** 1–5 pick a choice; Space/Enter continues or ages up. */
export function useGameHotkeys(state: GameState, dispatch: Dispatch<Action>, onAgeUp?: () => void) {
  const intro = introOpen(state);
  const onKey = useCallback(
    (key: string) => {
      if (intro) return false; // the intro handles its own keys
      const sim = state.sim;
      if (sim) {
        const n = Number(key);
        if (sim.phase === "setup" && Number.isInteger(n) && n >= 1) {
          const opts = stakeOptions(state);
          if (n <= opts.length) dispatch({ type: "SIM_ENTER", choice: opts[n - 1].band });
          else if (n === opts.length + 1) dispatch({ type: "SIM_ENTER", choice: "pass" });
          else return false;
          return true;
        }
        if (sim.phase === "decide" && n >= 1 && n <= 4) {
          const action = (["sell", "half", "hold", "add"] as const)[n - 1];
          if (action === "add" && state.cash < 20) return false;
          dispatch({ type: "SIM_DECIDE", action });
          return true;
        }
        if (sim.phase === "done" && (key === " " || key === "Enter")) {
          dispatch({ type: "SIM_CLOSE" });
          return true;
        }
        return false;
      }
      const cur = state.current;
      if (cur?.stage === "choose") {
        const n = Number(key);
        if (!Number.isInteger(n) || n < 1) return false;
        const ev = getEvent(cur.id);
        const vis = ev ? visibleChoices(state, ev, cur.ctx) : [];
        if (!vis[n - 1]) return false;
        dispatch({ type: "CHOOSE", index: vis[n - 1].index });
        return true;
      }
      if (key !== " " && key !== "Enter") return false;
      if (cur) dispatch({ type: "CONTINUE" });
      else if (onAgeUp) onAgeUp();
      else dispatch({ type: "NEXT_MONTH" });
      return true;
    },
    [state, dispatch, intro, onAgeUp],
  );
  useHotkeys(onKey);
}

export function GameOverlays({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  return (
    <>
      {brokeOpen(state) && <BrokeModal state={state} dispatch={dispatch} />}
      {introOpen(state) && <McdIntro state={state} dispatch={dispatch} />}
    </>
  );
}
