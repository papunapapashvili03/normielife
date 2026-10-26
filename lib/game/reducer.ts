// UI actions -> engine calls. The state is cloned first so the engine can mutate freely
// and every transition stays pure + deterministic (RNG state lives in the state).
import { createGame, type CharacterDraft } from "./character";
import { choose, present, presentDueQueue } from "./events/engine";
import { BASELINE_CASH } from "./config";
import { checkBroke, nextMonth, retire, work, workUntil } from "./life";
import { quitJob } from "./job";
import { buy, sell } from "./portfolio";
import { updateProgress } from "./status";
import { canHunt, simClose, simDecide, simEnter, startTradeSim, type SimAction } from "./tradesim";
import type { GameState, SizeBand } from "./types";

export type Action =
  | { type: "NEW_GAME"; draft: CharacterDraft; seed: number }
  | { type: "LOAD"; state: GameState }
  | { type: "EXIT" }
  | { type: "CHOOSE"; index: number }
  | { type: "CONTINUE" }
  | { type: "NEXT_MONTH" }
  | { type: "BUY"; coinId: string; amount: number }
  | { type: "SELL"; coinId: string; fraction: number }
  | { type: "WORK"; months: number }
  | { type: "QUIT_JOB" }
  | { type: "POST" }
  | { type: "RETIRE" }
  | { type: "WORK_TO_BASELINE" }
  | { type: "HUNT_TRADE" }
  | { type: "SIM_ENTER"; choice: SizeBand | "pass" }
  | { type: "SIM_DECIDE"; action: SimAction }
  | { type: "SIM_CLOSE" }
  | { type: "DISMISS_INTRO" };

export function canPost(s: GameState): boolean {
  return !s.ended && !s.current && !s.sim && "discovered" in s.flags && s.lastSeen["social_post"] !== s.month;
}

export function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === "NEW_GAME") return createGame(action.draft, action.seed);
  if (action.type === "LOAD") return action.state;
  if (action.type === "EXIT") return null;
  if (!state) return state;

  const s = structuredClone(state);
  switch (action.type) {
    case "CHOOSE":
      choose(s, action.index);
      break;
    case "CONTINUE":
      if (s.current?.stage !== "result") return state;
      s.current = null;
      checkBroke(s);
      presentDueQueue(s);
      break;
    case "NEXT_MONTH":
      nextMonth(s);
      break;
    case "BUY":
      if (s.current || s.sim || s.ended) return state;
      buy(s, action.coinId, action.amount);
      updateProgress(s);
      break;
    case "SELL":
      // The simulated trade manages its own coin until the day is over.
      if (s.ended || s.sim?.coinId === action.coinId) return state;
      sell(s, action.coinId, action.fraction);
      updateProgress(s);
      break;
    case "WORK":
      work(s, action.months);
      break;
    case "QUIT_JOB":
      if (s.current || s.sim) return state;
      quitJob(s);
      break;
    case "POST":
      if (!canPost(s)) return state;
      present(s, "social_post");
      break;
    case "RETIRE":
      if (s.current || s.sim) return state;
      retire(s);
      break;
    case "WORK_TO_BASELINE":
      workUntil(s, BASELINE_CASH);
      break;
    case "HUNT_TRADE":
      if (!canHunt(s)) return state;
      s.lastSeen["trade_hunt"] = s.month;
      startTradeSim(s);
      break;
    case "SIM_ENTER":
      simEnter(s, action.choice);
      break;
    case "SIM_DECIDE":
      simDecide(s, action.action);
      break;
    case "SIM_CLOSE":
      if (s.sim?.phase !== "done") return state;
      simClose(s);
      checkBroke(s);
      presentDueQueue(s);
      break;
    case "DISMISS_INTRO":
      delete s.flags.mcd_intro;
      break;
  }
  return s;
}
