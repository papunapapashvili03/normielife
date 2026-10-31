import { NARRATIVE_LABEL, lastChange, marketCap } from "@/lib/game/coins";
import { money, pct } from "@/lib/game/format";
import type { Coin, CoinFate, EventCategory } from "@/lib/game/types";
import { Spark } from "../bits";

/** Card frame colour = the card's type, like a trading card game. */
export const FRAME: Record<EventCategory | "tradesim" | "outcome-good" | "outcome-bad" | "outcome", { color: string; type: string }> = {
  onboarding: { color: "#0ea5e9", type: "Origin" },
  crypto: { color: "#0d9488", type: "Crypto" },
  trade: { color: "#2563eb", type: "Your bags" },
  kol: { color: "#7c3aed", type: "Crypto Twitter" },
  life: { color: "#e2725b", type: "Life" },
  mcd: { color: "#da291c", type: "McDonald's" },
  social: { color: "#db2777", type: "Social" },
  legendary: { color: "#c9a227", type: "Legendary" },
  system: { color: "#4b5563", type: "Life" },
  tradesim: { color: "#059669", type: "Day trade" },
  "outcome-good": { color: "#0d9488", type: "Outcome" },
  "outcome-bad": { color: "#e11d48", type: "Outcome" },
  outcome: { color: "#64748b", type: "Outcome" },
};

export const RARITY: Record<CoinFate, { label: string; short: string; color: string }> = {
  rug: { label: "Cursed", short: "✕", color: "#b91c1c" },
  bleed: { label: "Common", short: "C", color: "#6b7280" },
  chop: { label: "Common", short: "C", color: "#6b7280" },
  pump: { label: "Uncommon", short: "U", color: "#0d9488" },
  moon: { label: "Rare", short: "R", color: "#2563eb" },
  mega: { label: "Mythic", short: "M", color: "#c2410c" },
  legendary: { label: "Legendary", short: "L", color: "#c9a227" },
};

