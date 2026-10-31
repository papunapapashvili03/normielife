"use client";

import { JOB, STARTING_CASH, STATUSES } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { ageOf } from "@/lib/game/history";
import { netWorth } from "@/lib/game/portfolio";
import { newSeed } from "@/lib/game/rng";
import type { GameState } from "@/lib/game/types";
import { Logo } from "./Logo";
import { Avatar } from "./Portrait";

const LADDER = ["🐸 Normie", "🪙 Degen", "🧠 Trader", "🗿 Chad", "🐋 Whale", "👑 Legend"];

const SAMPLE: [number, string, string, string?][] = [
  [19, "📱", "Saw a TikTok. Bought $200 of $DOGEAI."],
  [19, "🚨", "Got rugged for the first time.", "rose"],
  [20, JOB.emoji, `Broke. Started working at ${JOB.name}.`],
  [21, "🚀", "Sold $PIZZADOG for 112x (+$54K).", "mint"],
  [24, "🗿", "Became a CHAD."],
  [27, "💀", "Lost $380K on $SKIBIDIAI.", "rose"],
  [76, "🪦", "Died holding a bag. Never sold."],
];

export function TitleScreen({ saved, onContinue, onNewLife }: { saved: GameState | null; onContinue: () => void; onNewLife: (seed: number) => void }) {
  const st = saved ? STATUSES[saved.status] : null;
  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-10">
      <div>
        <Logo />
        <h1 className="mt-8 text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
          One life.
          <br />
          Infinite <span className="text-mint">rugs.</span>
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
          A memecoin life simulator. Start with {money(STARTING_CASH)}, discover crypto on TikTok, get rugged, work at {JOB.name}, come back, and maybe die a legend.
        </p>

        <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]" aria-label="Status ladder">
          {LADDER.map((p, i) => (
            <li key={p} className="flex items-center gap-2">
              <span className="rounded-full border border-line px-3 py-1 font-semibold">{p}</span>
              {i < LADDER.length - 1 && (
                <span className="text-faint" aria-hidden>
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
          {saved && st && (
            <button type="button" onClick={onContinue} className="age-btn flex flex-1 items-center gap-3 py-2 pl-2 pr-6 text-left">
              <Avatar id={saved.player.avatar} size={40} className="border-mint-ink/20" />
              <span className="flex flex-col">
                <span className="text-[15px] font-extrabold">Continue life</span>
                <span className="text-xs font-semibold opacity-75">
                  {saved.player.name}, {ageOf(saved)} · {st.emoji} · <span className="num">{money(netWorth(saved))}</span>
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNewLife(newSeed())}
            className={`flex-1 rounded-full px-6 py-3.5 text-[15px] font-extrabold ${saved ? "border border-line-strong hover:bg-raised" : "age-btn"}`}
          >
            Start a new life
          </button>
        </div>
        {saved && <p className="mt-3 text-xs text-faint">A new life replaces your saved one once you&apos;re born.</p>}

      </div>

      <figure className="panel hidden p-6 lg:block" aria-label="An example life">
        <figcaption className="eyebrow mb-4">A real story, probably</figcaption>
        <ol>
          {SAMPLE.map(([age, emoji, text, tone], i) => (
            <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <div className="relative flex justify-center">
                <span className="absolute inset-y-0 w-px bg-line" aria-hidden />
                {(i === 0 || SAMPLE[i - 1][0] !== age) ? (
                  <span className="num relative mt-1 grid h-6 min-w-9 place-items-center rounded-full border border-line-strong bg-panel text-[11px]">{age}</span>
                ) : (
                  <span className="relative mt-2.5 size-1.5 rounded-full bg-line-strong" aria-hidden />
                )}
              </div>
              <p className={`pb-4 pt-1 text-[15px] ${tone === "mint" ? "text-mint" : tone === "rose" ? "text-rose" : "text-text"}`}>
                <span className="mr-2" aria-hidden>
                  {emoji}
                </span>
                {text}
              </p>
            </li>
          ))}
        </ol>
      </figure>
    </main>
  );
}
