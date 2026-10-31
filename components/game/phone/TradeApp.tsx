"use client";

import { useEffect, useState, type Dispatch } from "react";
import { getCoin, marketCap } from "@/lib/game/coins";
import { SIZE_BANDS } from "@/lib/game/config";
import { money, pct } from "@/lib/game/format";
import { KOLS } from "@/lib/game/kols";
import { getPosition, positionValue } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import { LEG_LABELS, stakeOptions, type SimAction } from "@/lib/game/tradesim";
import type { GameState, SizeBand } from "@/lib/game/types";
import { SimChart } from "../TradeSim";

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** The day trade, as a broker app: big number, chart, and an action bar pinned to the bottom. */
export function TradeApp({ state, dispatch, onBack }: { state: GameState; dispatch: Dispatch<Action>; onBack: () => void }) {
  const sim = state.sim;
  const coin = sim ? getCoin(state, sim.coinId) : undefined;
  if (!sim || !coin) return null;
  const pos = getPosition(state, sim.coinId);
  const open = pos ? positionValue(state, pos) : 0;
  const pnl = sim.realized + open - sim.stake;
  const move = sim.points[sim.revealed] - 1;
  const recap = sim.phase === "done" ? sim.notes.at(-1) : undefined;
  const live = sim.phase === "live";
  const caller = KOLS.find((k) => k.id === sim.kolId);

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <header className="flex items-center gap-1 px-2 py-2">
        <button type="button" onClick={onBack} className="rounded-full px-2 py-1 text-[22px] leading-none text-mint" aria-label="Back to home screen">
          ‹
        </button>
        <span className="text-[13px] font-semibold text-muted">Charts · Day trade</span>
        {live ? (
          <span className="ml-auto mr-2 flex items-center gap-1.5 rounded-full bg-rose/10 px-2.5 py-0.5 text-[11px] font-bold text-rose">
            <span className="size-1.5 animate-pulse rounded-full bg-rose" aria-hidden />
            LIVE
          </span>
        ) : (
          <span className="ml-auto mr-2 rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-semibold">{caller ? `Called by ${caller.handle}` : sentence(sim.title)}</span>
        )}
      </header>
      {live && <Ticker dispatch={dispatch} />}

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pt-1">
          <h2 className="text-[26px] font-extrabold leading-none tracking-tight">${coin.ticker}</h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="num text-[30px] leading-none">{money(marketCap(coin))}</span>
            <span className={`num text-[15px] ${move >= 0 ? "text-mint" : "text-rose"}`}>{pct(move)}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {live ? `Live · ${clock(sim)} · ${caller ? `called by ${caller.handle}` : "day trade"}` : sim.revealed === sim.preLen - 1 ? "Market cap right now" : `Since you were watching · ${LEG_LABELS[Math.max(0, sim.legsRevealed - 1)].toLowerCase()}`}
          </p>
        </div>

        <div className="mt-2 px-2">
          <SimChart sim={sim} />
        </div>

        {sim.entered && (
          <div className="mx-4 mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-raised p-3 text-center">
            <Stat label="Your bag" value={money(open)} />
            <Stat label="Put in" value={money(sim.stake)} />
            <Stat label="P&L" value={money(pnl, { sign: true })} tone={pnl >= 0 ? "text-mint" : "text-rose"} />
          </div>
        )}

        {sim.phase === "setup" ? (
          <div className="px-5 pb-5 pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">The setup</h3>
            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">{sim.scene}</p>
            <p className="mt-3 rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">{sim.read}</p>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Today</h3>
            <ol className="mt-2 space-y-2">
              {sim.notes
                .filter((n) => n !== recap)
                .map((n, i) => (
                  <li key={i} className="msg-in flex gap-3 text-[14px]">
                    <span className="w-[4.5rem] shrink-0 text-[12px] font-semibold text-muted">{n.label}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
            </ol>
          </div>
        )}
      </div>

      <footer className="border-t border-line bg-white px-4 pb-4 pt-3">
        {sim.phase === "setup" && <EntryBar key={sim.coinId} state={state} dispatch={dispatch} />}
        {sim.phase === "decide" && <DecideBar state={state} dispatch={dispatch} open={open} losing={pnl < 0} />}
        {live && <LiveBar state={state} dispatch={dispatch} open={open} losing={pnl < 0} />}
        {recap && (
          <>
            <p className={`mb-3 rounded-xl px-3 py-2 text-[14px] font-semibold ${recap.tone === "good" ? "bg-mint/10" : recap.tone === "bad" ? "bg-rose/10" : "bg-raised"}`}>{recap.text}</p>
            <button type="button" autoFocus onClick={() => dispatch({ type: "SIM_CLOSE" })} className="w-full rounded-full bg-text py-3 text-[15px] font-bold text-white">
              Done
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`num text-[14px] ${tone}`}>{value}</p>
    </div>
  );
}

function EntryBar({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const opts = stakeOptions(state);
  const [band, setBand] = useState<SizeBand | null>(opts.find((o) => o.band === "medium")?.band ?? opts[0]?.band ?? null);
  const chosen = opts.find((o) => o.band === band);
  return (
    <>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Bag size">
        {opts.map((o) => (
          <button
            key={o.band}
            type="button"
            role="radio"
            aria-checked={band === o.band}
            onClick={() => setBand(o.band)}
            className={`min-w-0 flex-1 rounded-xl border px-1 py-1.5 text-center ${band === o.band ? (o.band === "fullsend" ? "border-rose bg-rose/10" : "border-mint bg-mint/10") : "border-line"}`}
          >
            <span className="block truncate text-[11px] font-semibold">{SIZE_BANDS[o.band].label}</span>
            <span className="num block text-[12px]">{money(o.amount)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!chosen}
        onClick={() => chosen && dispatch({ type: "SIM_ENTER", choice: chosen.band })}
        className={`mt-3 w-full rounded-full py-3 text-[16px] font-extrabold disabled:opacity-40 ${band === "fullsend" ? "bg-rose text-white" : "bg-mint-fill text-mint-ink"}`}
      >
        {chosen ? `Buy ${money(chosen.amount)}` : "No cash to trade"}
      </button>
      <button type="button" onClick={() => dispatch({ type: "SIM_ENTER", choice: "pass" })} className="mt-1.5 w-full py-2 text-[14px] font-semibold text-muted">
        Pass and just watch
      </button>
    </>
  );
}

function DecideBar({ state, dispatch, open, losing }: { state: GameState; dispatch: Dispatch<Action>; open: number; losing: boolean }) {
  const sim = state.sim!;
  const act = (action: SimAction) => dispatch({ type: "SIM_DECIDE", action });
  return (
    <>
      <p className="mb-2 text-center text-[12px] text-muted">{LEG_LABELS[sim.legsRevealed]} is next. What do you do?</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => act("sell")} className="rounded-2xl bg-rose py-2.5 text-white">
          <span className="block text-[15px] font-extrabold">{losing ? "Cut losses" : "Take profit"}</span>
          <span className="num block text-[11px] opacity-85">Sell all · ≈{money(open)}</span>
        </button>
        <button type="button" onClick={() => act("hold")} className="rounded-2xl bg-text py-2.5 text-white">
          <span className="block text-[15px] font-extrabold">Hold</span>
          <span className="block text-[11px] opacity-75">Let it play out</span>
        </button>
        <button type="button" onClick={() => act("half")} className="rounded-2xl border border-line py-2.5">
          <span className="block text-[14px] font-bold">Sell half</span>
          <span className="num block text-[11px] text-muted">Keep {money(open / 2)}</span>
        </button>
        <button type="button" disabled={state.cash < 20} onClick={() => act("add")} className="rounded-2xl border border-line py-2.5 disabled:opacity-40">
          <span className="block text-[14px] font-bold">Add more</span>
          <span className="block text-[11px] text-muted">{state.cash >= 20 ? "Double down" : "No cash left"}</span>
        </button>
      </div>
    </>
  );
}

/** Drives the live chart: one price tick every ~third of a second while the trade is live. */
function Ticker({ dispatch }: { dispatch: Dispatch<Action> }) {
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "SIM_TICK" }), 320);
    return () => window.clearInterval(id);
  }, [dispatch]);
  return null;
}

/** Market clock for the trading day: 9:30 to 16:00. */
function clock(sim: NonNullable<GameState["sim"]>): string {
  const total = sim.points.length - sim.preLen;
  const done = Math.max(0, sim.revealed - (sim.preLen - 1));
  const minutes = 9 * 60 + 30 + Math.round((done / total) * 390);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function LiveBar({ state, dispatch, open, losing }: { state: GameState; dispatch: Dispatch<Action>; open: number; losing: boolean }) {
  const holding = open > 0.5;
  return (
    <>
      <p className="mb-2 text-center text-[12px] text-muted">{holding ? "The price is moving. Get out whenever you want." : "You're out. Watch how the day ends, or skip ahead."}</p>
      {holding ? (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => dispatch({ type: "SIM_LIVE", action: "sell" })} className="col-span-3 rounded-2xl bg-rose py-3 text-white">
            <span className="block text-[16px] font-extrabold">{losing ? "Cut losses" : "Take profit"}</span>
            <span className="num block text-[11px] opacity-85">Sell all · ≈{money(open)}</span>
          </button>
          <button type="button" onClick={() => dispatch({ type: "SIM_LIVE", action: "half" })} className="col-span-2 rounded-2xl border border-line py-2.5 text-[14px] font-bold">
            Sell half
          </button>
          <button type="button" disabled={state.cash < 20} onClick={() => dispatch({ type: "SIM_LIVE", action: "add" })} className="rounded-2xl border border-line py-2.5 text-[14px] font-bold disabled:opacity-40">
            Add
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => dispatch({ type: "SIM_SKIP" })} className="w-full rounded-full bg-text py-3 text-[15px] font-bold text-white">
          Skip to the close
        </button>
      )}
    </>
  );
}
