"use client";

import { useState } from "react";
import { randomDraft, rollFromSeed, type CharacterDraft } from "@/lib/game/character";
import { COUNTRIES, PORTRAITS } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { newSeed } from "@/lib/game/rng";
import { STAT_ROWS, StatBar } from "./bits";
import { FullPortrait } from "./Portrait";
import { Logo } from "./Logo";

const field = "mt-1.5 w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 text-[15px] outline-none focus:border-mint";

export function CharacterCreator({
  initialSeed,
  onBack,
  onStart,
}: {
  initialSeed: number;
  onBack: () => void;
  onStart: (draft: CharacterDraft, seed: number) => void;
}) {
  const [seed, setSeed] = useState(initialSeed);
  const [seedInput, setSeedInput] = useState(String(initialSeed));
  const [draft, setDraft] = useState<CharacterDraft>(() => randomDraft(initialSeed));
  const rolled = rollFromSeed(seed);

  const reroll = () => {
    const s = newSeed();
    setSeed(s);
    setSeedInput(String(s));
    setDraft(randomDraft(s));
  };
  const applySeed = (v: string) => {
    setSeedInput(v);
    const n = Number(v);
    if (Number.isInteger(n) && n > 0 && n < 1e9) setSeed(n);
  };
  const set = <K extends keyof CharacterDraft>(k: K, v: CharacterDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <Logo />
        <button type="button" onClick={onBack} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:bg-raised hover:text-text">
          ← Back
        </button>
      </div>
      <h1 className="mt-8 text-4xl font-extrabold tracking-[-0.03em]">Who are you this time?</h1>
      <p className="mt-2 text-muted">Pick who you are. The seed decides your stats and starting money.</p>

      <form
        className="mt-8 grid gap-4 lg:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(draft, seed);
        }}
      >
        <section className="panel p-5">
          <fieldset>
            <legend className="eyebrow">Character</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {PORTRAITS.map((p) => {
                const on = draft.avatar === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.label}
                    aria-pressed={on}
                    onClick={() => set("avatar", p.id)}
                    className={`relative h-52 overflow-hidden rounded-2xl border transition-colors ${on ? "border-mint bg-mint/[0.07]" : "border-line bg-raised hover:border-line-strong"}`}
                  >
                    <span className="absolute inset-x-0 -bottom-10 top-7 flex justify-center">
                      <FullPortrait id={p.id} priority />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent" aria-hidden />
                    {on && <span className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-mint text-[11px] font-black text-white">✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-5 block">
            <span className="eyebrow">Name</span>
            <input value={draft.name} onChange={(e) => set("name", e.target.value.slice(0, 20))} className={`${field} font-bold`} required />
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label>
              <span className="eyebrow">Country</span>
              <select value={draft.country} onChange={(e) => set("country", e.target.value)} className={field}>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="eyebrow">Gender</span>
              <select value={draft.gender} onChange={(e) => set("gender", e.target.value as CharacterDraft["gender"])} className={field}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="eyebrow">Starting age</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[18, 19, 20, 21].map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={draft.age === a}
                  onClick={() => set("age", a)}
                  className={`num rounded-full border py-2 text-[15px] ${draft.age === a ? "border-mint bg-mint/10 text-mint" : "border-line-strong text-muted hover:text-text"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="panel flex flex-col p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Rolled by the seed</h2>
            <span className="text-sm">
              {rolled.profile.label} start · <span className="num text-mint">{money(rolled.profile.cash)}</span>
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {STAT_ROWS.map(([k, label]) => (
              <StatBar key={k} label={label} value={rolled.stats[k]} />
            ))}
          </div>
          <div className="mt-6 flex items-end gap-2">
            <label className="flex-1">
              <span className="eyebrow">Run seed</span>
              <input inputMode="numeric" value={seedInput} onChange={(e) => applySeed(e.target.value.replace(/\D/g, ""))} className={`${field} num`} />
            </label>
            <button type="button" onClick={reroll} className="rounded-full border border-line-strong px-4 py-2.5 text-[13px] font-semibold hover:bg-raised">
              🎲 Reroll
            </button>
          </div>
          <p className="mt-2 text-xs text-faint">Share a seed and someone else gets the same starting life.</p>
          <button type="submit" className="age-btn mt-auto w-full py-3.5 text-[15px] font-extrabold max-lg:mt-6">
            Be born
          </button>
        </section>
      </form>
    </main>
  );
}
