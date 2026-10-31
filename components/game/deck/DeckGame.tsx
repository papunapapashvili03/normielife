"use client";

import Link from "next/link";
import { useState, type Dispatch } from "react";
import { getCoin } from "@/lib/game/coins";
import { RETIRE_MIN_AGE, SIZE_BANDS, STATUSES } from "@/lib/game/config";
import { eventText, getEvent, render, visibleChoices } from "@/lib/game/events/engine";
import { money } from "@/lib/game/format";
import { ageOf, hasFlag } from "@/lib/game/history";
import { getPosition, netWorth, positionValue } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import { canHunt, stakeOptions, type SimAction } from "@/lib/game/tradesim";
import type { GameState, StatKey } from "@/lib/game/types";
import { CtPanel } from "../CtPanel";
import { ResultChips } from "../EventStage";
import { useIsDesktop } from "../hooks";
import { JobControls } from "../JobControls";
import { OrderTicket } from "../OrderTicket";
import { MODAL_EVENTS } from "../Overlays";
import { FullPortrait } from "../Portrait";
import { MONTHS, nextStatus } from "../progress";
import { GameOverlays, SKINS, useGameHotkeys, type GameProps } from "../shell";
import { Story } from "../Story";
import { SimChart } from "../TradeSim";
import { Card, CardBack, CoinCard, FRAME, HandCard } from "./Card";

type Side = "shop" | "bags" | "ct";

const STAT_SHORT: [StatKey, string][] = [
  ["luck", "LCK"],
  ["intelligence", "INT"],
  ["risk", "RSK"],
  ["discipline", "DSC"],
  ["charisma", "CHA"],
  ["knowledge", "KNW"],
];

const STATUS_FRAME: Record<string, string> = {
  normie: "#4d9d6a",
  degen: "#d4a017",
  trader: "#7c6cd6",
  chad: "#6b6b66",
  whale: "#2f86b8",
  legend: "#c9a227",
};

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function DeckGame({ state, dispatch, onExit }: GameProps) {
  const isDesktop = useIsDesktop();
  const [side, setSide] = useState<Side>("shop");
  const [inspect, setInspect] = useState<string | null>(null);
  const [showStory, setShowStory] = useState(false);
  useGameHotkeys(state, dispatch);

  const table = <Table state={state} dispatch={dispatch} onStory={() => setShowStory(true)} />;
  const sidePanel = <SidePanel state={state} dispatch={dispatch} side={side} setSide={setSide} onInspect={setInspect} />;

  return (
    <div className="min-h-dvh bg-[#1b2a31] text-white">
      <TopBar state={state} onExit={onExit} />
      {isDesktop ? (
        <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-[15rem_minmax(0,1fr)_20rem] gap-4 p-4 xl:grid-cols-[17.5rem_minmax(0,1fr)_23rem]">
          <aside className="scroll-thin min-h-0 space-y-4 overflow-y-auto pr-1" aria-label="Your character">
            <CharacterCard state={state} />
            <JobCard state={state} dispatch={dispatch} />
          </aside>
          <main className="min-h-0">{table}</main>
          <aside className="min-h-0" aria-label="Shop and bags">
            {sidePanel}
          </aside>
        </div>
      ) : (
        <div className="space-y-4 p-3 pb-10">
          {table}
          {sidePanel}
          <CharacterCard state={state} />
          <JobCard state={state} dispatch={dispatch} />
        </div>
      )}

      {inspect && getCoin(state, inspect) && (
        <Modal onClose={() => setInspect(null)} label="Inspect coin">
          <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
            <CoinCard coin={getCoin(state, inspect)!} held={heldPnl(state, inspect)} onOpen={() => undefined} />
            <div className="rounded-2xl bg-white p-4 text-text">
              <OrderTicket key={inspect} state={state} coinId={inspect} dispatch={dispatch} onClose={() => setInspect(null)} />
            </div>
          </div>
        </Modal>
      )}
      {showStory && (
        <Modal onClose={() => setShowStory(false)} label="Discard pile">
          <div className="max-h-[70dvh] overflow-y-auto rounded-2xl bg-white p-5 text-text">
            <h2 className="mb-3 text-2xl font-extrabold [font-family:var(--font-card)]">Your discard pile</h2>
            <Story state={state} />
          </div>
        </Modal>
      )}
      <GameOverlays state={state} dispatch={dispatch} />
    </div>
  );
}

