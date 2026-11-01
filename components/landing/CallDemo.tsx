"use client";

import { useEffect, useRef, useState } from "react";
import { appById, IconArt, type AppId } from "@/components/game/phone/apps";
import { STARTING_CASH } from "@/lib/game/config";
import { money, pct } from "@/lib/game/format";
import { KOLS } from "@/lib/game/kols";

// A playable slice of the game: a KOL call, then either ignore it or go in and
// trade it live, deciding when (or whether) to sell before the day closes.

const STAKE = 500;
const TICK_MS = 320;
const CALLS = [
  { kol: "pepeprophet", ticker: "FROGCOIN", text: "$FROGCOIN is about to send. You've been warned.", close: 3.12 },
  { kol: "shillmaster", ticker: "MOONPUP", text: "Dev of $MOONPUP is legit. Talked to them for hours.", close: 0 },
  { kol: "0xsensei", ticker: "BASEDCAT", text: "$BASEDCAT chart is the cleanest thing I've seen all week.", close: 1.46 },
  { kol: "gurugainz", ticker: "GIGABRAIN", text: "If you're not in $GIGABRAIN by tonight, don't cry tomorrow.", close: 0.38 },
];
type Call = (typeof CALLS)[number];

type Answer = { text: string; tone: "good" | "bad" | "neutral" };
type Phase = { kind: "call" } | { kind: "live"; at: number } | { kind: "done"; answer: Answer };

/** The day's price path, as a multiple of the entry. Ends exactly at the close. */
function tradePath(close: number, seed: number, n = 44): number[] {
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const rug = close <= 0;
  const target = rug ? 1.7 : close;
  const pts = [1];
  for (let k = 1; k < n; k++) {
    const t = k / (n - 1);
    const lg = Math.log(target) * t + (Math.sin(Math.PI * t) * 0.18 + Math.sin(2 * Math.PI * t) * 0.12) + (k < n - 1 ? (rnd() - 0.5) * 0.16 : 0);
    pts.push(Math.exp(lg));
  }
  // A rug looks great right up until it doesn't.
  if (rug) [0.55, 0.22, 0.06, 0.01, 0].forEach((f, j) => (pts[n - 5 + j] = f && pts[n - 6] * f));
  return pts;
}

const moved = (close: number) => (close <= 0 ? "rugged to zero" : `closed the day ${pct(close - 1)}`);

function ignored(call: Call): Answer {
  if (call.close >= 1.2) return { text: `You ignored it. $${call.ticker} ${moved(call.close)}.`, tone: "bad" };
  if (call.close <= 0.8) return { text: `Dodged it. $${call.ticker} ${moved(call.close)}.`, tone: "good" };
  return { text: `$${call.ticker} went nowhere. You didn't miss much.`, tone: "neutral" };
}

function sold(call: Call, price: number, atClose: boolean): Answer {
  const pnl = Math.round(STAKE * price) - STAKE;
  const text = atClose
    ? `You held to the close. $${call.ticker} ${moved(call.close)}. ${money(pnl, { sign: true })}.`
    : `You sold at ${pct(price - 1)}, ${money(pnl, { sign: true })}. $${call.ticker} ${moved(call.close)}.`;
  return { text, tone: pnl >= 0 ? "good" : "bad" };
}

