"use client";

import { lastChange } from "@/lib/game/coins";
import { STATUSES } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { ageOf, hasFlag } from "@/lib/game/history";
import { netWorth, portfolioValue } from "@/lib/game/portfolio";
import type { GameState } from "@/lib/game/types";
import { PctTag } from "./bits";
import { MONTHS } from "./progress";
import { Avatar } from "./Portrait";

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.14em]">
      <span className="size-2 rounded-full bg-mint" aria-hidden />
      DEGEN LIFE
    </span>
  );
}

function Tape({ state, onSelect }: { state: GameState; onSelect: (id: string) => void }) {
  const coins = state.coins.filter((c) => !c.dead && c.ageMonths > 0).sort((a, b) => Math.abs(lastChange(b)) - Math.abs(lastChange(a)));
  if (!hasFlag(state, "discovered") || coins.length === 0) {
    return <span className="min-w-0 flex-1 truncate text-xs text-faint">Markets are moving. You just don&apos;t know it yet.</span>;
  }
  const items = (copy: boolean) =>
    coins.map((c) => (
    <button key={c.id} type="button" tabIndex={copy ? -1 : undefined} onClick={() => onSelect(c.id)} className="mr-6 inline-flex items-baseline gap-1.5 text-xs hover:text-text">
      <span className="font-semibold text-muted">${c.ticker}</span>
      <PctTag value={lastChange(c)} />
    </button>
  ));
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
      <div className="tape inline-flex whitespace-nowrap">
        <div>{items(false)}</div>
        <div aria-hidden>{items(true)}</div>
      </div>
    </div>
  );
}

export function TopBar({ state, onSelectCoin }: { state: GameState; onSelectCoin: (id: string) => void }) {
  const st = STATUSES[state.status];
  const metrics = [
    ["Cash", money(state.cash), "text-text"],
    ["Crypto", money(portfolioValue(state)), "text-text"],
    ["Net worth", money(netWorth(state)), "text-mint"],
  ];
  return (
    <header className="flex h-14 items-center gap-6 border-b border-line px-4">
      <Logo />
      <Tape state={state} onSelect={onSelectCoin} />
      <div className="flex shrink-0 items-center gap-5">
        <div className="text-right">
          <div className="text-[11px] text-muted">
            {MONTHS[state.month % 12]} · Age {ageOf(state)}
          </div>
          <div className="text-xs font-bold">
            {st.emoji} {st.label}
          </div>
        </div>
        {metrics.map(([k, v, cls]) => (
          <div key={k} className="border-l border-line pl-5 text-right">
            <div className="text-[11px] text-muted">{k}</div>
            <div className={`num text-[15px] ${cls}`}>{v}</div>
          </div>
        ))}
      </div>
    </header>
  );
}

/** Compact header for phones. */
export function MobileHeader({ state }: { state: GameState }) {
  const st = STATUSES[state.status];
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
      <Avatar id={state.player.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-extrabold">
          {state.player.name} <span className="text-[13px] font-medium text-muted">· {ageOf(state)}</span>
        </div>
        <div className="text-xs text-muted">
          {st.emoji} {st.label}
        </div>
      </div>
      <div className="text-right">
        <div className="num text-[15px]">{money(state.cash)}</div>
        <div className="num text-[11px] text-mint">{money(netWorth(state))}</div>
      </div>
    </header>
  );
}
