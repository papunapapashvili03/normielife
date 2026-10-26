// Procedural memecoin generator + hidden price paths.
import {
  BAD_FATES,
  FATE_PEAK,
  FATE_TABLE,
  GOOD_FATES,
  JOB,
  MID_TIER_PEAK_DAMPEN,
  TIER_LIQ,
  TIER_MC,
  TIER_SPAWN,
} from "./config";
import { chance, int, logRange, pick, rand, range, weightedKey, type RngHolder } from "./rng";
import type { Coin, CoinFate, CoinTier, GameState, Narrative, RiskLevel } from "./types";

export const NARRATIVE_LABEL: Record<Narrative, string> = {
  dogs: "🐶 Dogs",
  cats: "🐱 Cats",
  frogs: "🐸 Frogs",
  ai: "🤖 AI",
  political: "🏛️ Political",
  celebrity: "⭐ Celebrity",
  gaming: "🎮 Gaming",
  tiktok: "📱 TikTok",
  animals: "🦛 Animals",
  food: "🍕 Food",
  internet: "🌐 Internet",
  meta: "🧬 Meta",
  stupid: "🪨 Stupid",
};

const CORES: Record<Narrative, string[]> = {
  dogs: ["DOG", "DOGE", "WOOF", "PUP", "DOGGO", "SHIBBY", "HUSKY", "CORGI", "PUG", "BORK"],
  cats: ["CAT", "KITTY", "MEOW", "PURR", "CHONK", "TABBY", "MOGGY", "KITTEN"],
  frogs: ["FROG", "PEPE", "TOAD", "RIBBIT", "FROGGY", "KERMY", "TADPOLE"],
  ai: ["AI", "GPT", "BOT", "AGENT", "NEURAL", "LLM", "ROBOT", "CYBORG", "TERMINAL"],
  political: ["POTUS", "SENATOR", "VOTE", "TAXMAN", "LOBBY", "MAYOR", "DEBATE", "CONGRESS"],
  celebrity: ["POPSTAR", "RAPPER", "STREAMER", "BOXER", "ACTOR", "DIVA", "MELON", "INFLUENCER"],
  gaming: ["GAMER", "NOOB", "BOSS", "LOOT", "SPEEDRUN", "RAGEQUIT", "RESPAWN", "PIXEL"],
  tiktok: ["SKIBIDI", "RIZZ", "GYATT", "SIGMA", "OHIO", "MEWING", "NPC", "AURA", "FANUM"],
  animals: ["HIPPO", "PENGU", "OTTER", "GOAT", "MONKE", "HAMSTER", "DUCK", "SEAL", "CAPY", "SLOTH"],
  food: ["PIZZA", "TACO", "BURGER", "NOODLE", "SUSHI", "NUGGET", "FRIES", "PICKLE", "BANANA", "DONUT"],
  internet: ["CHUNGUS", "WOJAK", "DOOMER", "STONKS", "HODL", "NGMI", "WAGMI", "COPE", "SEETHE", "BONER"],
  meta: ["CHAIN", "STAKE", "BRIDGE", "LAYER", "MEMEFI", "RESTAKE", "DEPIN", "ORACLE"],
  stupid: ["ROCK", "SPOON", "CHAIR", "TOASTER", "SOCK", "BRICK", "GRASS", "NOTHING", "CARDBOARD", "DIRT", "WATER"],
};

const PREFIXES = [
  "MOON", "BABY", "SUPER", "MEGA", "GIGA", "BASED", "TURBO", "ROBOT", "DARK", "SAD", "ANGRY",
  "SMOL", "BIG", "WIZARD", "SPACE", "NINJA", "KING", "LIL", "CHAD", "RICH", "BROKE", "DEGEN",
  "HYPER", "QUANTUM", "ZOMBIE", "GOLDEN", "CYBER", "DRUNK", "SLEEPY", "HAPPY", "FAT", "TINY",
];
const SUFFIXES = ["AI", "INU", "COIN", "WIF", "HAT", "X", "CEO", "KING", "MOON", "ZILLA", "GPT", "2", "DAO", "BOY"];

