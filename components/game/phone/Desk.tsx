"use client";

import type { Mood } from "@/lib/game/types";
import { FullPortrait } from "../Portrait";

/**
 * The phone on a desk. On desktop the screen sits in a phone frame with props on either side;
 * on mobile the screen is the whole viewport.
 */
export function PhoneDesk({ framed, left, right, overlay, children }: { framed: boolean; left?: React.ReactNode; right?: React.ReactNode; overlay?: React.ReactNode; children: React.ReactNode }) {
  if (!framed) {
    return (
      <div className="h-dvh">
        {children}
        {overlay}
      </div>
    );
  }
  return (
    <div className="relative flex h-dvh items-center justify-center gap-10 overflow-hidden bg-[#d9d6cf] px-8">
      <div className="flex w-64 flex-col items-center gap-10">{left}</div>
      <div className="relative aspect-[390/844] h-[min(860px,calc(100dvh-3rem))] rounded-[54px] bg-[#0b0b0d] p-3 shadow-[0_30px_60px_rgb(0_0_0/0.28),inset_0_0_0_2px_#2b2b30]">
        <div className="relative h-full overflow-hidden rounded-[42px] bg-white">
          <span className="absolute left-1/2 top-2.5 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-black" aria-hidden />
          {children}
        </div>
      </div>
      <div className="flex w-64 flex-col items-center gap-8">{right}</div>
      {overlay}
    </div>
  );
}

export function PhotoFrame({ avatar, mood, caption }: { avatar: string; mood?: Mood; caption: string }) {
  return (
    <figure className="w-48 rotate-[-3deg] bg-white p-3 pb-2 shadow-[0_14px_28px_rgb(0_0_0/0.22)]">
      <div className="flex h-52 items-end justify-center overflow-hidden bg-[#e9edf0]">
        <div className="h-[90%]">
          <FullPortrait id={avatar} mood={mood} />
        </div>
      </div>
      <figcaption className="truncate pt-1.5 text-center text-[22px] leading-tight text-[#30302e] [font-family:var(--font-hand)]">{caption}</figcaption>
    </figure>
  );
}

export function StickyNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-52 rotate-[2.5deg] bg-[#ffe680] p-4 text-[#3a3320] shadow-[0_12px_22px_rgb(0_0_0/0.18)] [font-family:var(--font-hand)]">
      <p className="text-[20px] font-bold leading-tight">{title}</p>
      <ul className="mt-1 space-y-0.5 text-[19px] leading-snug">{children}</ul>
    </div>
  );
}

const ZIGZAG = (() => {
  const teeth = 18;
  const pts = ["0 0", "100% 0", "100% calc(100% - 8px)"];
  for (let i = teeth; i >= 0; i--) pts.push(`${(i / teeth) * 100}% ${i % 2 ? "100%" : "calc(100% - 8px)"}`);
  return `polygon(${pts.join(",")})`;
})();

/** A till-roll slip: shop name, a subtitle line, then whatever is printed on it. */
export function Slip({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: string; children: React.ReactNode }) {
  return (
    <div className="num w-60 rotate-[-1.5deg] bg-[#fdfdfb] px-4 pb-6 pt-4 text-[11px] text-[#2c2c2a] shadow-[0_12px_22px_rgb(0_0_0/0.16)]" style={{ clipPath: ZIGZAG }}>
      <p className="text-center text-[13px] font-medium tracking-[0.2em]">{title}</p>
      <p className="text-center text-[10px] text-black/50">{subtitle}</p>
      <div className="my-2 border-t border-dashed border-black/30" />
      {children}
      <p className="mt-2 text-center text-[10px] text-black/50">{footer}</p>
    </div>
  );
}

export const SlipRule = () => <div className="my-2 border-t border-dashed border-black/30" />;
