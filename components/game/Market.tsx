"use client";

import { useState } from "react";
import { NARRATIVE_LABEL, lastChange, marketCap, momentum, shownRisk } from "@/lib/game/coins";
import { money } from "@/lib/game/format";
import { hasFlag } from "@/lib/game/history";
import { getPosition } from "@/lib/game/portfolio";
import type { Coin, GameState, RiskLevel } from "@/lib/game/types";
import { Momentum, PctTag, Spark } from "./bits";

type Filter = "all" | "new" | "holding";

const RISK_DOT: Record<RiskLevel | "unknown", string> = {
  low: "bg-mint",
  medium: "bg-amber",
  high: "bg-rose",
  extreme: "bg-rose ring-2 ring-rose/30",
  unknown: "bg-line-strong",
};

export function MarketList({ state, selected, onSelect }: { state: GameState; selected?: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  if (!hasFlag(state, "discovered")) {
    return (
      <div className="grid place-items-center px-6 py-14 text-center">
        <span className="text-3xl" aria-hidden>
          🔒
        </span>
        <p className="mt-3 text-sm font-semibold">You don&apos;t know what a memecoin is yet</p>
        <p className="mt-1 text-[13px] text-muted">Keep living. The internet will find you.</p>
      </div>
    );
  }
  const k = state.player.stats.knowledge;
  let coins = state.coins.filter((c) => !c.dead);
  if (filter === "new") coins = coins.filter((c) => c.ageMonths === 0);
  if (filter === "holding") coins = state.coins.filter((c) => getPosition(state, c.id));
  coins = [...coins].sort((a, b) => (a.ageMonths === 0 ? 0 : 1) - (b.ageMonths === 0 ? 0 : 1) || lastChange(b) - lastChange(a));

  return (
    <div>
      <div className="flex items-center gap-1 px-3 pb-2" role="tablist" aria-label="Market filter">
        {(["all", "new", "holding"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === f ? "bg-raised text-text" : "text-muted hover:text-text"}`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-faint" title="Risk labels are only as honest as your knowledge">
          Knowledge <span className="num text-muted">{Math.round(k)}</span>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-2 border-y border-line px-3 py-1.5 text-[11px] text-faint">
        <span>Coin</span>
        <span className="text-right">MC / 1 mo</span>
        <span />
      </div>
      {coins.length === 0 ? (
        <p className="px-3 py-8 text-center text-[13px] text-muted">{filter === "holding" ? "You aren't holding anything." : "Nothing here this month."}</p>
      ) : (
        <ul>
          {coins.map((c) => (
            <CoinRow key={c.id} c={c} knowledge={k} held={!!getPosition(state, c.id)} active={selected === c.id} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CoinRow({ c, knowledge, held, active, onSelect }: { c: Coin; knowledge: number; held: boolean; active: boolean; onSelect: (id: string) => void }) {
  const risk = shownRisk(c, knowledge);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        aria-pressed={active}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-2 border-l-2 px-3 py-2.5 text-left hover:bg-raised ${active ? "border-mint bg-raised" : "border-transparent"}`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${RISK_DOT[risk]}`} title={risk === "unknown" ? "Risk unknown" : `${risk} risk`} />
            <span className="truncate text-[13px] font-bold">${c.ticker}</span>
            {held && <span className="rounded-full bg-mint/15 px-1.5 text-[10px] font-bold text-mint">HELD</span>}
            {c.ageMonths === 0 && <span className="rounded-full bg-amber/15 px-1.5 text-[10px] font-bold text-amber">NEW</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted">
            {NARRATIVE_LABEL[c.narrative]} <Momentum n={momentum(c)} />
          </span>
        </span>
        <span className="text-right">
          <span className="num block text-[13px]">{money(marketCap(c))}</span>
          {c.ageMonths > 0 ? <PctTag value={lastChange(c)} className="text-[11px]" /> : <span className="text-[11px] text-faint">launched</span>}
        </span>
        <Spark points={c.spark} className="h-6 w-14" />
      </button>
    </li>
  );
}
