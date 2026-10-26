"use client";

import type { Dispatch } from "react";
import { getCoin, lastChange } from "@/lib/game/coins";
import { money } from "@/lib/game/format";
import { netWorth, portfolioValue, positionValue } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { PctTag, Spark } from "./bits";

export function PortfolioSummary({ state }: { state: GameState }) {
  const items = [
    ["Cash", money(state.cash)],
    ["In crypto", money(portfolioValue(state))],
    ["Net worth", money(netWorth(state))],
    ["Peak", money(state.run.peakNetWorth)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-raised px-3 py-2.5">
          <dt className="text-[11px] text-muted">{k}</dt>
          <dd className="num mt-0.5 text-[15px] text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PositionsTable({
  state,
  dispatch,
  onSelect,
  selected,
}: {
  state: GameState;
  dispatch: Dispatch<Action>;
  onSelect: (coinId: string) => void;
  selected?: string | null;
}) {
  const rows = [...state.positions].sort((a, b) => positionValue(state, b) - positionValue(state, a));
  if (!rows.length) {
    return (
      <div className="grid place-items-center py-10 text-center">
        <p className="text-sm font-semibold">No open positions</p>
        <p className="mt-1 text-[13px] text-muted">Pick a coin from the market to open your first bag.</p>
      </div>
    );
  }
  return (
    <div className="@container">
    <table className="w-full table-fixed text-[13px]">
      <thead>
        <tr className="text-left text-[11px] text-muted">
          <th className="w-[26%] pb-2 font-medium">Coin</th>
          <th className="pb-2 text-right font-medium">Value</th>
          <th className="hidden pb-2 text-right font-medium @xl:table-cell">Cost</th>
          <th className="pb-2 pl-3 text-right font-medium">PnL</th>
          <th className="hidden pb-2 pl-3 text-right font-medium @md:table-cell">1 mo</th>
          <th className="hidden w-16 pb-2 font-medium @lg:table-cell" aria-label="Trend" />
          <th className="w-[7.5rem] pb-2 text-right font-medium">Close</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const c = getCoin(state, p.coinId);
          if (!c) return null;
          const v = positionValue(state, p);
          const m = p.cost > 0 ? v / p.cost : 0;
          return (
            <tr
              key={p.coinId}
              onClick={() => onSelect(c.id)}
              className={`cursor-pointer border-t border-line hover:bg-raised ${selected === c.id ? "bg-raised" : ""}`}
            >
              <td className="truncate py-2.5 pr-2">
                <span className="font-bold">${c.ticker}</span>
                {c.dead && <span className="ml-1.5 text-[11px] text-rose">dead</span>}
              </td>
              <td className="num py-2.5 text-right">{money(v)}</td>
              <td className="num hidden py-2.5 text-right text-muted @xl:table-cell">{money(p.cost)}</td>
              <td className="py-2.5 pl-3 text-right">
                <PctTag value={m - 1} />
                
              </td>
              <td className="hidden py-2.5 pl-3 text-right @md:table-cell">
                <PctTag value={lastChange(c)} />
              </td>
              <td className="hidden py-2.5 pl-3 @lg:table-cell">
                <Spark points={c.spark} className="h-5 w-14" />
              </td>
              <td className="py-2.5 text-right">
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "SELL", coinId: c.id, fraction: 0.5 });
                    }}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold hover:border-rose hover:text-rose"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "SELL", coinId: c.id, fraction: 1 });
                    }}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold hover:border-rose hover:text-rose"
                  >
                    All
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export function ActivityLog({ state, limit = 40 }: { state: GameState; limit?: number }) {
  const rows = state.log.slice(-limit).reverse();
  if (!rows.length) return <p className="py-8 text-center text-[13px] text-muted">Nothing has happened yet. Age up to start living.</p>;
  return (
    <ul className="space-y-0.5">
      {rows.map((l, i) => (
        <li key={`${l.month}-${i}`} className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-raised">
          <span className="num w-6 shrink-0 pt-px text-[11px] text-faint">{l.age}</span>
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${l.tone === "good" ? "bg-mint" : l.tone === "bad" ? "bg-rose" : "bg-line-strong"}`} aria-hidden />
          <span className={l.tone === "neutral" ? "text-muted" : "text-text"}>{l.text}</span>
        </li>
      ))}
    </ul>
  );
}
