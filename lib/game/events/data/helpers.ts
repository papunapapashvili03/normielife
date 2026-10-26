// Small building blocks shared by content files. Pure data helpers.
import type { Choice, Effect, Requirement, StatKey } from "../../types";

export const CAN_BUY: Requirement = { minCash: 20 };

export function research(intro = "You dig into {coin}: holders, liquidity, the dev's wallet history..."): Choice {
  return {
    text: "🔍 Research",
    outcomes: [{ text: intro, effects: [{ type: "research" }, { type: "queue", event: "crypto_research_followup", months: 0 }] }],
  };
}

export function ignore(text: string, label = "Ignore", effects: Effect[] = []): Choice {
  return { text: label, outcomes: [{ text, effects }] };
}

export const stat = (s: StatKey, delta: number): Effect => ({ type: "stat", stat: s, delta });
