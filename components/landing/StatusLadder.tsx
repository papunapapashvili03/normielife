"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/game/Portrait";
import { STATUSES, STATUS_THRESHOLDS } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import type { StatusId } from "@/lib/game/types";

// The real thresholds from the game, drawn as stairs. Each step is a status you can lose.
const STEPS: [StatusId, string][] = [
  ["normie", "Everyone starts here"],
  ["degen", "Make your first trade"],
  ["trader", `${money(STATUS_THRESHOLDS.trader.netWorth)} and some actual research`],
  ["chad", `${money(STATUS_THRESHOLDS.chad)} net worth`],
  ["whale", `${money(STATUS_THRESHOLDS.whale)} net worth`],
  ["legend", `${money(STATUS_THRESHOLDS.legend)} net worth`],
];
const STEP_H = ["lg:min-h-[13rem]", "lg:min-h-[15.5rem]", "lg:min-h-[18rem]", "lg:min-h-[20.5rem]", "lg:min-h-[23rem]", "lg:min-h-[25.5rem]"];

const RISE_MS = 110; // stagger between steps growing in
const HOP_MS = 750; // time on each step while climbing
const TOP_MS = 1600; // enjoying Legend
const BOTTOM_MS = 1400; // lying at the bottom after the fall

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function StatusLadder() {
  const ref = useRef<HTMLOListElement>(null);
  const [inView, setInView] = useState(false);
  const [risen, setRisen] = useState(false);
  // Where "you" are on the ladder, and whether you got there by climbing or by falling.
  const [climb, setAt] = useState<{ step: number; fell: boolean; n: number } | null>(null);
  const still = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // With reduced motion you just stand on the bottom step.
  const at = still ? (risen ? { step: 0, fell: false, n: 0 } : null) : climb;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (inView && !risen) setRisen(true);

  // Climb one step at a time, hold at the top, fall back to the bottom, repeat. Only while visible.
  useEffect(() => {
    if (!inView || still) return;
    const at = climb;
    let delay: number;
    if (!at) delay = STEPS.length * RISE_MS + 500;
    else if (at.step === STEPS.length - 1) delay = TOP_MS;
    else if (at.fell) delay = BOTTOM_MS;
    else delay = HOP_MS;
    const id = window.setTimeout(() => {
      setAt((a) => {
        const n = (a?.n ?? 0) + 1;
        if (!a) return { step: 0, fell: false, n };
        if (a.step === STEPS.length - 1) return { step: 0, fell: true, n };
        return { step: a.step + 1, fell: false, n };
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [inView, still, climb]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="max-w-2xl text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Climb from Normie to Legend. Fall back down.</h2>
      <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted">Your status follows your net worth. Lose the money and you lose the title, and the rent you were paying for it keeps coming.</p>

      {/* Clipped at the floor so the steps rise out of it; the top padding leaves room for the climber. */}
      <ol ref={ref} className="mt-4 grid gap-3 overflow-hidden border-line-strong pt-12 lg:grid-cols-6 lg:items-end lg:gap-2 lg:border-b lg:[--rise-o:1] lg:[--rise:105%]">
        {STEPS.map(([id, how], i) => {
          const st = STATUSES[id];
          const top = id === "legend";
          const here = at?.step === i;
          return (
            <li
              key={id}
              className={`relative flex flex-col justify-end rounded-2xl border p-4 transition-colors duration-300 lg:rounded-b-none lg:border-b-0 ${top ? "border-amber/40 bg-amber/10" : here ? "border-mint/50 bg-mint/[0.05]" : "border-line bg-panel"} ${STEP_H[i]} ${risen ? "step-rise" : "opacity-0"}`}
              style={{ animationDelay: `${i * RISE_MS}ms` }}
            >
              {here && (
                <span className="absolute right-4 top-4 lg:-top-12 lg:left-1/2 lg:right-auto lg:-ml-5" aria-hidden>
                  <span key={at.n} className={`flex flex-col items-center ${at.fell ? "ladder-fall" : "ladder-hop"}`}>
                    <Avatar id="p1" size={40} className="border-2 border-white shadow-[0_4px_10px_rgb(0_0_0/0.18)]" />
                  </span>
                </span>
              )}
              <span className="text-[28px] leading-none" aria-hidden>
                {st.emoji}
              </span>
              <p className={`mt-3 text-[17px] font-extrabold ${top ? "text-amber" : ""}`}>{sentence(st.label)}</p>
              <p className="num mt-0.5 text-[12px] text-muted">{how}</p>
              <p className="mt-3 text-[13px] italic leading-snug text-faint">&ldquo;{st.quote}&rdquo;</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
