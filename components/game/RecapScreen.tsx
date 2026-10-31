"use client";

import { useState } from "react";
import { buildRecap, shareText } from "@/lib/game/recap";
import { newSeed } from "@/lib/game/rng";
import type { GameState } from "@/lib/game/types";
import { Timeline } from "./Story";
import { Logo } from "./Logo";
import { Avatar } from "./Portrait";

export function RecapScreen({ state, onNewLife }: { state: GameState; onNewLife: (seed: number) => void }) {
  const r = buildRecap(state);
  const [copied, setCopied] = useState(false);
  const text = shareText(state);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <Logo />
      <div className="mt-8 grid gap-8 lg:grid-cols-[24rem_1fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <article className="panel rise-in overflow-hidden">
            <header className="border-b border-line px-6 pb-5 pt-6 text-center">
              <p className="eyebrow">Your degen life</p>
              <div className="mt-4 flex justify-center">
                <Avatar id={r.avatar} size={96} />
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{r.name}</h1>
              <p className="text-sm text-muted">{state.ended?.text}</p>
            </header>
            <dl className="divide-y divide-line px-6">
              {r.lines.map((l) => (
                <div key={l.label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted">{l.label}</dt>
                  <dd className="num text-right text-[13px]">{l.value}</dd>
                </div>
              ))}
            </dl>
            <footer className="border-t border-line bg-raised px-6 py-5 text-center">
              <p className="eyebrow">Peak status</p>
              <p className="mt-1 text-2xl font-extrabold">{r.status}</p>
              <p className="mt-3 text-lg font-bold text-mint">&ldquo;{r.tagline}&rdquo;</p>
              <p className="num mt-2 text-[11px] text-faint">RUN #{r.seed}</p>
            </footer>
          </article>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className="rounded-full border border-line-strong py-2.5 text-[13px] font-semibold hover:bg-raised">
              {copied ? "Copied" : "Copy card"}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line-strong py-2.5 text-center text-[13px] font-semibold hover:bg-raised"
            >
              Share on X
            </a>
          </div>
          <button type="button" onClick={() => onNewLife(newSeed())} className="age-btn mt-2 w-full py-3.5 text-[15px] font-extrabold">
            Live another life
          </button>
        </div>

        <section aria-labelledby="tl-h">
          <h2 id="tl-h" className="text-2xl font-extrabold tracking-tight">
            The timeline
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">Every big moment, from TikTok to the grave.</p>
          <Timeline entries={state.history.filter((h) => h.major)} />
        </section>
      </div>
    </main>
  );
}
