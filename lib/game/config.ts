// Every balance number in the game lives here.
import type { CoinFate, CoinTier, EventCategory, Requirement, SizeBand, StatusId } from "./types";

export const SAVE_VERSION = 1;

/** The one and only job. Rename it here and it changes everywhere. */
export const JOB = {
  name: "McDonald's",
  emoji: "🍟",
  title: "McDonald's Worker",
  baseSalary: 1800,
  /** Raise applied every `raiseEvery` months worked (lifetime). */
  raisePct: 0.03,
  raiseEvery: 6,
  maxSalary: 2600,
};

export const STATUS_ORDER: StatusId[] = ["normie", "degen", "trader", "chad", "whale", "legend"];

export const STATUSES: Record<StatusId, { emoji: string; label: string; quote: string }> = {
  normie: { emoji: "🐸", label: "NORMIE", quote: "I saw this on TikTok." },
  degen: { emoji: "🪙", label: "DEGEN", quote: "Bro this is definitely going 10x." },
  trader: { emoji: "🧠", label: "TRADER", quote: "I checked liquidity and holder distribution." },
  chad: { emoji: "🗿", label: "CHAD", quote: "I've been doing this for years." },
  whale: { emoji: "🐋", label: "WHALE", quote: "My buy moves the chart." },
  legend: { emoji: "👑", label: "LEGEND", quote: "People trade based on what I say." },
};

export const STATUS_THRESHOLDS = {
  trader: { netWorth: 10_000, knowledge: 25 },
  chad: 100_000,
  whale: 1_000_000,
  legend: 10_000_000,
};

/** Monthly living costs by status. Lifestyle inflation is a feature. */
export const EXPENSES: Record<StatusId, number> = {
  normie: 60,
  degen: 100,
  trader: 600,
  chad: 1_500,
  whale: 6_000,
  legend: 20_000,
};
/** After this age you can't live in your parents' basement any more. */
export const MOVE_OUT_AGE = 24;
export const MOVED_OUT_MIN_EXPENSES = 450;

/** Everyone starts with the same stack. It's also the baseline you rebuild to after going broke. */
export const STARTING_CASH = 5_000;
export const BASELINE_CASH = STARTING_CASH;

export const STARTING_PROFILES = [{ id: "standard", label: "Standard", cash: STARTING_CASH, weight: 1 }] as const;

/** Intraday trade simulations shown on the decision board. */
export const SIM = {
  /** Points of price history shown before you decide. */
  prePoints: 24,
  /** Points revealed per leg (three legs: first hour, afternoon, end of day). */
  legPoints: 10,
  /** Share of "something happens" months that are a trade setup instead of a story event. */
  share: 0.45,
  /** Fees + slippage taken from each simulated entry. */
  fee: 0.015,
  minCash: 50,
};

/** Position size bands as a fraction of net worth. */
export const SIZE_BANDS: Record<SizeBand, { label: string; emoji: string; pct: number; max: number }> = {
  small: { label: "Small", emoji: "🤏", pct: 0.03, max: 0.05 },
  medium: { label: "Medium", emoji: "👌", pct: 0.12, max: 0.2 },
  large: { label: "Large", emoji: "😤", pct: 0.35, max: 0.5 },
  fullsend: { label: "FULL SEND", emoji: "🗿", pct: 0.95, max: 1 },
};
export const FULL_SEND_STAT_PCT = 0.9;

// ---------------------------------------------------------------------------
// Coins
// ---------------------------------------------------------------------------

export const TIER_SPAWN: Record<CoinTier, number> = { micro: 62, small: 27, mid: 11 };

export const TIER_MC: Record<CoinTier, [number, number]> = {
  micro: [15_000, 600_000],
  small: [600_000, 8_000_000],
  mid: [8_000_000, 150_000_000],
};

export const TIER_LIQ: Record<CoinTier, [number, number]> = {
  micro: [0.08, 0.25],
  small: [0.08, 0.2],
  mid: [0.06, 0.15],
};

/** Weighted fate tables. Most coins die. Legendary is basically a lottery ticket. */
export const FATE_TABLE: Record<CoinTier, Record<CoinFate, number>> = {
  micro: { rug: 28, bleed: 22, chop: 20, pump: 22, moon: 6, mega: 1.2, legendary: 0.18 },
  small: { rug: 16, bleed: 24, chop: 28, pump: 24, moon: 6, mega: 0.8, legendary: 0.08 },
  mid: { rug: 5, bleed: 25, chop: 38, pump: 26, moon: 5.5, mega: 0.5, legendary: 0 },
};

/** Peak multiples per fate. Mid caps get dampened. */
export const FATE_PEAK: Record<CoinFate, [number, number]> = {
  rug: [1, 3],
  bleed: [1, 1],
  chop: [1, 1.6],
  pump: [1.5, 5],
  moon: [8, 50],
  mega: [80, 300],
  legendary: [400, 1500],
};
export const MID_TIER_PEAK_DAMPEN = 0.4;

export const GOOD_FATES: CoinFate[] = ["pump", "moon", "mega", "legendary"];
export const BAD_FATES: CoinFate[] = ["rug", "bleed"];

