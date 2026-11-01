"use client";

import { useState } from "react";
import { randomDraft, rollFromSeed, type CharacterDraft } from "@/lib/game/character";
import { COUNTRIES, PORTRAITS } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import { newSeed } from "@/lib/game/rng";
import { STAT_ROWS, StatBar } from "./bits";
import { useIsDesktop } from "./hooks";
import { PhoneDesk, PhotoFrame, Slip, SlipRule, StickyNote } from "./phone/Desk";
import { FullPortrait } from "./Portrait";

const GENDERS: [CharacterDraft["gender"], string][] = [
  ["male", "Male"],
  ["female", "Female"],
  ["other", "Other"],
];
const AGES = [18, 19, 20, 21];

/** New life setup, shown on the same phone you'll live it on. */
export function CharacterCreator({
  initialSeed,
  onBack,
  onStart,
}: {
  initialSeed: number;
  onBack: () => void;
  onStart: (draft: CharacterDraft, seed: number) => void;
}) {
  const isDesktop = useIsDesktop();
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
  const name = draft.name.trim() || "Anon";

  return (
    <PhoneDesk
      framed={isDesktop}
      left={
        <>
          <PhotoFrame avatar={draft.avatar} mood="very_happy" caption={`${name}, ${draft.age}`} />
          <StickyNote title="today:">
            <li>get born</li>
            <li>start with {money(rolled.profile.cash)}</li>
            <li>don&apos;t buy the top</li>
          </StickyNote>
        </>
      }
      right={
        <Slip title="DEGEN GENERAL" subtitle={`BIRTH RECORD · RUN ${seed}`} footer="WELCOME TO THE TRENCHES">
          <ul className="space-y-1">
            <SlipLine label="NAME" value={name.toUpperCase()} />
            <SlipLine label="FROM" value={draft.country.toUpperCase()} />
            <SlipLine label="AGE" value={String(draft.age)} />
            <SlipRule />
            {STAT_ROWS.map(([k, label]) => (
              <SlipLine key={k} label={label.split(" ").slice(1).join(" ").toUpperCase()} value={String(rolled.stats[k])} />
            ))}
          </ul>
          <SlipRule />
          <p className="flex justify-between font-medium">
            <span>STARTING CASH</span>
            <span>{money(rolled.profile.cash)}</span>
          </p>
        </Slip>
      }
    >
      <form
        className="relative flex h-full flex-col bg-[#f2f2f7] text-text [font-family:system-ui,-apple-system,'Segoe_UI',sans-serif]"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(draft, seed);
        }}
      >
        <div className={`flex h-11 shrink-0 items-end justify-between px-7 pb-1.5 text-[13px] font-semibold ${isDesktop ? "" : "pt-2"}`}>
          <span>New life</span>
          <span className="opacity-60">NormieOS</span>
        </div>
        <header className="flex items-center px-2 py-1.5">
          <button type="button" onClick={onBack} className="rounded-full px-2 py-1 text-[16px] text-mint">
            <span className="mr-0.5 text-[22px] leading-none" aria-hidden>
              ‹
            </span>
            Back
          </button>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight">Who are you this time?</h1>
          <p className="mt-1 text-[14px] text-muted">Pick who you are. The seed decides your stats and starting money.</p>

          <fieldset className="mt-5">
            <legend className="sr-only">Character</legend>
            <div className="grid grid-cols-2 gap-3">
              {PORTRAITS.map((p) => {
                const on = draft.avatar === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.label}
                    aria-pressed={on}
                    onClick={() => set("avatar", p.id)}
                    className={`relative h-44 overflow-hidden rounded-[22px] bg-white transition-shadow ${on ? "ring-[3px] ring-mint" : "ring-1 ring-black/5"}`}
                  >
                    <span className="absolute inset-x-0 -bottom-8 top-5 flex justify-center">
                      <FullPortrait id={p.id} priority />
                    </span>
                    {on && <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-mint text-[12px] font-black text-white">✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Group label="About you">
            <Row label="Name">
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value.slice(0, 20))}
                required
                aria-label="Name"
                className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-semibold outline-none placeholder:text-faint"
                placeholder="Anon"
              />
            </Row>
            <Row label="Country">
              <select value={draft.country} onChange={(e) => set("country", e.target.value)} aria-label="Country" className="min-w-0 cursor-pointer appearance-none bg-transparent text-right text-[16px] text-muted outline-none">
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <span className="text-[18px] leading-none text-faint" aria-hidden>
                ›
              </span>
            </Row>
            <Row label="Gender">
              <Segmented label="Gender" options={GENDERS} value={draft.gender} onChange={(v) => set("gender", v)} />
            </Row>
            <Row label="Age">
              <Segmented label="Starting age" options={AGES.map((a) => [a, String(a)])} value={draft.age} onChange={(v) => set("age", v)} />
            </Row>
          </Group>

          <Group label="Rolled by the seed" aside={`${rolled.profile.label} start · ${money(rolled.profile.cash)}`}>
            <div className="space-y-2.5 px-4 py-3.5">
              {STAT_ROWS.map(([k, label]) => (
                <StatBar key={k} label={label} value={rolled.stats[k]} compact />
              ))}
            </div>
          </Group>

          <Group label="Run seed" footer="Share a seed and someone else gets the same starting life.">
            <Row label="Seed">
              <input
                inputMode="numeric"
                value={seedInput}
                onChange={(e) => applySeed(e.target.value.replace(/\D/g, ""))}
                aria-label="Run seed"
                className="num min-w-0 flex-1 bg-transparent text-right text-[15px] outline-none"
              />
            </Row>
            <button type="button" onClick={reroll} className="w-full px-4 py-3 text-left text-[16px] text-mint active:bg-black/5">
              🎲 Reroll a new life
            </button>
          </Group>
        </div>

        <div className="shrink-0 px-4 pb-5 pt-2">
          <button type="submit" className="age-btn flex w-full items-center justify-center gap-2 py-3.5 text-[16px] font-extrabold shadow-[0_8px_20px_rgb(0_0_0/0.12)]">
            <span aria-hidden>👶</span> Be born
          </button>
        </div>
      </form>
    </PhoneDesk>
  );
}

/** An iOS-style inset grouped list. */
function Group({ label, aside, footer, children }: { label: string; aside?: string; footer?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between px-4 pb-1.5 text-[12px] uppercase tracking-wide text-muted">
        <h2>{label}</h2>
        {aside && <span className="num normal-case tracking-normal text-mint">{aside}</span>}
      </div>
      <div className="divide-y divide-black/[0.07] overflow-hidden rounded-[14px] bg-white">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[12px] text-muted">{footer}</p>}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2">
      <span className="shrink-0 text-[16px]">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[9px] bg-[#767680]/[0.12] p-0.5">
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`rounded-[7px] px-2.5 py-1 text-[13px] font-semibold transition-colors ${on ? "bg-white shadow-[0_1px_3px_rgb(0_0_0/0.15)]" : "text-muted"}`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

function SlipLine({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="truncate">{value}</span>
    </li>
  );
}
