"use client";

import { useId, useLayoutEffect, useRef, useState, type Dispatch } from "react";
import { getCoin, marketCap } from "@/lib/game/coins";
import { SIZE_BANDS } from "@/lib/game/config";
import { money, pct } from "@/lib/game/format";
import { ageOf } from "@/lib/game/history";
import { getPosition, positionValue } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import { LEG_LABELS, stakeOptions, type SimAction } from "@/lib/game/tradesim";
import type { GameState, TradeSim } from "@/lib/game/types";
import { Kbd, PctTag } from "./bits";
import { MONTHS } from "./progress";

const PAD = { l: 4, r: 48, t: 14, b: 26 };
const CHART_TICKS = ["+1h", "Midday", "Close"];

/** Price chart that only ever scales to what has been revealed, so it can't leak the future. */
export function SimChart({ sim }: { sim: TradeSim }) {
  const gid = useId();
  const [box, width] = useWidth<HTMLDivElement>();
  const W = Math.max(280, width || 640);
  const H = Math.round(Math.min(260, Math.max(170, W * 0.36)));
  const n = sim.points.length;
  const shown = sim.points.slice(0, sim.revealed + 1);
  const lo = Math.min(...shown, 1) * 0.9;
  const hi = Math.max(...shown, 1) * 1.1;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = (from: number, to: number) =>
    sim.points
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  const now = sim.preLen - 1;
  const last = sim.points[sim.revealed];
  const up = last >= 1;
  const color = up ? "var(--mint)" : "var(--rose)";
  const segStart = sim.passed ? now : sim.legsRevealed >= 2 ? sim.legEnds[sim.legsRevealed - 2] : now;
  const hasFuture = sim.revealed > now;
  // Gridlines at the high, entry and low; drop any that would crowd the entry label.
  const grid = [hi / 1.1, 1, lo / 0.9].filter((v, i, a) => a.indexOf(v) === i && (v === 1 || Math.abs(y(v) - y(1)) > 16));
  const ticks: [number, string][] = [
    [0, "24h ago"],
    [now, "Now"],
    ...sim.legEnds.map((e, i): [number, string] => [e, CHART_TICKS[i]]),
  ];

  const narrow = W < 420;
  return (
    <div ref={box}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Price chart, ${pct(last - 1)} from entry`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {grid.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 1 ? "0" : "3 4"} />
          <text x={W - PAD.r + 6} y={y(v) + 4} fontSize="11" fill="var(--faint)" className="num">
            {v === 1 ? "0%" : pct(v - 1)}
          </text>
        </g>
      ))}

      {/* Unknown future */}
      {sim.phase !== "done" && (
        <g>
          <rect x={x(sim.revealed)} y={PAD.t} width={W - PAD.r - x(sim.revealed)} height={H - PAD.t - PAD.b} fill="var(--raised)" rx="8" />
          <text x={(x(sim.revealed) + W - PAD.r) / 2} y={(H - PAD.b + PAD.t) / 2 + 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--line-strong)">
            ?
          </text>
        </g>
      )}

      <line x1={x(now)} x2={x(now)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line-strong)" strokeDasharray="3 4" />

      {/* History before the decision */}
      <path d={path(0, now)} fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinejoin="round" />

      {hasFuture && (
        <>
          <path d={`${path(now, sim.revealed)} L${x(sim.revealed)},${H - PAD.b} L${x(now)},${H - PAD.b} Z`} fill={`url(#${gid})`} className="fade-in" />
          {segStart > now && <path d={path(now, segStart)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />}
          <path key={sim.revealed} d={path(segStart, sim.revealed)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" pathLength={1} className="draw" />
        </>
      )}

      {sim.entered && <circle cx={x(now)} cy={y(1)} r="5" fill="var(--panel)" stroke="var(--text)" strokeWidth="2" />}
      {sim.adds.map((i) => (
        <circle key={`a${i}`} cx={x(i)} cy={y(sim.points[i])} r="4.5" fill="var(--mint)" />
      ))}
      {sim.exits.map((i) => (
        <circle key={`e${i}`} cx={x(i)} cy={y(sim.points[i])} r="4.5" fill="var(--rose)" />
      ))}
      <circle cx={x(sim.revealed)} cy={y(last)} r="4" fill={hasFuture ? color : "var(--text)"} />

      {ticks.filter(([i]) => !narrow || i === 0 || i === now || i === n - 1).map(([i, label]) => (
        <text key={label} x={x(i)} y={H - 8} fontSize="11" fill={i === now ? "var(--text)" : "var(--faint)"} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontWeight={i === now ? 700 : 400}>
          {label}
        </text>
      ))}
    </svg>
    </div>
  );
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function TradeSimCard({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const sim = state.sim!;
  const coin = getCoin(state, sim.coinId);
  const pos = getPosition(state, sim.coinId);
  const open = pos ? positionValue(state, pos) : 0;
  const pnl = sim.realized + open - sim.stake;
  const last = sim.points[sim.revealed];
  const latest = sim.notes.at(-1);
  const when = `${MONTHS[state.month % 12]} · Age ${ageOf(state)}`;

  return (
    <article className="rise-in mx-auto w-full max-w-2xl" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-raised text-2xl" aria-hidden>
          📊
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold tracking-wide text-mint">TRADE SETUP · {sim.title}</p>
          <p className="text-xs text-muted">Day trade · {when}</p>
        </div>
        {coin && (
          <div className="text-right">
            <div className="text-lg font-extrabold">${coin.ticker}</div>
            <div className="text-xs text-muted">
              <span className="num">{money(marketCap(coin))}</span> · <PctTag value={last - 1} />
            </div>
          </div>
        )}
      </div>

      {sim.phase === "setup" && (
        <>
          <p className="mt-5 whitespace-pre-line text-[18px] leading-relaxed">{sim.scene}</p>
          <p className="mt-3 rounded-xl bg-raised px-3.5 py-2.5 text-[13px] text-muted">{sim.read}</p>
        </>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-panel p-3">
        <SimChart sim={sim} />
      </div>

      {sim.notes.length > 0 && (
        <ol className="mt-4 space-y-1.5">
          {sim.notes.map((note, i) => (
            <li
              key={i}
              className={`flex gap-3 rounded-xl px-3 py-2 text-[14px] ${i === sim.notes.length - 1 ? (note.tone === "good" ? "bg-mint/10" : note.tone === "bad" ? "bg-rose/10" : "bg-raised") : ""}`}
            >
              <span className="w-20 shrink-0 text-xs font-semibold text-muted">{note.label}</span>
              <span className={note.label === "Recap" ? "font-semibold" : ""}>{note.text}</span>
            </li>
          ))}
        </ol>
      )}

      {sim.phase === "setup" && <EntryChoices state={state} dispatch={dispatch} />}

      {sim.phase === "decide" && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between rounded-xl border border-line px-4 py-3">
            <span className="text-[13px] text-muted">Your bag</span>
            <span className="text-[15px]">
              <span className="num font-bold">{money(open)}</span>{" "}
              <PctTag value={sim.stake > 0 ? pnl / sim.stake : 0} className="text-[13px]" />
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{latest ? `${LEG_LABELS[sim.legsRevealed]} is next. What do you do?` : "What do you do?"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["sell", "💰 Take profit", `Sell all · ≈${money(open)}`],
                ["half", "✂️ Sell half", `Keep ${money(open / 2)} riding`],
                ["hold", "💎 Hold", "Let it play out"],
                ["add", "🚀 Add more", state.cash >= 20 ? "Double down" : "No cash left"],
              ] as [SimAction, string, string][]
            ).map(([action, label, sub], i) => (
              <button
                key={action}
                type="button"
                disabled={action === "add" && state.cash < 20}
                onClick={() => dispatch({ type: "SIM_DECIDE", action })}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-mint hover:bg-raised disabled:opacity-40"
              >
                <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-[11px] text-muted group-hover:border-mint group-hover:text-mint">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-bold">{label}</span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sim.phase === "done" && (
        <button type="button" autoFocus onClick={() => dispatch({ type: "SIM_CLOSE" })} className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-text py-3.5 text-[15px] font-bold text-bg hover:bg-text/85">
          Continue <Kbd>Space</Kbd>
        </button>
      )}
    </article>
  );
}

function EntryChoices({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const opts = stakeOptions(state);
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">How much do you put in?</p>
      <div className="mt-2 space-y-2">
        {opts.map((o, i) => {
          const b = SIZE_BANDS[o.band];
          return (
            <button
              key={o.band}
              type="button"
              onClick={() => dispatch({ type: "SIM_ENTER", choice: o.band })}
              className={`group flex w-full items-center gap-3 rounded-2xl border bg-panel px-4 py-3 text-left transition-colors hover:bg-raised ${o.band === "fullsend" ? "border-rose/30 hover:border-rose" : "border-line hover:border-mint"}`}
            >
              <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-[11px] text-muted group-hover:border-mint group-hover:text-mint">{i + 1}</span>
              <span className="flex-1 text-[15px] font-bold">
                {b.emoji} {b.label}
              </span>
              <span className="num text-[15px]">{money(o.amount)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => dispatch({ type: "SIM_ENTER", choice: "pass" })}
          className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-raised"
        >
          <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-[11px] text-muted">{opts.length + 1}</span>
          <span className="flex-1 text-[15px] font-bold">🙅 Pass</span>
          <span className="text-[13px] text-muted">Watch from the sidelines</span>
        </button>
      </div>
    </div>
  );
}