const CREATORS = [
  "an anonymous dev",
  "a 14-year-old from Ohio",
  "a guy who rugged 3 coins last week",
  "an AI agent",
  "a mysterious fresh wallet",
  `a former ${JOB.name} employee`,
  "a 'doxxed' dev (it's a stock photo)",
  "a Telegram group of 40 bundlers",
  "someone's uncle",
  "a dev who swears he's 'not like the others'",
  "a cult of frog enthusiasts",
  "a guy livestreaming from his car",
  "a retired banker 'having fun'",
  "a dev with 'trust me bro' in bio",
  "the community (no dev, allegedly)",
];

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function generateName(h: RngHolder, narrative: Narrative): { name: string; ticker: string } {
  const core = pick(h, CORES[narrative]);
  const r = rand(h);
  let parts: string[];
  if (r < 0.45) parts = [pick(h, PREFIXES), core];
  else if (r < 0.75) parts = [core, pick(h, SUFFIXES)];
  else if (r < 0.9) {
    const other = pick(h, Object.keys(CORES) as Narrative[]);
    parts = [pick(h, CORES[other]), core];
  } else parts = [core];
  if (parts.length === 2 && parts[0] === parts[1]) parts = [parts[0]];
  const ticker = parts.join("").slice(0, 12);
  const name = parts.map(titleCase).join(" ");
  return { name, ticker };
}

export function rollTier(h: RngHolder, statusIdx = 0): CoinTier {
  const table = { ...TIER_SPAWN };
  // Richer players see more established coins.
  table.mid *= 1 + statusIdx * 0.5;
  table.small *= 1 + statusIdx * 0.2;
  return weightedKey(h, table);
}

/** Roll a fate. Luck tilts the table a little. */
export function rollFate(h: RngHolder, tier: CoinTier, luck = 50, bias: "none" | "good" | "bad" = "none"): CoinFate {
  const table = { ...FATE_TABLE[tier] };
  const l = (luck - 50) / 50; // -1..1
  for (const f of GOOD_FATES) table[f] *= 1 + l * 0.35;
  for (const f of BAD_FATES) table[f] *= 1 - l * 0.15;
  if (bias === "good") {
    for (const f of BAD_FATES) table[f] *= 0.35;
    for (const f of GOOD_FATES) table[f] *= 2.2;
  } else if (bias === "bad") {
    for (const f of BAD_FATES) table[f] *= 2.5;
    for (const f of GOOD_FATES) table[f] *= 0.3;
  }
  return weightedKey(h, table);
}

/** Pre-generate the hidden price path (multiples of discovery price). */
export function generatePath(h: RngHolder, fate: CoinFate, tier: CoinTier): number[] {
  const path: number[] = [1];
  let p = 1;
  const push = (m: number) => {
    p = Math.max(0, p * m);
    path.push(p);
  };
  const [pk0, pk1] = FATE_PEAK[fate];
  let peak = pk0 === pk1 ? pk0 : logRange(h, pk0, pk1);
  if (tier === "mid" && peak > 1.2) peak = Math.max(1.2, 1 + (peak - 1) * MID_TIER_PEAK_DAMPEN);

  const rise = (months: number, target: number, dip: boolean) => {
    const start = p;
    const dipAt = dip ? int(h, 1, Math.max(1, months - 1)) : -1;
    for (let i = 1; i <= months; i++) {
      const ideal = start * Math.pow(target / start, i / months);
      if (i === dipAt) push(range(h, 0.08, 0.3));
      else if (i === months) {
        path.push(ideal);
        p = ideal;
      } else push((ideal / p) * range(h, 0.7, 1.35));
    }
  };
  const bleedOut = (months: number, lo: number, hi: number) => {
    for (let i = 0; i < months; i++) push(range(h, lo, hi));
  };

  // Established coins move slower in both directions.
  const calm = tier === "mid";
  switch (fate) {
    case "rug": {
      const months = int(h, 0, 3);
      if (months > 0) rise(months, peak, false);
      path.push(0);
      break;
    }
    case "bleed":
      if (calm) bleedOut(int(h, 6, 14), 0.78, 1.02);
      else bleedOut(int(h, 6, 14), 0.45, 0.95);
      break;
    case "chop":
      if (calm) bleedOut(int(h, 6, 14), 0.8, 1.25);
      else {
        bleedOut(int(h, 4, 10), 0.6, 1.5);
        bleedOut(int(h, 4, 8), 0.5, 0.9);
      }
      break;
    case "pump":
      rise(int(h, 1, 3), peak, false);
      push(calm ? range(h, 0.5, 0.8) : range(h, 0.15, 0.55));
      bleedOut(int(h, 4, 10), calm ? 0.8 : 0.5, 1.1);
      break;
    case "moon":
    case "mega":
    case "legendary": {
      const months = fate === "moon" ? int(h, 2, 5) : fate === "mega" ? int(h, 3, 7) : int(h, 4, 9);
      rise(months, peak, chance(h, 0.25));
      if (chance(h, 0.25)) path.push(0);
      else {
        push(range(h, 0.1, 0.45));
        bleedOut(int(h, 6, 16), 0.6, 1.15);
      }
      break;
    }
  }
  return path;
}