function heldPnl(state: GameState, coinId: string): number | undefined {
  const p = getPosition(state, coinId);
  return p && p.cost > 0 ? positionValue(state, p) / p.cost - 1 : undefined;
}

// ---------------------------------------------------------------------------

function TopBar({ state, onExit }: { state: GameState; onExit: () => void }) {
  const st = STATUSES[state.status];
  return (
    <header className="flex h-14 items-center gap-4 border-b border-white/10 px-4">
      <span className="text-[19px] font-black tracking-tight [font-family:var(--font-card)]">
        Degen <span className="italic text-[#5eead4]">Deck</span>
      </span>
      <nav className="hidden items-center gap-1 text-[12px] font-semibold sm:flex" aria-label="Choose how to play">
        {SKINS.map((k) => (
          <Link key={k.id} href={k.href} aria-current={k.id === "deck" ? "page" : undefined} className={`rounded-full px-3 py-1 ${k.id === "deck" ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}>
            {k.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-5 text-right">
        <div className="hidden sm:block">
          <div className="text-[11px] text-white/55">
            {MONTHS[state.month % 12]} · Age {ageOf(state)}
          </div>
          <div className="text-[12px] font-bold">
            {st.emoji} {st.label}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-white/55">Cash</div>
          <div className="num text-[15px]">{money(state.cash)}</div>
        </div>
        <div>
          <div className="text-[11px] text-white/55">Net worth</div>
          <div className="num text-[15px] text-[#5eead4]">{money(netWorth(state))}</div>
        </div>
        <button type="button" onClick={onExit} className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/10">
          <span className="sm:hidden">Exit</span>
          <span className="hidden sm:inline">Save and exit</span>
        </button>
      </div>
    </header>
  );
}

function Zone({ label, children, className = "" }: { label: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[22px] border-[1.5px] border-dashed border-white/15 ${className}`}>
      <span className="absolute -top-2.5 left-4 bg-[#1b2a31] px-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">{label}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The table: deck, discard pile, the card in play, and your hand.
// ---------------------------------------------------------------------------

function Table({ state, dispatch, onStory }: { state: GameState; dispatch: Dispatch<Action>; onStory: () => void }) {
  const cur = state.current && !MODAL_EVENTS.has(state.current.id) ? state.current : null;
  const busy = !!state.current || !!state.sim;

  return (
    <div className="flex h-full flex-col gap-4 lg:min-h-[640px]">
      <Zone label="In play" className="flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-y-auto px-4 pb-4 pt-6">
        <div className="flex gap-4 self-start lg:absolute lg:left-4 lg:top-5">
          <button type="button" onClick={() => !busy && dispatch({ type: "NEXT_MONTH" })} disabled={busy} className="group relative h-28 w-20 disabled:cursor-default" aria-label="Draw a card (age up)">
            <CardBack className="absolute inset-0 translate-x-1.5 translate-y-1.5" />
            <CardBack className="absolute inset-0 translate-x-0.5 translate-y-0.5" />
            <CardBack className="absolute inset-0 transition-transform group-enabled:group-hover:-translate-y-1.5" label="DRAW" />
          </button>
          <button type="button" onClick={onStory} className="relative h-28 w-20 rounded-[16px] border-[1.5px] border-dashed border-white/20 text-center hover:border-white/40" aria-label="Open discard pile (your story)">
            <span className="block text-[22px]" aria-hidden>
              🪦
            </span>
            <span className="num block text-[15px]">{state.history.length}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/45">Discard</span>
          </button>
        </div>

        {state.sim ? <TradeInPlay state={state} dispatch={dispatch} /> : cur ? <EventInPlay state={state} dispatch={dispatch} /> : <IdleTable state={state} dispatch={dispatch} />}
      </Zone>
    </div>
  );
}

function IdleTable({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const last = state.log.slice(-3).reverse();
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/45">
        Month {state.month + 1} · {MONTHS[state.month % 12]} · Age {ageOf(state)}
      </p>
      <h2 className="mt-2 text-[34px] font-black leading-tight [font-family:var(--font-card)]">Your move.</h2>
      <p className="mt-1 max-w-sm text-[15px] text-white/65">Each card is a month of your life. Some are trades, some are texts from your mom.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => dispatch({ type: "NEXT_MONTH" })} className="rounded-full bg-[#5eead4] px-8 py-3.5 text-[16px] font-extrabold text-[#04201c] shadow-[0_10px_24px_rgb(94_234_212/0.25)] hover:brightness-105">
          Draw a card
        </button>
        {hasFlag(state, "discovered") && (
          <button type="button" disabled={!canHunt(state)} onClick={() => dispatch({ type: "HUNT_TRADE" })} className="rounded-full border border-white/25 px-6 py-3.5 text-[15px] font-bold hover:bg-white/10 disabled:opacity-35" title="One per month">
            Draw a trade card
          </button>
        )}
      </div>
      <p className="mt-3 text-[12px] text-white/40">Space draws too.</p>
      {last.length > 0 && (
        <ul className="mt-8 space-y-1 text-[13px] text-white/60">
          {last.map((l, i) => (
            <li key={i}>{l.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventInPlay({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const cur = state.current!;
  const ev = getEvent(cur.id)!;
  const frame = FRAME[ev.category];
  const result = cur.stage === "result" ? cur.result : undefined;
  const choices = visibleChoices(state, ev, cur.ctx);
  const picked = cur.choice !== undefined ? ev.choices[cur.choice] : undefined;
  const outcome = result ? FRAME[result.tone === "good" ? "outcome-good" : result.tone === "bad" ? "outcome-bad" : "outcome"] : null;

  return (
    <div className="flex w-full flex-col items-center gap-6 pt-6 lg:pt-28 xl:pt-10">
      <div className="flex flex-wrap items-start justify-center gap-5">
        <Card
          key={`${cur.id}-${state.month}`}
          className="deal w-[min(360px,100%)]"
          color={frame.color}
          title={sentence(ev.title)}
          cost={ev.emoji}
          type={`Event — ${frame.type}`}
          footer={
            <>
              <span>
                {MONTHS[state.month % 12]} · Age {ageOf(state)}
              </span>
              <span>#{state.run.events + 1}</span>
            </>
          }
        >
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{eventText(state, ev, cur.ctx)}</p>
        </Card>
        {result && outcome && (
          <Card
            className="flip-in w-[min(300px,100%)]"
            color={outcome.color}
            title={picked ? render(state, picked.text, cur.ctx) : "Outcome"}
            cost={result.tone === "good" ? "✨" : result.tone === "bad" ? "💥" : "🃏"}
            type={outcome.type}
          >
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{result.text}</p>
            <div className="mt-3 text-text">
              <ResultChips result={result} />
            </div>
          </Card>
        )}
      </div>

      {result ? (
        <button type="button" autoFocus onClick={() => dispatch({ type: "CONTINUE" })} className="rounded-full bg-white px-8 py-3 text-[15px] font-extrabold text-[#14161a] hover:bg-white/90">
          Discard and continue
        </button>
      ) : (
        <Hand>
          {choices.map(({ choice, index }, i) => (
            <HandCard key={index} index={i + 1} label={render(state, choice.text, cur.ctx)} onPlay={() => dispatch({ type: "CHOOSE", index })} tight={choices.length >= 4} angle={(i - (choices.length - 1) / 2) * 6} lift={Math.abs(i - (choices.length - 1) / 2) * 9} delay={300 + i * 70} />
          ))}
        </Hand>
      )}
    </div>
  );
}

function TradeInPlay({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const sim = state.sim!;
  const coin = getCoin(state, sim.coinId);
  const pos = getPosition(state, sim.coinId);
  const open = pos ? positionValue(state, pos) : 0;
  const latest = sim.notes.at(-1);
  const frame = FRAME.tradesim;

  return (
    <div className="flex w-full flex-col items-center gap-6 pt-6 lg:pt-28 xl:pt-10">
      <Card
        key={sim.coinId}
        className="deal w-[min(520px,100%)]"
        color={frame.color}
        title={coin ? `$${coin.ticker}` : "Trade"}
        cost="📊"
        type={`Day trade — ${sentence(sim.title)}`}
        art={
          <div className="bg-white p-2">
            <SimChart sim={sim} />
          </div>
        }
        footer={
          <>
            <span>
              {MONTHS[state.month % 12]} · Age {ageOf(state)}
            </span>
            {sim.entered && (
              <span className="num">
                Bag {money(open)} · in {money(sim.stake)}
              </span>
            )}
          </>
        }
      >
        {sim.phase === "setup" ? (
          <>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{sim.scene}</p>
            <p className="mt-2 text-[14px] italic text-black/60 [font-family:var(--font-card)]">{sim.read.replace("🧠 Your read: ", "“") + "”"}</p>
          </>
        ) : (
          <ul className="space-y-1.5">
            {sim.notes.map((n, i) => (
              <li key={i} className={`text-[14px] leading-snug ${n === latest ? "font-semibold" : "text-black/60"}`}>
                <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.12em] text-black/40">{n.label}</span>
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sim.phase === "setup" && (
        <Hand>
          {[...stakeOptions(state).map((o) => ({ key: o.band, label: `${SIZE_BANDS[o.band].emoji} ${SIZE_BANDS[o.band].label}`, sub: money(o.amount), danger: o.band === "fullsend", play: () => dispatch({ type: "SIM_ENTER", choice: o.band }) })), { key: "pass", label: "🙅 Pass", sub: "Watch it play out", danger: false, play: () => dispatch({ type: "SIM_ENTER", choice: "pass" }) }].map((c, i, arr) => (
            <HandCard key={c.key} index={i + 1} label={c.label} sub={c.sub} danger={c.danger} onPlay={c.play} tight={arr.length >= 4} angle={(i - (arr.length - 1) / 2) * 6} lift={Math.abs(i - (arr.length - 1) / 2) * 9} delay={300 + i * 70} />
          ))}
        </Hand>
      )}
      {sim.phase === "decide" && (
        <Hand>
          {(
            [
              ["sell", "💰 Take profit", `≈${money(open)}`],
              ["half", "✂️ Sell half", `Keep ${money(open / 2)}`],
              ["hold", "💎 Hold", "Let it ride"],
              ["add", "🚀 Add more", state.cash >= 20 ? "Double down" : "No cash"],
            ] as [SimAction, string, string][]
          ).map(([action, label, sub], i) => (
            <HandCard key={`${action}-${sim.legsRevealed}`} index={i + 1} label={label} sub={sub} onPlay={() => (action !== "add" || state.cash >= 20) && dispatch({ type: "SIM_DECIDE", action })} tight angle={(i - 1.5) * 6} lift={Math.abs(i - 1.5) * 9} delay={i * 60} />
          ))}
        </Hand>
      )}
      {sim.phase === "done" && (
        <button type="button" autoFocus onClick={() => dispatch({ type: "SIM_CLOSE" })} className="rounded-full bg-white px-8 py-3 text-[15px] font-extrabold text-[#14161a] hover:bg-white/90">
          Discard and continue
        </button>
      )}
    </div>
  );
}

function Hand({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Your hand · play a card</p>
      <div className="flex justify-center-safe overflow-x-auto px-6 pb-2 pt-8 [scrollbar-width:none]">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left column: your character card and the job card.
// ---------------------------------------------------------------------------

function CharacterCard({ state }: { state: GameState }) {
  const p = state.player;
  const st = STATUSES[state.status];
  const ns = nextStatus(state);
  return (
    <Card
      color={STATUS_FRAME[state.status]}
      title={p.name}
      cost={st.emoji}
      type={`${sentence(st.label)} — Age ${ageOf(state)}`}
      art={
        <div className="flex h-44 items-end justify-center overflow-hidden">
          <div className="h-[118%]">
            <FullPortrait id={p.avatar} />
          </div>
        </div>
      }
      footer={
        <>
          <span className="num">{money(netWorth(state))}</span>
          <span>{p.country}</span>
        </>
      }
    >
      <p className="text-[13px] italic leading-snug text-black/60 [font-family:var(--font-card)]">&ldquo;{st.quote}&rdquo;</p>
      <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
        {STAT_SHORT.map(([k, label]) => (
          <div key={k} className="rounded-md bg-black/[0.05] px-2 py-1 text-center">
            <dt className="text-[9px] font-bold tracking-[0.15em] text-black/45">{label}</dt>
            <dd className="num text-[15px]">{Math.round(p.stats[k])}</dd>
          </div>
        ))}
      </dl>
      {ns.label && (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#0d9488]" style={{ width: `${Math.max(3, ns.progress * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-black/55">Next: {ns.label}</p>
        </div>
      )}
    </Card>
  );
}

function JobCard({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  return (
    <Card color={FRAME.mcd.color} title="McDonald's" cost="🍟" type={state.job.employed ? "Job — On shift" : "Job — Now hiring"}>
      <div className="text-text">
        <JobControls state={state} dispatch={dispatch} />
      </div>
      {ageOf(state) >= RETIRE_MIN_AGE && (
        <button
          type="button"
          disabled={!!state.current || !!state.sim}
          onClick={() => {
            if (window.confirm("Retire? You'll cash out and live out the rest of your life. This ends the run.")) dispatch({ type: "RETIRE" });
          }}
          className="mt-2 w-full rounded-full border border-black/15 py-1.5 text-[12px] font-semibold text-black/60 hover:bg-black/5 disabled:opacity-40"
        >
          🏖️ Retire
        </button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column: the shop (market), your bags, and CT.
// ---------------------------------------------------------------------------

function SidePanel({ state, dispatch, side, setSide, onInspect }: { state: GameState; dispatch: Dispatch<Action>; side: Side; setSide: (s: Side) => void; onInspect: (id: string) => void }) {
  const discovered = hasFlag(state, "discovered");
  const shop = state.coins.filter((c) => !c.dead).sort((a, b) => a.ageMonths - b.ageMonths);
  const held = state.positions.map((p) => getCoin(state, p.coinId)).filter((c) => !!c);
  const graveyard = state.coins.filter((c) => (c.dead || c.rugged) && !getPosition(state, c.id));

  return (
    <Zone label="Table" className="flex h-full min-h-[480px] flex-col pt-4">
      <div className="mx-3 mt-1 grid grid-cols-3 rounded-full bg-black/25 p-1 text-[13px] font-semibold" role="tablist">
        {(
          [
            ["shop", "Shop"],
            ["bags", `Bags${held.length ? ` (${held.length})` : ""}`],
            ["ct", "CT"],
          ] as [Side, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={side === id} onClick={() => setSide(id)} className={`rounded-full py-1.5 ${side === id ? "bg-white text-[#14161a]" : "text-white/60 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        {side === "shop" &&
          (discovered ? (
            <div className="grid grid-cols-2 gap-3">
              {shop.map((c) => (
                <CoinCard key={c.id} coin={c} held={heldPnl(state, c.id)} onOpen={() => onInspect(c.id)} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-[14px] text-white/55">The shop opens once you discover crypto.</p>
          ))}
        {side === "bags" && (
          <>
            {held.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-white/55">No coins in your collection. Buy some from the shop.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {held.map((c) => (
                  <CoinCard key={c.id} coin={c} held={heldPnl(state, c.id)} onOpen={() => onInspect(c.id)} />
                ))}
              </div>
            )}
            {graveyard.length > 0 && (
              <>
                <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Graveyard · rarity revealed</p>
                <div className="grid grid-cols-2 gap-3 opacity-80">
                  {graveyard.slice(0, 6).map((c) => (
                    <CoinCard key={c.id} coin={c} onOpen={() => onInspect(c.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {side === "ct" && (
          <div className="rounded-2xl bg-white p-3 text-text">
            <CtPanel state={state} dispatch={dispatch} />
          </div>
        )}
      </div>
    </Zone>
  );
}

function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div className="fade-in fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/55 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} className="rise-in w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white hover:bg-white/25">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
