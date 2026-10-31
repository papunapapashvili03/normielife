import Image from "next/image";
import { getPortrait } from "@/lib/game/config";
import type { Mood } from "@/lib/game/types";

/**
 * Round avatar cropped to the character's face. Falls back to the stored value as an
 * emoji, so saves from before character art existed still render.
 */
export function Avatar({ id, size = 40, className = "" }: { id: string; size?: number; className?: string }) {
  const p = getPortrait(id);
  const ring = `relative shrink-0 overflow-hidden rounded-full border border-line bg-raised ${className}`;
  if (!p) {
    return (
      <span className={`${ring} grid place-items-center`} style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden>
        {id}
      </span>
    );
  }
  // Scale the image so the head fills ~72% of the circle, then centre on the face.
  const imgH = 72 / p.face.h;
  const imgW = imgH * (p.width / p.height);
  return (
    <span className={ring} style={{ width: size, height: size }}>
      <Image
        src={p.src}
        alt=""
        width={p.width}
        height={p.height}
        sizes={`${Math.round(size * (imgW / 100))}px`}
        className="absolute max-w-none"
        style={{
          width: `${imgW}%`,
          height: "auto",
          left: `${50 - (p.face.x / 100) * imgW}%`,
          top: `${50 - (p.face.y / 100) * imgH}%`,
        }}
      />
    </span>
  );
}

/** Full-figure character art. With a mood, shows that emotion's art when the character has it. */
export function FullPortrait({ id, mood = "neutral", className = "", priority = false }: { id: string; mood?: Mood; className?: string; priority?: boolean }) {
  const p = getPortrait(id);
  if (!p) {
    return (
      <span className={`grid place-items-center text-7xl ${className}`} aria-hidden>
        {id}
      </span>
    );
  }
  const art = (mood !== "neutral" && p.moods?.[mood]) || { src: p.src, width: p.width, height: p.height };
  return (
    <Image
      key={art.src}
      src={art.src}
      alt={`${p.label}, looking ${MOOD_WORDS[mood]}`}
      width={art.width}
      height={art.height}
      priority={priority}
      sizes="(min-width: 1024px) 280px, 60vw"
      className={`fade-in h-full w-auto max-w-none object-contain ${className}`}
    />
  );
}

const MOOD_WORDS: Record<Mood, string> = {
  neutral: "calm",
  very_happy: "thrilled",
  happy: "happy",
  disappointed: "disappointed",
  sad: "sad",
  very_sad: "crushed",
  rage: "furious",
};