export function Card({
  color,
  title,
  cost,
  type,
  art,
  children,
  footer,
  className = "",
  style,
  compact = false,
}: {
  compact?: boolean;
  color: string;
  title: React.ReactNode;
  cost?: React.ReactNode;
  type: string;
  art?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-[18px] p-[7px] shadow-[0_18px_34px_rgb(0_0_0/0.38)] ring-1 ring-black/25 ${className}`} style={{ background: color, ...style }}>
      <div className="flex h-full flex-col overflow-hidden rounded-[12px] bg-white text-[#14161a]">
        <div className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-2">
          <h3 className={`min-w-0 font-extrabold leading-tight [font-family:var(--font-card)] ${compact ? "truncate text-[14px]" : "truncate text-[17px]"}`}>{title}</h3>
          {cost !== undefined && (
            <span className={`grid shrink-0 place-items-center rounded-full ring-2 ring-white ${compact ? "size-6 text-[13px]" : "size-8 text-[17px]"}`} style={{ background: `color-mix(in oklab, ${color} 22%, white)` }} aria-hidden>
              {cost}
            </span>
          )}
        </div>
        {art && (
          <div className="mx-2 overflow-hidden rounded-lg" style={{ background: `color-mix(in oklab, ${color} 13%, white)` }}>
            {art}
          </div>
        )}
        <p className="mx-2 mt-2 border-y border-black/10 px-1 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55">{type}</p>
        <div className="flex-1 px-3 py-2.5">{children}</div>
        {footer && <div className="flex items-center justify-between border-t border-black/10 px-3 py-1.5 text-[11px] text-black/55">{footer}</div>}
      </div>
    </div>
  );
}

export function CardBack({ className = "", label }: { className?: string; label?: string }) {
  return (
    <div className={`card-back grid place-items-center rounded-[16px] shadow-[0_10px_24px_rgb(0_0_0/0.35)] ring-1 ring-white/10 ${className}`}>
      <span className="rounded-full border border-[#5eead4]/50 bg-[#12212a] px-3 py-1 text-[11px] font-extrabold tracking-[0.25em] text-[#5eead4] [font-family:var(--font-card)]">
        {label ?? "DEGEN"}
      </span>
    </div>
  );
}

/** A choice you can play from your hand. */
export function HandCard({
  index,
  label,
  sub,
  danger,
  onPlay,
  angle = 0,
  lift = 0,
  delay = 0,
  tight = false,
}: {
  tight?: boolean;
  index: number;
  label: React.ReactNode;
  sub?: string;
  danger?: boolean;
  onPlay: () => void;
  angle?: number;
  lift?: number;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      style={{ "--r": `${angle}deg`, "--y": `${lift}px`, animationDelay: `${delay}ms` } as React.CSSProperties}
      className={`rise-in group relative h-[164px] w-[112px] first:ml-0 last:mr-0 sm:h-[184px] sm:w-[128px] ${tight ? "-mx-5" : "-mx-3"} shrink-0 origin-bottom rounded-[16px] bg-[#14161a] p-[5px] text-left shadow-[0_12px_24px_rgb(0_0_0/0.35)] ring-1 ring-black/30 transition-[rotate,translate,scale] duration-200 [rotate:var(--r)] [translate:0_var(--y)] hover:z-10 hover:scale-105 hover:[rotate:0deg] hover:[translate:0_-22px] focus-visible:z-10 focus-visible:[rotate:0deg] focus-visible:[translate:0_-22px]`}
      aria-label={typeof label === "string" ? `Play: ${label}` : undefined}
    >
      <span className={`flex h-full flex-col rounded-[11px] bg-white px-3 pb-2 pt-2.5 ${danger ? "ring-2 ring-inset ring-[#e11d48]/60" : ""}`}>
        <span className="num grid size-6 place-items-center rounded-full bg-[#14161a] text-[11px] text-white">{index}</span>
        <span className="mt-2 flex-1 text-[14px] font-semibold leading-snug text-[#14161a] [font-family:var(--font-card)] sm:text-[15px]">{label}</span>
        {sub && <span className="text-[11px] text-black/55">{sub}</span>}
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/35 group-hover:text-[#0d9488]">Play</span>
      </span>
    </button>
  );
}

export function CoinCard({ coin, held, onOpen }: { coin: Coin; held?: number; onOpen: () => void }) {
  const revealed = coin.dead || coin.rugged;
  const rarity = RARITY[coin.fate];
  const frame = revealed ? rarity.color : "#334155";
  const narrative = NARRATIVE_LABEL[coin.narrative];
  const [emoji, ...kind] = narrative.split(" ");
  return (
    <button type="button" onClick={onOpen} className="block w-full text-left transition-transform hover:-translate-y-1">
      <Card
        compact
        color={frame}
        title={`$${coin.ticker}`}
        type={revealed ? `${rarity.label} · ${coin.rugged ? "Rugged" : "Dead"}` : `Coin — ${kind.join(" ")}`}
        art={
          <div className="relative h-20">
            <span className="absolute left-2 top-1 text-[38px]" aria-hidden>
              {emoji}
            </span>
            {revealed ? (
              <span key="r" className="rarity-pop absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white text-[13px] font-black ring-2" style={{ color: rarity.color, ["--tw-ring-color" as string]: rarity.color }} title={rarity.label}>
                {rarity.short}
              </span>
            ) : (
              <span className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white text-[13px] font-black text-black/35 ring-1 ring-black/10" title="Rarity hidden until this coin dies">
                ?
              </span>
            )}
            <Spark points={coin.spark} className="absolute inset-x-2 bottom-2 h-8 w-[calc(100%-1rem)]" />
          </div>
        }
        footer={
          <>
            <span className="num">{money(marketCap(coin))}</span>
            {coin.ageMonths > 0 ? <span className={`num ${lastChange(coin) >= 0 ? "text-[#0d9488]" : "text-[#e11d48]"}`}>{pct(lastChange(coin))}</span> : <span>New</span>}
          </>
        }
      >
        {held !== undefined ? (
          <p className="text-[12px]">
            Held · <span className={`num font-semibold ${held >= 0 ? "text-[#0d9488]" : "text-[#e11d48]"}`}>{pct(held)}</span>
          </p>
        ) : (
          <p className="line-clamp-2 text-[12px] leading-snug text-black/60">{coin.name}. By {coin.creator}.</p>
        )}
      </Card>
    </button>
  );
}