export const MARKET = {
  minCoins: 7,
  maxCoins: 14,
  spawnPerMonth: [2, 4] as [number, number],
  /** Coins are pruned once dead for this many months (unless held). */
  pruneAfter: 2,
  /** Max single buy as a fraction of the coin's liquidity. */
  maxBuyLiq: 0.6,
  /** Sell impact: proceeds lose value/(liquidity*k), capped. */
  sellImpactK: 4,
  sellImpactCap: 0.5,
};

/** Monthly price change thresholds that turn into signals on held coins. */
export const SIGNALS = {
  pump: 0.3,
  bigpump: 2,
  megapump: 10,
  crash: -0.5,
  paperhandMult: 5,
  paperhandWatchMonths: 8,
  diamondDip: 0.3,
  diamondRecover: 2,
  minPositionValue: 10,
};

export const SIGNAL_PRIORITY = ["rug", "megapump", "diamond", "bigpump", "paperhand", "crash", "pump"] as const;

// ---------------------------------------------------------------------------
// Pacing, life and death
// ---------------------------------------------------------------------------

/** Chance a random event fires in a given month. */
export function eventChance(age: number, employed: boolean): number {
  let p = employed ? 0.42 : 0.48;
  if (age >= 35) p = 0.32;
  if (age >= 50) p = 0.24;
  if (age >= 65) p = 0.16;
  return p;
}
/** "Age up" fast-forwards quiet months, up to this many. Later life moves faster. */
export function maxFastForward(age: number, inCrypto: boolean): number {
  if (!inCrypto) return 6;
  if (age >= 50) return 12;
  if (age >= 30) return 6;
  return 3;
}

export function yearlyDeathChance(age: number): number {
  if (age < 55) return 0.0005;
  return Math.min(0.6, 0.01 * Math.pow(1.12, age - 55));
}
export const MAX_AGE = 104;
export const RETIRE_MIN_AGE = 35;

export const BROKE_THRESHOLD = 5;
export const UNBROKE_THRESHOLD = 500;

export const MILESTONES = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];

/** Default requirements added to every event in a category. */
export const CATEGORY_RULES: Partial<Record<EventCategory, Requirement>> = {
  crypto: { flags: ["discovered"] },
  trade: { flags: ["discovered"] },
  kol: { flags: ["discovered"] },
  legendary: { flags: ["discovered"] },
  social: { flags: ["discovered"] },
  mcd: { employed: true },
};

/** Category weight multipliers depending on the situation. */
export function categoryWeight(cat: EventCategory, employed: boolean, age: number): number {
  if (cat === "mcd") return employed ? 3 : 0;
  if (cat === "life") return age >= 45 ? 1.6 : 1;
  if (cat === "legendary") return 1;
  return 1;
}
export const DEFAULT_EVENT_WEIGHT = 10;
export const DEFAULT_COOLDOWN = 12;

export const SOCIAL_TIERS: { min: number; label: string }[] = [
  { min: 0, label: "Nobody" },
  { min: 100, label: "Known" },
  { min: 1_000, label: "Degen" },
  { min: 5_000, label: "Trader" },
  { min: 25_000, label: "Chad" },
  { min: 100_000, label: "KOL" },
  { min: 500_000, label: "Major KOL" },
  { min: 2_000_000, label: "Legend" },
];

export const COUNTRIES = [
  "USA", "Georgia", "UK", "Germany", "Brazil", "Nigeria", "India", "Philippines", "Turkey",
  "Argentina", "Canada", "Poland", "Vietnam", "Ukraine", "France", "Australia", "Mexico",
  "Indonesia", "South Korea", "Netherlands",
];

export const FIRST_NAMES = {
  male: ["Alex", "Max", "Leo", "Nick", "Dato", "Tyler", "Kai", "Luka", "Omar", "Jake", "Mateo", "Ryan", "Sam", "Ivan", "Dev"],
  female: ["Mia", "Nino", "Zoe", "Ava", "Lena", "Sofia", "Chloe", "Ana", "Maya", "Jess", "Ella", "Nora", "Kim", "Sara", "Lily"],
  other: ["Alex", "Sam", "Robin", "Jordan", "Riley", "Charlie", "Quinn", "Sky", "Rowan", "Ari"],
};

/**
 * Player character art (public/characters). To add one: drop a trimmed transparent PNG there and add an entry.
 * `face` locates the head inside the image (percent of width/height) so avatars can crop to it;
 * `face.h` is the head's height as a fraction of the image height.
 */
export interface Portrait {
  id: string;
  src: string;
  width: number;
  height: number;
  label: string;
  face: { x: number; y: number; h: number };
}

export const PORTRAITS: Portrait[] = [
  { id: "p1", src: "/characters/1.png", width: 283, height: 523, label: "Blond hair, white tee", face: { x: 62, y: 14.5, h: 0.29 } },
  { id: "p2", src: "/characters/2.png", width: 307, height: 490, label: "Braided bun, green shirt", face: { x: 50, y: 13.5, h: 0.275 } },
];

export function getPortrait(id: string | undefined): Portrait | undefined {
  return PORTRAITS.find((p) => p.id === id);
}
