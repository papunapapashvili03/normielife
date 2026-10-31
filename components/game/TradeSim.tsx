"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { pct } from "@/lib/game/format";
import type { TradeSim } from "@/lib/game/types";

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
  const segStart = sim.live ? sim.revealed : sim.passed ? now : sim.legsRevealed >= 2 ? sim.legEnds[sim.legsRevealed - 2] : now;
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
