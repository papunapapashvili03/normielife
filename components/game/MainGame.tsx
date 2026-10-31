"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { CharacterPanel } from "./CharacterPanel";
import { CtPanel } from "./CtPanel";
import { EventStage } from "./EventStage";
import { MODAL_EVENTS } from "./Overlays";
import { GameOverlays, useGameHotkeys, type GameProps } from "./shell";
import { TradeSimCard } from "./TradeSim";
import { useIsDesktop } from "./hooks";
import { MarketList } from "./Market";
import { OrderTicket } from "./OrderTicket";
import { ActivityLog, PortfolioSummary, PositionsTable } from "./Positions";
import { Story } from "./Story";
import { MobileHeader, TopBar } from "./TopBar";

type Props = GameProps;

export function MainGame(props: Props) {
  const { state, dispatch } = props;
  const isDesktop = useIsDesktop();

  useGameHotkeys(state, dispatch);

  return (
    <>
      {isDesktop ? <DesktopLayout {...props} /> : <MobileLayout {...props} />}
      <GameOverlays state={state} dispatch={dispatch} />
    </>
  );
}

/** The decision board: a trade simulation, a story event, or the idle "Age up" screen. */
function Board({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  if (state.sim) return <TradeSimCard state={state} dispatch={dispatch} />;
  if (state.current && MODAL_EVENTS.has(state.current.id)) {
    return (
      <div className="grid h-full place-items-center py-16 text-center">
        <div>
          <p className="num text-4xl text-rose">$0</p>
          <p className="mt-2 text-sm text-muted">Decide what happens next.</p>
        </div>
      </div>
    );
  }
  return <EventStage state={state} dispatch={dispatch} />;
}

// ---------------------------------------------------------------------------
// Desktop: a trading-terminal layout.
// ---------------------------------------------------------------------------

type LowerTab = "positions" | "activity" | "story";
type SideTab = "market" | "ct";

function DesktopLayout({ state, dispatch, onExit }: Props) {
  const [coinId, setCoinId] = useState<string | null>(null);
  const [lower, setLower] = useState<LowerTab>("positions");
  const [side, setSide] = useState<SideTab>("market");
  const selectCoin = (id: string) => {
    setCoinId(id);
    setSide("market");
  };
  const ticketCoin = coinId && state.coins.some((c) => c.id === coinId) ? coinId : null;

  // Each new event (or result) starts at the top of the stage.
  const stageRef = useRef<HTMLElement>(null);
  const stageKey = `${state.current?.id ?? "idle"}-${state.current?.stage ?? ""}-${state.month}-${state.sim?.coinId ?? ""}-${state.sim?.phase ?? ""}`;
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [stageKey]);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar state={state} onSelectCoin={selectCoin} />
      <div className="grid min-h-0 flex-1 grid-cols-[17rem_minmax(0,1fr)_22rem] gap-3 p-3 xl:grid-cols-[18.5rem_minmax(0,1fr)_24rem]">
        <aside className="scroll-thin min-h-0 overflow-y-auto pr-0.5" aria-label="Your character">
          <CharacterPanel state={state} dispatch={dispatch} onExit={onExit} />
        </aside>

        <main className="flex min-h-0 flex-col gap-3">
          <section ref={stageRef} className="panel scroll-thin min-h-0 flex-[3] overflow-y-auto px-8 py-8" aria-label="Your life">
            <Board state={state} dispatch={dispatch} />
          </section>
          <section className={`panel flex min-h-0 flex-col transition-[flex-grow] ${state.sim || state.current ? "flex-[1]" : "flex-[2]"}`}>
            <div className="flex items-center gap-1 border-b border-line px-3 pt-2" role="tablist" aria-label="Details">
              {(
                [
                  ["positions", `Positions${state.positions.length ? ` (${state.positions.length})` : ""}`],
                  ["activity", "Activity"],
                  ["story", "Story"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={lower === id}
                  onClick={() => setLower(id)}
                  className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-[13px] font-semibold ${lower === id ? "border-mint text-text" : "border-transparent text-muted hover:text-text"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {lower === "positions" && (
                <div className="space-y-4">
                  <PortfolioSummary state={state} />
                  <PositionsTable state={state} dispatch={dispatch} onSelect={selectCoin} selected={ticketCoin} />
                </div>
              )}
              {lower === "activity" && <ActivityLog state={state} />}
              {lower === "story" && <Story state={state} />}
            </div>
          </section>
        </main>

        <aside className="panel flex min-h-0 flex-col" aria-label="Market">
          <div className="flex gap-1 p-2" role="tablist" aria-label="Side panel">
            {(
              [
                ["market", "Market"],
                ["ct", "Crypto Twitter"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={side === id}
                onClick={() => setSide(id)}
                className={`flex-1 rounded-full py-1.5 text-[13px] font-semibold ${side === id ? "bg-raised text-text" : "text-muted hover:text-text"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {side === "market" ? (
            <>
              <div className="border-b border-line px-4 pb-4">
                {ticketCoin ? (
                  <OrderTicket key={ticketCoin} state={state} coinId={ticketCoin} dispatch={dispatch} onClose={() => setCoinId(null)} />
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] text-muted">Select a coin to open the order ticket.</p>
                )}
              </div>
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pt-3">
                <MarketList state={state} selected={ticketCoin} onSelect={selectCoin} />
              </div>
            </>
          ) : (
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <CtPanel state={state} dispatch={dispatch} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phones and small tablets: one column with a tab bar.
// ---------------------------------------------------------------------------

type MobileTab = "life" | "bags" | "market" | "ct" | "me" | "story";

const MOBILE_TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: "life", icon: "🏠", label: "Life" },
  { id: "bags", icon: "👜", label: "Bags" },
  { id: "market", icon: "📈", label: "Market" },
  { id: "ct", icon: "🐦", label: "CT" },
  { id: "me", icon: "👤", label: "Me" },
  { id: "story", icon: "📜", label: "Story" },
];

function MobileLayout({ state, dispatch, onExit }: Props) {
  const [tab, setTab] = useState<MobileTab>("life");
  const [coinId, setCoinId] = useState<string | null>(null);
  const eventWaiting = (!!state.current || !!state.sim) && tab !== "life";

  useEffect(() => {
    if (!coinId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCoinId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coinId]);

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <MobileHeader state={state} />
      <main className="px-4 pb-28 pt-4">
        {eventWaiting && (
          <button type="button" onClick={() => setTab("life")} className="mb-4 w-full rounded-full bg-mint-fill px-4 py-2.5 text-[13px] font-bold text-mint-ink">
            Something happened. Back to your life →
          </button>
        )}
        {tab === "life" && (
          <div className="space-y-6">
            <div className="panel px-5 py-6">
              <Board state={state} dispatch={dispatch} />
            </div>
            <section>
              <h2 className="eyebrow mb-2">Activity</h2>
              <ActivityLog state={state} limit={12} />
            </section>
          </div>
        )}
        {tab === "bags" && (
          <div className="space-y-4">
            <PortfolioSummary state={state} />
            <div className="panel px-3 py-2">
              <PositionsTable state={state} dispatch={dispatch} onSelect={setCoinId} />
            </div>
          </div>
        )}
        {tab === "market" && (
          <div className="panel -mx-1 py-3">
            <MarketList state={state} onSelect={setCoinId} />
          </div>
        )}
        {tab === "ct" && <CtPanel state={state} dispatch={dispatch} onPosted={() => setTab("life")} />}
        {tab === "me" && <CharacterPanel state={state} dispatch={dispatch} onExit={onExit} />}
        {tab === "story" && <Story state={state} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur" aria-label="Game sections">
        <ul className="mx-auto grid max-w-xl grid-cols-6 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1">
          {MOBILE_TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold ${tab === t.id ? "text-mint" : "text-muted"}`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
                {t.id === "life" && eventWaiting && <span className="absolute right-3 top-1 size-2 rounded-full bg-rose" aria-label="Event waiting" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {coinId && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setCoinId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order ticket"
            onClick={(e) => e.stopPropagation()}
            className="sheet-up max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-panel px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            <OrderTicket key={coinId} state={state} coinId={coinId} dispatch={dispatch} onClose={() => setCoinId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
