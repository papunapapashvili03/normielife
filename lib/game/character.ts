// Character creation + new game state.
import { COUNTRIES, FIRST_NAMES, PORTRAITS, SAVE_VERSION, STARTING_PROFILES } from "./config";
import { spawnCoin } from "./coins";
import { present } from "./events/engine";
import { money } from "./format";
import { addHistory } from "./history";
import { int, pick, weighted, type RngHolder } from "./rng";
import { generateFeed } from "./twitter";
import type { GameState, Stats } from "./types";

export interface CharacterDraft {
  name: string;
  gender: "male" | "female" | "other";
  country: string;
  avatar: string;
  age: number;
}

export interface Rolled {
  stats: Stats;
  profile: (typeof STARTING_PROFILES)[number];
}

/** Randomize the cosmetic parts of a character (uses its own throwaway RNG). */
export function randomDraft(seed: number): CharacterDraft {
  const h: RngHolder = { rng: seed ^ 0x5eed };
  const gender = pick(h, ["male", "female", "other"] as const);
  const name = pick(h, FIRST_NAMES[gender]);
  const country = pick(h, COUNTRIES);
  // Default art follows the rolled gender; the player can pick either.
  const avatar = gender === "male" ? PORTRAITS[0].id : gender === "female" ? PORTRAITS[1].id : pick(h, PORTRAITS).id;
  return {
    name,
    gender,
    country,
    avatar,
    age: int(h, 18, 21),
  };
}

/** Stats and starting money are always decided by the seed, BitLife-style. */
export function rollFromSeed(seed: number): Rolled {
  const h: RngHolder = { rng: seed };
  const stats: Stats = {
    luck: int(h, 10, 95),
    intelligence: int(h, 15, 90),
    risk: int(h, 20, 95),
    discipline: int(h, 10, 85),
    charisma: int(h, 10, 90),
    knowledge: int(h, 5, 15),
  };
  const profile = weighted(h, STARTING_PROFILES, (p) => p.weight);
  return { stats, profile };
}

function makeHandle(h: RngHolder, name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, "") || "anon";
  return "@" + base + pick(h, ["_eth", "_sol", "_degen", "69", "420", "_trades", "Calls", "_gm", "XBT", "_wif"]);
}

export function createGame(draft: CharacterDraft, seed: number): GameState {
  const { stats, profile } = rollFromSeed(seed);
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    rng: (seed * 2654435761) | 0,
    player: {
      name: draft.name.trim() || "Anon",
      handle: "",
      gender: draft.gender,
      country: draft.country,
      avatar: draft.avatar,
      startAge: draft.age,
      profile: profile.label,
      stats,
    },
    month: 0,
    cash: profile.cash,
    positions: [],
    coins: [],
    nextCoinId: 1,
    job: { employed: false, totalMonths: 0, stintMonths: 0, stints: 0 },
    status: "normie",
    reputation: 10,
    followers: int({ rng: seed + 7 }, 12, 240),
    flags: {},
    seen: {},
    lastSeen: {},
    queue: [],
    current: null,
    sim: null,
    signals: [],
    history: [],
    log: [],
    feed: [],
    nextTweetId: 1,
    kolIntel: {},
    soldWatch: [],
    lastBigLoss: null,
    run: {
      startCash: profile.cash,
      peakNetWorth: profile.cash,
      peakAge: draft.age,
      biggestWin: 0,
      biggestWinCoin: "",
      biggestWinProfit: 0,
      biggestLoss: 0,
      biggestLossCoin: "",
      rugs: 0,
      timesBroke: 0,
      mcdMonths: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      tens: 0,
      fifties: 0,
      hundreds: 0,
      fullSends: 0,
      paperHands: 0,
      diamondHands: 0,
      revengeTrades: 0,
      peakStatus: "normie",
      peakFollowers: 0,
      events: 0,
      posts: 0,
    },
    ended: null,
  };
  s.player.handle = makeHandle(s, s.player.name);
  for (let i = 0; i < 9; i++) spawnCoin(s);
  generateFeed(s);
  addHistory(s, "🍼", `${s.player.name}, ${draft.age}, from ${draft.country}. Starting with ${money(profile.cash)}. Never touched crypto.`, true);
  present(s, "onboard_tiktok");
  return s;
}
