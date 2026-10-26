// Fictional Crypto Twitter influencers. Any resemblance to real accounts is coincidental.
import type { GameState, Kol, KolArchetype } from "./types";

export const KOLS: Kol[] = [
  { id: "moondaddy", handle: "@MoonDaddy", name: "Moon Daddy", avatar: "🌙", archetype: "alpha", accuracy: 0.42, dump: 0.45, influence: 89, audience: 850_000, risk: "high" },
  { id: "cryptomax", handle: "@CryptoMax", name: "Crypto Max", avatar: "🧔", archetype: "veteran", accuracy: 0.66, dump: 0.08, influence: 72, audience: 420_000, risk: "medium" },
  { id: "gigawhale", handle: "@GigaWhale", name: "GIGA WHALE", avatar: "🐳", archetype: "whale", accuracy: 0.55, dump: 0.3, influence: 81, audience: 610_000, risk: "high" },
  { id: "pepeprophet", handle: "@PepeProphet", name: "Pepe Prophet", avatar: "🐸", archetype: "memelord", accuracy: 0.35, dump: 0.18, influence: 77, audience: 990_000, risk: "high" },
  { id: "shillmaster", handle: "@ShillMaster3000", name: "ShillMaster 3000", avatar: "📣", archetype: "shiller", accuracy: 0.2, dump: 0.62, influence: 64, audience: 310_000, risk: "extreme" },
  { id: "gurugainz", handle: "@GuruGainz", name: "Guru Gainz 💯", avatar: "🧘", archetype: "guru", accuracy: 0.15, dump: 0.5, influence: 58, audience: 1_200_000, risk: "extreme" },
  { id: "alphaseeker", handle: "@AlphaSeeker", name: "alpha seeker", avatar: "🔭", archetype: "alpha", accuracy: 0.5, dump: 0.28, influence: 69, audience: 210_000, risk: "high" },
  { id: "0xsensei", handle: "@0xSensei", name: "0xSensei", avatar: "🥋", archetype: "veteran", accuracy: 0.72, dump: 0.05, influence: 66, audience: 180_000, risk: "medium" },
  { id: "degendiana", handle: "@DegenDiana", name: "Degen Diana", avatar: "💅", archetype: "alpha", accuracy: 0.48, dump: 0.25, influence: 74, audience: 530_000, risk: "high" },
  { id: "lambolarry", handle: "@LamboLarry", name: "Lambo Larry", avatar: "🏎️", archetype: "guru", accuracy: 0.2, dump: 0.4, influence: 55, audience: 760_000, risk: "extreme" },
  { id: "bagholderbob", handle: "@BagholderBob", name: "Bagholder Bob", avatar: "🎒", archetype: "memelord", accuracy: 0.3, dump: 0.1, influence: 61, audience: 340_000, risk: "high" },
  { id: "silentwhale", handle: "@SilentWhale", name: "Silent Whale", avatar: "🐋", archetype: "whale", accuracy: 0.6, dump: 0.22, influence: 85, audience: 270_000, risk: "medium" },
];

export const ARCHETYPE_LABEL: Record<KolArchetype, string> = {
  alpha: "Alpha KOL",
  whale: "Whale",
  memelord: "Meme Lord",
  shiller: "Serial Shiller",
  veteran: "Veteran Trader",
  guru: "Fake Guru",
};

export function getKol(id: string | number | undefined): Kol | undefined {
  return KOLS.find((k) => k.id === id);
}

/** How well the player can read a KOL (0..1): per-KOL intel plus general knowledge. */
export function kolRead(s: GameState, k: Kol): number {
  return Math.min(1, (s.kolIntel[k.id] ?? 0) + s.player.stats.knowledge / 250);
}

/** A one-liner that only shows once the player has learned who this KOL really is. */
export function kolReadLine(s: GameState, k: Kol): string {
  const r = kolRead(s, k);
  if (r < 0.45) return "";
  if (k.dump >= 0.4) return `🧠 Your read: ${k.handle} dumps on followers. A lot.`;
  if (k.accuracy >= 0.6) return `🧠 Your read: ${k.handle} is usually right. Rare W.`;
  if (k.accuracy <= 0.25) return `🧠 Your read: ${k.handle} has never been right. Ever.`;
  return `🧠 Your read: ${k.handle} is a coin flip with a following.`;
}
