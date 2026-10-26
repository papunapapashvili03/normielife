import { useId } from "react";
import { money, pct } from "@/lib/game/format";
import type { RiskLevel } from "@/lib/game/types";

export function Delta({ value, className = "" }: { value: number; className?: string }) {
  const tone = value > 0.5 ? "text-mint" : value < -0.5 ? "text-rose" : "text-muted";
  return <span className={`num ${tone} ${className}`}>{money(value, { sign: true })}</span>;
}

export function PctTag({ value, className = "" }: { value: number; className?: string }) {
  const tone = value > 0.001 ? "text-mint" : value < -0.001 ? "text-rose" : "text-muted";
  return <span className={`num ${tone} ${className}`}>{pct(value)}</span>;
}

function pathFor(points: number[], w: number, h: number, pad = 2): string {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - pad - ((p - min) / span) * (h - pad * 2)).toFixed(1)}`)
    .join(" ");
}

export function Spark({ points, className = "" }: { points: number[]; className?: string }) {
  if (points.length < 2) return <svg className={className} viewBox="0 0 60 20" aria-hidden />;
  const up = points[points.length - 1] >= points[0];
  return (
    <svg className={className} viewBox="0 0 60 20" preserveAspectRatio="none" aria-hidden>
      <path d={pathFor(points, 60, 20)} fill="none" stroke={up ? "var(--mint)" : "var(--rose)"} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Small area chart for the order ticket. */
export function AreaChart({ points, className = "" }: { points: number[]; className?: string }) {
  const id = useId();
  const pts = points.length < 2 ? [1, 1] : points;
  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? "var(--mint)" : "var(--rose)";
  const line = pathFor(pts, 300, 100, 6);
  return (
    <svg className={className} viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={`${line} L300,100 L0,100 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const RISK: Record<RiskLevel | "unknown", { label: string; cls: string }> = {
  low: { label: "Low risk", cls: "bg-mint/10 text-mint" },
  medium: { label: "Medium risk", cls: "bg-amber/10 text-amber" },
  high: { label: "High risk", cls: "bg-rose/10 text-rose" },
  extreme: { label: "Extreme risk", cls: "bg-rose/20 text-rose" },
  unknown: { label: "Risk unknown", cls: "bg-raised text-muted" },
};

export function RiskBadge({ risk }: { risk: RiskLevel | "unknown" }) {
  const r = RISK[risk];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.cls}`}>{r.label}</span>;
}

/** Five little bars instead of fire emoji. */
export function Momentum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-label={`Momentum ${n} of 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-[3px] rounded-full ${i <= n ? "bg-mint" : "bg-line-strong"}`} style={{ height: 4 + i * 2 }} />
      ))}
    </span>
  );
}

export function StatBar({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  const v = Math.round(value);
  const color = v >= 65 ? "bg-mint" : v >= 35 ? "bg-amber" : "bg-rose";
  return (
    <div className={`grid items-center gap-3 ${compact ? "grid-cols-[6.5rem_1fr_1.75rem] text-[13px]" : "grid-cols-[8.5rem_1fr_2rem] text-sm"}`}>
      <span className="truncate text-muted">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, v)}%` }} />
      </div>
      <span className="num text-right text-text">{v}</span>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="num hidden min-w-5 rounded-md border border-line-strong px-1.5 py-0.5 text-center text-[11px] text-muted lg:inline-block">{children}</kbd>;
}

export const STAT_ROWS = [
  ["luck", "🍀 Luck"],
  ["intelligence", "🧠 Smarts"],
  ["risk", "🎰 Risk"],
  ["discipline", "🎯 Discipline"],
  ["charisma", "😎 Charisma"],
  ["knowledge", "🪙 Knowledge"],
] as const;
