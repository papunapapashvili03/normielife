"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { JOB, RETIRE_MIN_AGE, STATUSES } from "@/lib/game/config";
import { canCall } from "@/lib/game/calls";
import { currentMood } from "@/lib/game/mood";
import { getCoin, marketCap } from "@/lib/game/coins";
import { eventText, getEvent } from "@/lib/game/events/engine";
import { compact, money } from "@/lib/game/format";
import { ageOf, hasFlag } from "@/lib/game/history";
import { salary } from "@/lib/game/job";
import { expenses } from "@/lib/game/life";
import { KOLS, kolReadLine } from "@/lib/game/kols";
import { netWorth, portfolioValue } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import { canHunt } from "@/lib/game/tradesim";
import type { GameState, LogEntry, StatusId } from "@/lib/game/types";
import { CharacterPanel } from "../CharacterPanel";
import { CtPanel } from "../CtPanel";
import { CATEGORY } from "../EventStage";
import { useIsDesktop } from "../hooks";
import { JobControls } from "../JobControls";
import { MarketList } from "../Market";
import { OrderTicket } from "../OrderTicket";
import { MODAL_EVENTS } from "../Overlays";
import { FullPortrait } from "../Portrait";
import { ActivityLog, PortfolioSummary, PositionsTable } from "../Positions";
import { MONTHS, nextStatus } from "../progress";
import { GameOverlays, useGameHotkeys, type GameProps } from "../shell";
import { Story } from "../Story";
import { Thread } from "./Thread";
import { TradeApp } from "./TradeApp";

type AppId = "charts" | "bags" | "chirp" | "bank" | "mcjobs" | "memories" | "me" | "scanner" | "settings";
type Screen = { kind: "lock" } | { kind: "home" } | { kind: "event" } | { kind: "trade" } | { kind: "app"; app: AppId; coinId?: string };

type PhoneApp = { id: AppId; name: string; glyph: string; bg: string; img?: string };

/** Icons live in public/apps. `bg` matches each icon's background so the launch splash blends in. */
const APPS: PhoneApp[] = [
  { id: "charts", name: "Charts", glyph: "📈", bg: "#ccff00", img: "/apps/robinhood.png" },
  { id: "bags", name: "Bags", glyph: "👜", bg: "#9786e4", img: "/apps/phantom.jpg" },
  { id: "chirp", name: "Chirp", glyph: "🐦", bg: "#000000", img: "/apps/X.jpg" },
  { id: "bank", name: "Bank", glyph: "🏦", bg: "#ffffff", img: "/apps/Revolut.png" },
  { id: "mcjobs", name: "McJobs", glyph: "🍟", bg: "#ffffff", img: "/apps/mcdonalds.png" },
  { id: "memories", name: "Memories", glyph: "🖼️", bg: "#ffffff" },
  { id: "scanner", name: "Scanner", glyph: "🔭", bg: "#212121", img: "/apps/tokensniffer.jpg" },
  { id: "me", name: "Me", glyph: "🪪", bg: "#e9e5ff" },
  { id: "settings", name: "Settings", glyph: "⚙️", bg: "#d4d7de", img: "/apps/settings.jpg" },
];
const appById = (id: AppId) => APPS.find((a) => a.id === id)!;

/** An app's icon art: the image if there is one, otherwise its emoji. */
function IconArt({ app, size }: { app: PhoneApp; size: number }) {
  if (app.img) return <Image src={app.img} alt="" fill sizes={`${size}px`} className="object-cover" />;
  return (
    <span aria-hidden style={{ fontSize: size * 0.5 }}>
      {app.glyph}
    </span>
  );
}
const DOCK: AppId[] = ["chirp", "charts", "bags", "bank"];