export function CallDemo() {
  const [i, setI] = useState(0);
  const [cash, setCash] = useState(STARTING_CASH);
  const [phase, setPhase] = useState<Phase>({ kind: "call" });
  const call = CALLS[i % CALLS.length];
  const kol = KOLS.find((k) => k.id === call.kol)!;
  const [path, setPath] = useState(() => tradePath(CALLS[0].close, 1));

  // The call's timer only starts once the phone is on screen, like in the game.
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const finish = (price: number, atClose: boolean) => {
    setCash((c) => c - STAKE + Math.round(STAKE * price));
    setPhase({ kind: "done", answer: sold(call, price, atClose) });
  };

  // Live: the chart ticks forward until you sell or the day closes.
  const live = phase.kind === "live" ? phase.at : -1;
  useEffect(() => {
    if (live < 0) return;
    if (live >= path.length - 1) {
      const id = window.setTimeout(() => finish(path[path.length - 1], true), TICK_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setPhase({ kind: "live", at: live + 1 }), TICK_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish reads the current call
  }, [live, path]);

  const next = () => {
    const n = i + 1;
    setI(n);
    setPath(tradePath(CALLS[n % CALLS.length].close, n + 1));
    setPhase({ kind: "call" });
  };

  return (
    <div ref={ref} className="mx-auto w-[300px] shrink-0 perspective-[1600px]">
      {/* Turned in toward the copy; straightens a little while you use it. */}
      <div className="group/tilt relative aspect-[390/760] transition-transform duration-500 ease-out transform-3d rotate-x-[4deg] rotate-y-[14deg] hover:rotate-x-[2deg] hover:rotate-y-[6deg] focus-within:rotate-y-[6deg] lg:rotate-y-[24deg] lg:rotate-x-[6deg]">
        {/* Edge layers behind the face give the phone its thickness. */}
        {[14, 10, 6, 2].map((d) => (
          <span key={d} className="absolute inset-0 rounded-[48px] bg-[#26262b]" style={{ transform: `translateZ(-${d}px)` }} aria-hidden />
        ))}
        <span className="absolute inset-0 rounded-[48px] shadow-[-40px_50px_70px_rgb(0_0_0/0.28)]" style={{ transform: "translateZ(-16px)" }} aria-hidden />

        <div className="relative h-full rounded-[48px] bg-[#0b0b0d] p-2.5 shadow-[inset_0_0_0_2px_#3a3a40]">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[38px] bg-[#cfebd5] px-3 [font-family:system-ui,-apple-system,'Segoe_UI',sans-serif]">
            <span className="absolute left-1/2 top-2 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
            <div className="relative z-20 flex h-10 shrink-0 items-end justify-between px-4 pb-1 text-[12px] font-semibold">
              <span>Mar · 19</span>
              <span className="opacity-60">wk {(i % 4) + 1}</span>
            </div>

            {/* Home screen. */}
            <div className="mt-[150px] rounded-[20px] bg-white/80 p-3.5" aria-live="polite">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Net worth</p>
              <p className="num mt-0.5 text-[26px] leading-none">{money(cash)}</p>
              <p className="mt-1 text-[11px] text-muted">🐸 Normie · started with {money(STARTING_CASH)}</p>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 px-1" aria-hidden>
              {HOME.map((id) => (
                <Icon key={id} id={id} />
              ))}
            </div>
            <div className="mt-auto pb-5" aria-hidden>
              <div className="age-btn mb-3 flex items-center justify-center gap-2 py-2.5 text-[14px] font-extrabold">🌙 Sleep</div>
              <div className="grid grid-cols-4 gap-2.5 rounded-[22px] bg-white/45 p-2.5">
                {DOCK.map((id) => (
                  <Icon key={id} id={id} />
                ))}
              </div>
            </div>

            {phase.kind === "live" && <LiveTrade call={call} path={path} at={phase.at} onSell={() => finish(path[phase.at], false)} onSkip={() => setPhase({ kind: "live", at: path.length - 1 })} />}

            {phase.kind === "done" && (
              <div
                key={`r${i}`}
                className={`banner-in absolute inset-x-2.5 top-12 z-20 rounded-2xl p-3 shadow-[0_10px_30px_rgb(0_0_0/0.18)] ring-1 ring-black/5 ${phase.answer.tone === "bad" ? "bg-[#fff1f3]" : phase.answer.tone === "good" ? "bg-[#ecfdf8]" : "bg-white"}`}
                role="status"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted">Chirp · how it played out</p>
                <p className="mt-0.5 text-[14px] font-semibold leading-snug">{phase.answer.text}</p>
                <button type="button" onClick={next} className="mt-2.5 w-full rounded-xl bg-text py-2 text-[13px] font-bold text-white">
                  Next call
                </button>
              </div>
            )}

            {phase.kind === "call" && (
              <div key={i} className="call-card banner-in absolute inset-x-2.5 top-12 z-20 overflow-hidden rounded-2xl bg-white shadow-[0_14px_36px_rgb(0_0_0/0.22)] ring-1 ring-black/5" role="group" aria-label={`${kol.handle} posted a call`}>
                <div className="flex items-start gap-2.5 p-3 pb-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1d9bf0]/10 text-lg" aria-hidden>
                    {kol.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-1.5 text-[11px]">
                      <span className="font-bold">{kol.name}</span>
                      <span className="truncate text-muted">{kol.handle}</span>
                    </p>
                    <p className="mt-0.5 text-[14px] font-semibold leading-snug">{call.text}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <button type="button" onClick={() => setPhase({ kind: "done", answer: ignored(call) })} className="rounded-xl bg-raised py-2 text-[13px] font-bold">
                    Ignore
                  </button>
                  <button type="button" onClick={() => setPhase({ kind: "live", at: 0 })} className="rounded-xl bg-mint-fill py-2 text-[13px] font-extrabold text-mint-ink">
                    Go in · {money(STAKE)}
                  </button>
                </div>
                <div className="h-1 bg-raised">{seen && <div className="countdown h-full bg-[#1d9bf0]" onAnimationEnd={() => setPhase({ kind: "done", answer: ignored(call) })} />}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Charts app with your position ticking live. Sell whenever, or ride it to the close. */
function LiveTrade({ call, path, at, onSell, onSkip }: { call: Call; path: number[]; at: number; onSell: () => void; onSkip: () => void }) {
  const price = path[at];
  const pnl = Math.round(STAKE * price) - STAKE;
  const up = price >= 1;
  const color = up ? "var(--mint)" : "var(--rose)";
  const W = 260;
  const H = 150;
  const shown = path.slice(0, at + 1);
  const lo = Math.min(...shown, 1) * 0.9;
  const hi = Math.max(...shown, 1) * 1.1;
  const x = (k: number) => (k / (path.length - 1)) * W;
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H - 16);
  const line = shown.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const charts = appById("charts");

  return (
    <div className="sheet-up absolute inset-x-0 bottom-0 top-10 z-10 flex flex-col bg-white px-4 pb-5 pt-3" role="group" aria-label={`Live trade: $${call.ticker}`}>
      <div className="flex items-center gap-2">
        <span className="relative size-6 overflow-hidden rounded-[7px]" style={{ background: charts.bg }} aria-hidden>
          <IconArt app={charts} size={24} />
        </span>
        <span className="text-[12px] font-semibold text-muted">Charts · live</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-rose">
          <span className="size-1.5 animate-pulse rounded-full bg-rose" aria-hidden /> LIVE
        </span>
      </div>
      <p className="mt-4 text-[13px] font-semibold text-muted">${call.ticker} · you&apos;re in {money(STAKE)}</p>
      <p className="num mt-1 text-[34px] leading-none" style={{ color }}>
        {money(pnl, { sign: true })}
      </p>
      <p className="num mt-1 text-[13px]" style={{ color }}>
        {pct(price - 1)}
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" aria-hidden>
        <rect x={x(at)} y="0" width={Math.max(0, W - x(at))} height={H} rx="8" fill="var(--raised)" />
        <line x1="0" x2={W} y1={y(1)} y2={y(1)} stroke="var(--line-strong)" strokeDasharray="3 4" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={x(at)} cy={y(price)} r="4" fill={color} />
      </svg>

      <div className="mt-auto grid gap-2">
        <button type="button" onClick={onSell} className={`rounded-xl py-3 text-[14px] font-extrabold ${up ? "bg-mint-fill text-mint-ink" : "bg-rose text-white"}`}>
          {up ? "Take profit" : "Cut losses"}
        </button>
        <button type="button" onClick={onSkip} className="rounded-xl bg-raised py-2.5 text-[13px] font-bold">
          Skip to the close
        </button>
      </div>
    </div>
  );
}

const HOME: AppId[] = ["mcjobs", "memories", "scanner", "settings"];
const DOCK: AppId[] = ["chirp", "charts", "bags", "bank"];

function Icon({ id }: { id: AppId }) {
  const app = appById(id);
  return (
    <span className="relative grid aspect-square place-items-center overflow-hidden rounded-[13px] shadow-[0_1px_4px_rgb(0_0_0/0.12)] ring-1 ring-black/5" style={{ background: app.bg }}>
      <IconArt app={app} size={52} />
    </span>
  );
}
