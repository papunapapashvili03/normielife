import { STATUSES, STATUS_ORDER, STATUS_THRESHOLDS } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { netWorth } from "@/lib/game/portfolio";
import type { GameState } from "@/lib/game/types";

export interface NextStatus {
  label: string | null;
  hint: string;
  progress: number;
}

const logProgress = (nw: number, from: number, to: number) =>
  Math.max(0, Math.min(1, (Math.log10(Math.max(nw, 1)) - Math.log10(from)) / (Math.log10(to) - Math.log10(from))));

/** How close the player is to the next rung of the status ladder. */
export function nextStatus(s: GameState): NextStatus {
  const idx = STATUS_ORDER.indexOf(s.status);
  const next = STATUS_ORDER[idx + 1];
  if (!next) return { label: null, hint: "Top of the ladder.", progress: 1 };
  const st = STATUSES[next];
  const label = `${st.emoji} ${st.label}`;
  const nw = netWorth(s);
  switch (next) {
    case "degen":
      return { label, hint: "Make your first trade", progress: 0 };
    case "trader": {
      const t = STATUS_THRESHOLDS.trader;
      const p = 0.5 * logProgress(nw, 100, t.netWorth) + 0.5 * Math.min(1, s.player.stats.knowledge / t.knowledge);
      return { label, hint: `${money(t.netWorth)} net worth and ${t.knowledge} knowledge`, progress: p };
    }
    case "chad":
      return { label, hint: `${money(STATUS_THRESHOLDS.chad)} net worth`, progress: logProgress(nw, STATUS_THRESHOLDS.trader.netWorth, STATUS_THRESHOLDS.chad) };
    case "whale":
      return { label, hint: `${money(STATUS_THRESHOLDS.whale)} net worth`, progress: logProgress(nw, STATUS_THRESHOLDS.chad, STATUS_THRESHOLDS.whale) };
    default:
      return { label, hint: `${money(STATUS_THRESHOLDS.legend)} net worth`, progress: logProgress(nw, STATUS_THRESHOLDS.whale, STATUS_THRESHOLDS.legend) };
  }
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