/** The wallpaper is your status. */
const WALLPAPER: Record<StatusId, string> = {
  normie: "#cfebd5",
  degen: "#ffe27a",
  trader: "#dcd3ff",
  chad: "#d9d6ce",
  whale: "#bfe3f5",
  legend: "#f4ce5b",
};

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function PhoneGame({ state, dispatch, onExit }: GameProps) {
  const isDesktop = useIsDesktop();
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [seenMonth, setSeenMonth] = useState(state.month);
  const [sleptFrom, setSleptFrom] = useState(state.month);

  // Time passed while the phone was down: wake up on the lock screen.
  if (state.month !== seenMonth) {
    setSleptFrom(seenMonth);
    setSeenMonth(state.month);
    setScreen({ kind: "lock" });
  }

  useGameHotkeys(state, dispatch);

  const phone = <PhoneScreen state={state} dispatch={dispatch} onExit={onExit} screen={screen} setScreen={setScreen} sleptFrom={sleptFrom} framed={isDesktop} />;

  if (!isDesktop) {
    return (
      <div className="h-dvh">
        {phone}
        <GameOverlays state={state} dispatch={dispatch} />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh items-center justify-center gap-10 overflow-hidden bg-[#d9d6cf] px-8">
      <div className="flex w-64 flex-col items-center gap-10">
        <PhotoFrame state={state} />
        <StickyNote state={state} />
      </div>
      <div className="relative aspect-[390/844] h-[min(860px,calc(100dvh-3rem))] rounded-[54px] bg-[#0b0b0d] p-3 shadow-[0_30px_60px_rgb(0_0_0/0.28),inset_0_0_0_2px_#2b2b30]">
        <div className="relative h-full overflow-hidden rounded-[42px] bg-white">
          <span className="absolute left-1/2 top-2.5 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-black" aria-hidden />
          {phone}
        </div>
      </div>
      <div className="flex w-64 flex-col items-center gap-8">
        {state.job.employed && <NameTag name={state.player.name} />}
        <Receipt state={state} />
      </div>
      <GameOverlays state={state} dispatch={dispatch} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The phone
// ---------------------------------------------------------------------------

type ScreenProps = GameProps & {
  screen: Screen;
  /** `from` is the element tapped, so apps can zoom out of it like on iOS. */
  setScreen: (s: Screen, from?: Element | null) => void;
  sleptFrom: number;
  framed: boolean;
};

function pending(state: GameState): { emoji: string; app: string; title: string; body: string; open: Screen } | null {
  if (state.sim) {
    return { emoji: "📊", app: "Charts", title: `Trade setup · ${sentence(state.sim.title)}`, body: state.sim.scene.split("\n")[0], open: { kind: "trade" } };
  }
  const cur = state.current;
  if (!cur || MODAL_EVENTS.has(cur.id)) return null;
  const ev = getEvent(cur.id);
  if (!ev) return null;
  return { emoji: ev.emoji, app: CATEGORY[ev.category], title: sentence(ev.title), body: eventText(state, ev, cur.ctx).split(/\n{2,}/)[0], open: { kind: "event" } };
}

type Origin = { x: number; y: number; w: number; h: number; rw: number; rh: number; bg: string; glyph: string; img?: string };

const isLayer = (s: Screen) => s.kind === "app" || s.kind === "event" || s.kind === "trade";

/** What the app looks like as an icon, for the zoom splash. */
function layerLook(s: Screen, state: GameState): { bg: string; glyph: string; img?: string } {
  if (s.kind === "app") {
    const a = appById(s.app);
    return { bg: a.bg, glyph: a.glyph, img: a.img };
  }
  if (s.kind === "trade") {
    const a = appById("charts");
    return { bg: a.bg, glyph: a.glyph, img: a.img };
  }
  const ev = state.current ? getEvent(state.current.id) : undefined;
  return { bg: "#ffffff", glyph: ev?.emoji ?? "💬" };
}

function PhoneScreen(p: ScreenProps) {
  const { state, screen } = p;
  const rootRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [closing, setClosing] = useState(false);
  const layerOpen = isLayer(screen);

  // A resolved event or finished trade closes itself back into the home screen.
  const resolved = (screen.kind === "event" && !state.current) || (screen.kind === "trade" && !state.sim);
  if (resolved && !closing) setClosing(true);
  if (!layerOpen && closing) setClosing(false);

  const go = (next: Screen, from?: Element | null) => {
    if (closing) return;
    if (isLayer(next) && !layerOpen) {
      const root = rootRef.current?.getBoundingClientRect();
      const r = from?.getBoundingClientRect();
      const look = layerLook(next, state);
      setOrigin(
        root && root.width
          ? r
            ? { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height, rw: root.width, rh: root.height, ...look }
            : { x: root.width * 0.35, y: root.height * 0.4, w: root.width * 0.3, h: root.width * 0.3, rw: root.width, rh: root.height, ...look }
          : null,
      );
      p.setScreen(next);
      return;
    }
    if (next.kind === "home" && layerOpen) {
      setClosing(true); // the app shrinks back into its icon, then we land on home
      return;
    }
    p.setScreen(next);
  };
  const q: ScreenProps = { ...p, setScreen: go };

  // Non-stop: while you're on your phone, famous traders keep posting calls.
  const callable = canCall(state) && screen.kind !== "lock";
  const { dispatch } = p;
  useEffect(() => {
    if (!callable) return;
    let id = 0;
    const schedule = () => {
      id = window.setTimeout(() => {
        // Nobody posts to an empty room: hold calls while the tab is in the background.
        if (document.hidden) schedule();
        else dispatch({ type: "CALL_PING" });
      }, 3500 + Math.random() * 4500);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [callable, dispatch]);

  const waiting = pending(state);
  const dark = screen.kind === "lock";
  const banner = waiting && screen.kind !== "lock" && screen.kind !== "event" && screen.kind !== "trade";
  const home = () => go({ kind: "home" });
  const vars = origin
    ? ({ "--ox": `${origin.x}px`, "--oy": `${origin.y}px`, "--sx": origin.w / origin.rw, "--sy": origin.h / origin.rh } as React.CSSProperties)
    : undefined;

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-hidden bg-white text-text [font-family:system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <StatusBar state={state} light={dark} framed={p.framed} />
      {banner && (
        <button
          key={`${waiting.title}-${state.month}`}
          type="button"
          onClick={(e) => go(waiting.open, e.currentTarget)}
          className="banner-peek absolute inset-x-2 top-12 z-20 flex items-start gap-3 rounded-2xl bg-white/95 p-3 text-left shadow-[0_10px_30px_rgb(0_0_0/0.18)] ring-1 ring-black/5"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised text-lg" aria-hidden>
            {waiting.emoji}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
              {waiting.app} <span className="normal-case">now</span>
            </span>
            <span className="block truncate text-[14px] font-semibold">{waiting.title}</span>
            <span className="line-clamp-2 text-[13px] text-muted">{waiting.body}</span>
          </span>
        </button>
      )}
      {state.offer && screen.kind !== "lock" && <CallCard key={state.offer.id} state={state} dispatch={p.dispatch} onGoIn={(el) => go({ kind: "trade" }, el)} />}
      {!state.offer && state.callResult && screen.kind !== "lock" && (
        <div
          key={`r${state.callResult.id}`}
          className={`banner-peek absolute inset-x-2 top-12 z-20 flex items-start gap-3 rounded-2xl p-3 shadow-[0_10px_30px_rgb(0_0_0/0.18)] ring-1 ring-black/5 ${state.callResult.tone === "bad" ? "bg-[#fff1f3]" : state.callResult.tone === "good" ? "bg-[#ecfdf8]" : "bg-white/95"}`}
          role="status"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-lg" aria-hidden>
            {state.callResult.tone === "bad" ? "😭" : state.callResult.tone === "good" ? "😮‍💨" : "🤷"}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide text-muted">Chirp · how it played out</span>
            <span className="block text-[14px] font-semibold leading-snug">{state.callResult.text}</span>
          </span>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {screen.kind === "lock" ? (
          <LockScreen {...q} />
        ) : (
          <div inert={layerOpen && !closing} className={`absolute inset-0 transition-[scale,filter] duration-[380ms] ease-out ${layerOpen && !closing ? "scale-[0.92] brightness-[0.8]" : ""}`}>
            <HomeScreen {...q} />
          </div>
        )}
      </div>

      {layerOpen && (
        <div
          className={`absolute inset-0 overflow-hidden bg-white ${closing ? "app-close" : "app-open"}`}
          style={vars}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && e.animationName === "app-close") {
              setClosing(false);
              p.setScreen({ kind: "home" });
            }
          }}
        >
          <div className="flex h-full flex-col pt-11">
            <div className="relative min-h-0 flex-1">
              {screen.kind === "event" && <Thread state={state} dispatch={p.dispatch} onBack={home} />}
              {screen.kind === "trade" && <TradeApp state={state} dispatch={p.dispatch} onBack={home} />}
              {screen.kind === "app" && <AppView {...q} app={screen.app} coinId={screen.coinId} />}
            </div>
          </div>
          {origin && (
            <div className={`pointer-events-none absolute inset-0 grid place-items-center text-[72px] ${closing ? "splash-in" : "splash-out"}`} style={{ background: origin.bg }} aria-hidden>
              {origin.img ? (
                <span className="relative size-28 overflow-hidden rounded-[28px]">
                  <Image src={origin.img} alt="" fill sizes="112px" className="object-cover" />
                </span>
              ) : (
                origin.glyph
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A famous trader just posted a coin. Go in, or ignore it before the bar runs out. */
function CallCard({ state, dispatch, onGoIn }: { state: GameState; dispatch: Dispatch<Action>; onGoIn: (el: Element) => void }) {
  const offer = state.offer!;
  const kol = KOLS.find((k) => k.id === offer.kolId);
  const coin = getCoin(state, offer.sim.coinId);
  const read = kol ? kolReadLine(state, kol) : "";
  return (
    <div className="call-card banner-in absolute inset-x-2 top-12 z-30 overflow-hidden rounded-2xl bg-white shadow-[0_14px_36px_rgb(0_0_0/0.22)] ring-1 ring-black/5" role="alertdialog" aria-label={`${kol?.handle ?? "A KOL"} posted a call`}>
      <div className="flex items-start gap-3 p-3 pb-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1d9bf0]/10 text-xl" aria-hidden>
          {kol?.avatar ?? "🐦"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5 text-[12px]">
            <span className="font-bold">{kol?.name ?? "Someone"}</span>
            <span className="truncate text-muted">{kol?.handle}</span>
            <span className="ml-auto shrink-0 text-muted">now</span>
          </p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug">{offer.text}</p>
          {coin && (
            <p className="num mt-1 text-[12px] text-muted">
              ${coin.ticker} · MC {money(marketCap(coin))}
            </p>
          )}
          {read && <p className="mt-1 text-[12px] font-semibold text-mint">{read.replace("🧠 Your read: ", "🧠 ")}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <button type="button" onClick={() => dispatch({ type: "CALL_IGNORE" })} className="rounded-xl bg-raised py-2.5 text-[14px] font-bold">
          Ignore
        </button>
        <button
          type="button"
          onClick={(e) => {
            const card = e.currentTarget.closest(".call-card");
            dispatch({ type: "CALL_GO_IN" });
            onGoIn(card ?? e.currentTarget);
          }}
          className="rounded-xl bg-mint-fill py-2.5 text-[14px] font-extrabold text-mint-ink"
        >
          Go in
        </button>
      </div>
      <div className="h-1 bg-raised">
        <div className="countdown h-full bg-[#1d9bf0]" onAnimationEnd={() => dispatch({ type: "CALL_IGNORE" })} />
      </div>
    </div>
  );
}

function StatusBar({ state, light, framed }: { state: GameState; light: boolean; framed: boolean }) {
  const battery = Math.min(1, state.cash / 5000);
  const bars = Math.min(4, 1 + Math.floor(Math.log10(Math.max(1, state.followers)) / 1.5));
  const ink = light ? "text-white" : "text-text";
  return (
    <div className={`relative z-10 flex h-11 shrink-0 items-end justify-between px-7 pb-1.5 text-[13px] font-semibold ${ink} ${framed ? "" : "pt-2"}`}>
      <span>
        {MONTHS[state.month % 12]} <span className="opacity-60">wk {(state.week ?? 0) + 1}</span> · {ageOf(state)}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]" title={`${compact(state.followers)} followers`} aria-label={`Signal: ${bars} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`w-[3px] rounded-sm ${i <= bars ? (light ? "bg-white" : "bg-text") : light ? "bg-white/35" : "bg-text/25"}`} style={{ height: 3 + i * 2 }} />
          ))}
        </span>
        <span className="flex items-center" title={`Cash ${money(state.cash)}`} aria-label={`Battery ${Math.round(battery * 100)}%`}>
          <span className={`relative h-[11px] w-[22px] rounded-[3px] border ${light ? "border-white/70" : "border-text/50"}`}>
            <span className={`absolute inset-[1.5px] rounded-[1.5px] ${battery < 0.2 ? "bg-rose" : light ? "bg-white" : "bg-text"}`} style={{ width: `calc(${Math.max(0.06, battery) * 100}% - 3px)` }} />
          </span>
          <span className={`ml-[1px] h-1 w-[2px] rounded-r ${light ? "bg-white/70" : "bg-text/50"}`} />
        </span>
      </span>
    </div>
  );
}

function notifFor(l: LogEntry): { emoji: string; app: string; icon?: PhoneApp } {
  if (/Hired|Shifts|Quit|paycheck|🍟/i.test(l.text)) return { emoji: "🍟", app: "McJobs", icon: appById("mcjobs") };
  if (/turned/.test(l.text)) return { emoji: "🎂", app: "Calendar" };
  if (/ignored|Dodged|went nowhere/.test(l.text)) return { emoji: "🐦", app: "Chirp", icon: appById("chirp") };
  if (/Bought|Sold|rugged|Day trade|📈|📉|🚨|🧻/.test(l.text)) return { emoji: "📈", app: "Charts", icon: appById("charts") };
  if (/rent|bags to pay/i.test(l.text)) return { emoji: "🏦", app: "Bank", icon: appById("bank") };
  return { emoji: "🔔", app: "DegenOS" };
}

function LockScreen({ state, setScreen, sleptFrom }: ScreenProps) {
  const waiting = pending(state);
  const since = state.log.filter((l) => l.month > sleptFrom && !/quiet month/.test(l.text)).reverse();
  const shown = since.slice(0, 5);
  const months = state.month - sleptFrom;
  return (
    <div className="phone-wake absolute inset-0 -top-11 flex flex-col overflow-hidden bg-[#111316] px-4 pb-6 pt-24">
      <span className="pointer-events-none absolute -bottom-8 -right-10 rotate-[-12deg] select-none text-[240px] leading-none opacity-[0.1]" aria-hidden>
        {STATUSES[state.status].emoji}
      </span>
      <div className="relative text-center text-white">
        <p className="text-[15px] font-semibold opacity-90">Age {ageOf(state)}</p>
        <p className="text-[64px] font-bold leading-none tracking-tight">{MONTHS[state.month % 12]}</p>
        <p className="mt-1 text-[13px] opacity-80">{months <= 1 ? "You slept on it." : `You put your phone down for ${months} months.`}</p>
      </div>

      <div className="scroll-thin relative mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {waiting && (
          <button type="button" onClick={(e) => setScreen(waiting.open, e.currentTarget)} className="msg-in flex w-full items-start gap-3 rounded-2xl bg-white/90 p-3 text-left ring-2 ring-mint-fill">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised text-lg" aria-hidden>
              {waiting.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between text-[11px] uppercase tracking-wide text-muted">
                {waiting.app} <span className="font-bold normal-case text-mint">Open</span>
              </span>
              <span className="block truncate text-[14px] font-semibold">{waiting.title}</span>
              <span className="line-clamp-2 text-[13px] text-muted">{waiting.body}</span>
            </span>
          </button>
        )}
        {shown.map((l, i) => {
          const n = notifFor(l);
          return (
            <div key={i} className="msg-in flex items-start gap-3 rounded-2xl bg-white/75 p-3" style={{ animationDelay: `${(i + 1) * 70}ms` }}>
              <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-base" aria-hidden>
                {n.icon ? <IconArt app={n.icon} size={32} /> : n.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wide text-muted">{n.app}</span>
                <span className={`block text-[13px] ${l.tone === "bad" ? "text-rose" : l.tone === "good" ? "text-mint" : "text-text"}`}>{l.text}</span>
              </span>
            </div>
          );
        })}
        {since.length > shown.length && <p className="text-center text-[12px] text-white/80">+{since.length - shown.length} more</p>}
        {!waiting && shown.length === 0 && <p className="pt-6 text-center text-[13px] text-white/80">No notifications. A rare peaceful month.</p>}
      </div>

      <button type="button" onClick={() => setScreen({ kind: "home" })} className="relative mx-auto mt-4 flex flex-col items-center gap-2 text-[13px] font-semibold text-white/90">
        Tap to unlock
        <span className="h-1.5 w-32 rounded-full bg-white/90" aria-hidden />
      </button>
    </div>
  );
}

function AppIcon({ app, onOpen, label = true, badge = false }: { app: PhoneApp; onOpen: (from: Element) => void; label?: boolean; badge?: boolean }) {
  return (
    <button type="button" onClick={(e) => onOpen(e.currentTarget.querySelector("[data-icon]") ?? e.currentTarget)} className="group relative flex flex-col items-center gap-1.5" aria-label={app.name}>
      <span data-icon className="relative grid size-[56px] place-items-center overflow-hidden rounded-[16px] shadow-[0_2px_6px_rgb(0_0_0/0.12)] ring-1 ring-black/5 transition-transform group-active:scale-95" style={{ background: app.bg }}>
        <IconArt app={app} size={56} />
      </span>
      {badge && <span className="absolute -right-1 -top-1 size-4 rounded-full border-2 border-white bg-rose" />}
      {label && <span className="text-[11px] font-medium">{app.name}</span>}
    </button>
  );
}

function HomeScreen({ state, dispatch, setScreen }: ScreenProps) {
  const st = STATUSES[state.status];
  const ns = nextStatus(state);
  const waiting = pending(state);
  const busy = !!state.current || !!state.sim;
  const discovered = hasFlag(state, "discovered");
  const open = (app: AppId, from?: Element) => setScreen({ kind: "app", app }, from);
  const badgeFor = (id: AppId) => (id === "charts" && !!state.sim) || (id === "chirp" && state.current?.id === "social_post");

  return (
    <div className="absolute inset-0 -top-11 flex flex-col overflow-hidden px-5 pb-4 pt-14" style={{ background: WALLPAPER[state.status] }}>
      <span className="pointer-events-none absolute -bottom-10 -right-12 rotate-[-12deg] select-none text-[260px] leading-none opacity-[0.16]" aria-hidden>
        {st.emoji}
      </span>

      <div className="scroll-thin relative -mx-5 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
      <section className="relative mt-2 rounded-[22px] bg-white/80 p-4 backdrop-blur" aria-label="Net worth widget">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Net worth</span>
          <span className="text-[12px] font-semibold">
            {st.emoji} {sentence(st.label)}
          </span>
        </div>
        <p className="num mt-1 text-[32px] leading-none">{money(netWorth(state))}</p>
        <p className="mt-1 text-[12px] text-muted">
          Cash <span className="num text-text">{money(state.cash)}</span> · Crypto <span className="num text-text">{money(portfolioValue(state))}</span>
        </p>
        {ns.label && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-text" style={{ width: `${Math.max(3, ns.progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted">Next: {ns.label} · {ns.hint}</p>
          </div>
        )}
      </section>

      <div className="relative mt-5 grid grid-cols-4 gap-x-3 gap-y-5">
        {APPS.filter((a) => !DOCK.includes(a.id)).map((a) => (
          <AppIcon key={a.id} app={a} onOpen={(from) => open(a.id, from)} badge={badgeFor(a.id)} />
        ))}
      </div>
      </div>

      <div className="relative pt-3">
        <button
          type="button"
          onClick={(e) => (waiting ? setScreen(waiting.open, e.currentTarget) : dispatch({ type: "NEXT_MONTH" }))}
          disabled={busy && !waiting}
          className="age-btn mb-4 flex w-full items-center justify-center gap-3 py-3.5 shadow-[0_8px_20px_rgb(0_0_0/0.12)]"
        >
          <span className="text-xl" aria-hidden>
            {waiting ? "💬" : "🌙"}
          </span>
          <span className="text-left">
            <span className="block text-[16px] font-extrabold leading-tight">{waiting ? "Something's waiting" : "Sleep"}</span>
            <span className="block text-[11px] font-semibold opacity-70">{waiting ? "Open it before you put the phone down" : discovered ? "Put the phone down. Life happens." : "Put the phone down. Space works too."}</span>
          </span>
        </button>
        <div className="grid grid-cols-4 gap-3 rounded-[28px] bg-white/45 px-3 py-3 backdrop-blur">
          {DOCK.map((id) => (
            <AppIcon key={id} app={APPS.find((a) => a.id === id)!} onOpen={(from) => open(id, from)} label={false} badge={badgeFor(id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BankBudget({ state }: { state: GameState }) {
  const { costs, pay, net, runway } = monthMoney(state);
  return (
    <dl className="mt-3 divide-y divide-line rounded-2xl border border-line text-[14px]">
      <div className="flex justify-between px-4 py-2.5">
        <dt className="text-muted">Living costs</dt>
        <dd className="num text-rose">-{money(costs)}/mo</dd>
      </div>
      <div className="flex justify-between px-4 py-2.5">
        <dt className="text-muted">{JOB.name} paycheck</dt>
        <dd className={`num ${pay ? "text-mint" : "text-faint"}`}>{pay ? `+${money(pay)}/mo` : "Not working"}</dd>
      </div>
      <div className="flex justify-between px-4 py-2.5 font-semibold">
        <dt>{runway !== null ? "Cash lasts" : "You save"}</dt>
        <dd className={`num ${runway !== null && runway < 3 ? "text-rose" : ""}`}>{runway !== null ? `${runway} month${runway === 1 ? "" : "s"}` : `${money(net)}/mo`}</dd>
      </div>
    </dl>
  );
}

/** Money in and out each month, and how long your cash lasts if nothing changes. */
function monthMoney(state: GameState) {
  const costs = expenses(state);
  const pay = state.job.employed ? salary(state) : 0;
  const net = pay - costs;
  const runway = net < 0 ? Math.floor(state.cash / -net) : null;
  return { costs, pay, net, runway };
}

function AppFrame({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <header className="flex items-center gap-1 border-b border-line px-2 py-2">
        <button type="button" onClick={onBack} className="rounded-full px-2 py-1 text-[22px] leading-none text-mint" aria-label="Back">
          ‹
        </button>
        <div>
          <p className="text-[16px] font-bold leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
        </div>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function AppView({ state, dispatch, onExit, setScreen, app, coinId }: ScreenProps & { app: AppId; coinId?: string }) {
  const home = () => setScreen({ kind: "home" });
  const meta = APPS.find((a) => a.id === app)!;
  const openCoin = (id: string) => setScreen({ kind: "app", app: "charts", coinId: id });

  if (app === "charts" && coinId && state.coins.some((c) => c.id === coinId)) {
    return (
      <AppFrame title="Charts" subtitle="Order ticket" onBack={() => setScreen({ kind: "app", app: "charts" })}>
        <div className="p-4">
          <OrderTicket key={coinId} state={state} coinId={coinId} dispatch={dispatch} />
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame title={meta.name} onBack={home}>
      {app === "charts" && (
        <div className="py-3">
          <MarketList state={state} onSelect={openCoin} />
        </div>
      )}
      {app === "bags" && (
        <div className="space-y-4 p-4">
          <PortfolioSummary state={state} />
          <PositionsTable state={state} dispatch={dispatch} onSelect={openCoin} />
        </div>
      )}
      {app === "chirp" && (
        <div className="p-4">
          <CtPanel state={state} dispatch={dispatch} onPosted={() => setScreen({ kind: "event" })} />
        </div>
      )}
      {app === "bank" && (
        <div className="p-4">
          <div className="rounded-2xl bg-[#0b0b0d] p-4 text-white">
            <p className="text-[12px] uppercase tracking-wide opacity-75">Checking</p>
            <p className="num mt-1 text-[30px] leading-none">{money(state.cash)}</p>
            <p className="mt-2 text-[12px] opacity-75">Crypto (not FDIC insured, obviously): {money(portfolioValue(state))}</p>
          </div>
          <BankBudget state={state} />
          <h3 className="eyebrow mb-2 mt-5">Transactions</h3>
          <ActivityLog state={state} />
        </div>
      )}
      {app === "mcjobs" && (
        <div className="p-4">
          <div className="rounded-2xl bg-mcd-red p-4 text-white">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-mcd-yellow">{JOB.name}</p>
            <p className="mt-1 text-[20px] font-extrabold">{state.job.employed ? "You're on the schedule" : "Now hiring"}</p>
          </div>
          <div className="mt-4">
            <JobControls state={state} dispatch={dispatch} />
          </div>
        </div>
      )}
      {app === "memories" && (
        <div className="p-4">
          <Story state={state} />
        </div>
      )}
      {app === "me" && (
        <div className="p-3">
          <CharacterPanel state={state} dispatch={dispatch} onExit={onExit} />
        </div>
      )}
      {app === "scanner" && (
        <div className="p-5 text-center">
          <p className="text-5xl" aria-hidden>
            🔭
          </p>
          <p className="mt-3 text-[17px] font-bold">Scan the trenches</p>
          <p className="mt-1 text-[14px] text-muted">Finds one live trade setup. One scan per month.</p>
          <button
            type="button"
            disabled={!canHunt(state)}
            onClick={() => {
              dispatch({ type: "HUNT_TRADE" });
              setScreen({ kind: "trade" });
            }}
            className="age-btn mt-5 w-full py-3 text-[15px] font-extrabold disabled:opacity-40"
          >
            Scan for a trade
          </button>
          {!canHunt(state) && (
            <p className="mt-2 text-[12px] text-muted">
              {!hasFlag(state, "discovered") ? "You don't know what you're scanning for yet." : state.current || state.sim ? "Finish what's open first." : "Already scanned this month, or you're out of cash."}
            </p>
          )}
        </div>
      )}
      {app === "settings" && (
        <div className="divide-y divide-line">
          {ageOf(state) >= RETIRE_MIN_AGE && (
            <button
              type="button"
              disabled={!!state.current || !!state.sim}
              onClick={() => {
                if (window.confirm("Retire? You'll cash out and live out the rest of your life. This ends the run.")) dispatch({ type: "RETIRE" });
              }}
              className="block w-full px-4 py-3.5 text-left text-[15px] disabled:opacity-40"
            >
              🏖️ Retire
            </button>
          )}
          <button type="button" onClick={onExit} className="block w-full px-4 py-3.5 text-left text-[15px]">
            💾 Save and exit
          </button>
          <p className="px-4 py-3 text-[12px] text-muted">
            DegenOS · Run #{state.seed}
          </p>
        </div>
      )}
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------
// The desk around the phone (desktop only)
// ---------------------------------------------------------------------------

function PhotoFrame({ state }: { state: GameState }) {
  return (
    <figure className="w-48 rotate-[-3deg] bg-white p-3 pb-2 shadow-[0_14px_28px_rgb(0_0_0/0.22)]">
      <div className="flex h-52 items-end justify-center overflow-hidden bg-[#e9edf0]">
        <div className="h-[90%]">
          <FullPortrait id={state.player.avatar} mood={currentMood(state)} />
        </div>
      </div>
      <figcaption className="pt-1.5 text-center text-[22px] leading-tight text-[#30302e] [font-family:var(--font-hand)]">
        {state.player.name}, {ageOf(state)}
      </figcaption>
    </figure>
  );
}

function StickyNote({ state }: { state: GameState }) {
  const ns = nextStatus(state);
  return (
    <div className="w-52 rotate-[2.5deg] bg-[#ffe680] p-4 text-[#3a3320] shadow-[0_12px_22px_rgb(0_0_0/0.18)] [font-family:var(--font-hand)]">
      <p className="text-[20px] font-bold leading-tight">don&apos;t forget:</p>
      <ul className="mt-1 space-y-0.5 text-[19px] leading-snug">
        <li>net worth {money(netWorth(state))}</li>
        <li>peak {money(state.run.peakNetWorth)}</li>
        {ns.label && <li>next: {ns.hint.toLowerCase()}</li>}
        {state.run.rugs > 0 && <li className="text-[#b42318]">rugged {state.run.rugs}x. learn.</li>}
      </ul>
    </div>
  );
}

function NameTag({ name }: { name: string }) {
  return (
    <div className="w-56 rotate-[4deg] overflow-hidden rounded-xl bg-mcd-red text-center shadow-[0_12px_22px_rgb(0_0_0/0.22)]">
      <p className="pt-2 text-[11px] font-extrabold uppercase tracking-[0.25em] text-mcd-yellow">{JOB.name} crew</p>
      <div className="mx-2 mb-2 mt-1.5 rounded-lg bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">Hello, my name is</p>
        <p className="text-[34px] leading-none text-[#1b1b1b] [font-family:var(--font-hand)]">{name}</p>
      </div>
    </div>
  );
}

const ZIGZAG = (() => {
  const teeth = 18;
  const pts = ["0 0", "100% 0", "100% calc(100% - 8px)"];
  for (let i = teeth; i >= 0; i--) pts.push(`${(i / teeth) * 100}% ${i % 2 ? "100%" : "calc(100% - 8px)"}`);
  return `polygon(${pts.join(",")})`;
})();

function Receipt({ state }: { state: GameState }) {
  const lines = state.log.filter((l) => !/quiet month|turned/.test(l.text)).slice(-9).reverse();
  return (
    <div className="num w-60 rotate-[-1.5deg] bg-[#fdfdfb] px-4 pb-6 pt-4 text-[11px] text-[#2c2c2a] shadow-[0_12px_22px_rgb(0_0_0/0.16)]" style={{ clipPath: ZIGZAG }}>
      <p className="text-center text-[13px] font-medium tracking-[0.2em]">DEGEN MART</p>
      <p className="text-center text-[10px] text-black/50">
        {MONTHS[state.month % 12]} · AGE {ageOf(state)} · RUN {state.seed}
      </p>
      <div className="my-2 border-t border-dashed border-black/30" />
      {lines.length === 0 ? (
        <p className="text-center text-black/50">NO TRANSACTIONS YET</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((l, i) => (
            <li key={i} className="leading-snug">
              {l.text.toUpperCase()}
            </li>
          ))}
        </ul>
      )}
      <div className="my-2 border-t border-dashed border-black/30" />
      <p className="flex justify-between font-medium">
        <span>NET WORTH</span>
        <span>{money(netWorth(state))}</span>
      </p>
      <p className="mt-2 text-center text-[10px] text-black/50">THANK YOU FOR YOUR LIQUIDITY</p>
    </div>
  );
}