function trueRiskFor(fate: CoinFate, tier: CoinTier): RiskLevel {
  if (fate === "rug") return "extreme";
  if (tier === "mid") return fate === "bleed" ? "high" : "medium";
  if (fate === "bleed") return "high";
  if (fate === "chop") return "medium";
  return "high";
}

const RISKS: RiskLevel[] = ["low", "medium", "high", "extreme"];

export interface SpawnOpts {
  fate?: CoinFate | "luck" | "good" | "bad";
  tier?: CoinTier;
  narrative?: Narrative;
}

export function spawnCoin(s: GameState, opts: SpawnOpts = {}, statusIdx = 0): Coin {
  const narrative = opts.narrative ?? pick(s, Object.keys(CORES) as Narrative[]);
  const tier = opts.tier ?? rollTier(s, statusIdx);
  const luck = s.player.stats.luck;
  let fate: CoinFate;
  if (!opts.fate || opts.fate === "luck") fate = rollFate(s, tier, luck);
  else if (opts.fate === "good" || opts.fate === "bad") fate = rollFate(s, tier, luck, opts.fate);
  else fate = opts.fate;

  const { name, ticker } = generateName(s, narrative);
  const [mc0, mc1] = TIER_MC[tier];
  const [lq0, lq1] = TIER_LIQ[tier];
  const rugBase = fate === "rug" ? range(s, 0.45, 0.85) : range(s, 0.05, 0.45);
  const coin: Coin = {
    id: `c${s.nextCoinId++}`,
    name,
    ticker,
    narrative,
    tier,
    creator: pick(s, CREATORS),
    launchMc: logRange(s, mc0, mc1),
    price: 1,
    prevPrice: 1,
    path: generatePath(s, fate, tier),
    step: 0,
    fate,
    rugProb: tier === "mid" ? rugBase * 0.3 : rugBase,
    trueRisk: trueRiskFor(fate, tier),
    fakeRisk: pick(s, RISKS),
    riskNoise: rand(s),
    liqRatio: range(s, lq0, lq1),
    volRatio: range(s, 0.2, 1.5),
    holdersBase: Math.round(range(s, 0.002, 0.006) * logRange(s, mc0, mc1)),
    social: int(s, 5, 95),
    ageMonths: 0,
    bornMonth: s.month,
    dead: false,
    rugged: false,
    deadFor: 0,
    spark: [1],
  };
  s.coins.push(coin);
  return coin;
}

export function getCoin(s: GameState, id: string | number | undefined): Coin | undefined {
  if (id === undefined) return undefined;
  return s.coins.find((c) => c.id === id);
}

export function marketCap(c: Coin): number {
  return c.launchMc * c.price;
}
export function liquidity(c: Coin): number {
  return c.rugged ? 0 : marketCap(c) * c.liqRatio;
}
export function volume(c: Coin): number {
  const change = Math.abs(lastChange(c));
  return marketCap(c) * c.volRatio * (0.3 + Math.min(3, change));
}
export function holders(c: Coin): number {
  return Math.max(12, Math.round(c.holdersBase * Math.sqrt(Math.max(0.01, c.price)) * (1 + c.ageMonths * 0.15)));
}
export function lastChange(c: Coin): number {
  if (c.prevPrice <= 0) return 0;
  return c.price / c.prevPrice - 1;
}
/** 0..5 flames */
export function momentum(c: Coin): number {
  const ch = lastChange(c);
  if (c.dead) return 0;
  if (ch >= 5) return 5;
  if (ch >= 1.5) return 4;
  if (ch >= 0.5) return 3;
  if (ch >= 0.1) return 2;
  if (ch >= -0.2) return 1;
  return 0;
}

/** What the player *thinks* the risk is. Knowledge decides how often it's the truth. */
export function shownRisk(c: Coin, knowledge: number): RiskLevel | "unknown" {
  if (knowledge < 12) return "unknown";
  return c.riskNoise < knowledge / 100 ? c.trueRisk : c.fakeRisk;
}

export function isGoodFate(f: CoinFate): boolean {
  return GOOD_FATES.includes(f);
}
