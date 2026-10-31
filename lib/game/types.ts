// Core data types for the DEGEN LIFE engine. Pure data — no React.

export type StatKey =
  | "luck"
  | "intelligence"
  | "risk"
  | "discipline"
  | "charisma"
  | "knowledge";

export type Stats = Record<StatKey, number>;

/** How your character feels right now. Drives which portrait is shown. */
export type Mood = "neutral" | "very_happy" | "happy" | "disappointed" | "sad" | "very_sad" | "rage";

export type StatusId = "normie" | "degen" | "trader" | "chad" | "whale" | "legend";

export type Narrative =
  | "dogs"
  | "cats"
  | "frogs"
  | "ai"
  | "political"
  | "celebrity"
  | "gaming"
  | "tiktok"
  | "animals"
  | "food"
  | "internet"
  | "meta"
  | "stupid";

export type CoinFate = "rug" | "bleed" | "chop" | "pump" | "moon" | "mega" | "legendary";
export type CoinTier = "micro" | "small" | "mid";
export type RiskLevel = "low" | "medium" | "high" | "extreme";
export type SizeBand = "small" | "medium" | "large" | "fullsend";

export interface Coin {
  id: string;
  name: string;
  ticker: string;
  narrative: Narrative;
  tier: CoinTier;
  creator: string;
  /** Market cap at the moment the coin entered the game (price = 1). */
  launchMc: number;
  price: number;
  prevPrice: number;
  /** Hidden predetermined price multiples, one per month. */
  path: number[];
  step: number;
  fate: CoinFate;
  rugProb: number;
  trueRisk: RiskLevel;
  fakeRisk: RiskLevel;
  /** Stable 0..1 roll compared against player knowledge to decide what risk is shown. */
  riskNoise: number;
  liqRatio: number;
  volRatio: number;
  holdersBase: number;
  social: number;
  ageMonths: number;
  bornMonth: number;
  dead: boolean;
  rugged: boolean;
  deadFor: number;
  spark: number[];
}

export interface Position {
  coinId: string;
  units: number;
  /** Total dollars currently invested (cost basis of remaining units). */
  cost: number;
  openedMonth: number;
  /** Lowest value/cost multiple seen while holding. */
  minMult: number;
  diamondDone: boolean;
  /** Highest realized multiple tier already counted (10/50/100). */
  countedTier: number;
  kolId?: string;
}

export interface SoldWatch {
  coinId: string;
  soldPrice: number;
  soldValue: number;
  month: number;
}

export type SignalType =
  | "pump"
  | "bigpump"
  | "megapump"
  | "crash"
  | "rug"
  | "paperhand"
  | "diamond";

export interface Signal {
  type: SignalType;
  coinId: string;
  data: Ctx;
}

export type Ctx = Record<string, string | number>;

export interface Player {
  name: string;
  handle: string;
  gender: string;
  country: string;
  avatar: string;
  startAge: number;
  profile: string;
  stats: Stats;
}

export interface JobState {
  employed: boolean;
  totalMonths: number;
  stintMonths: number;
  stints: number;
}

export interface HistoryEntry {
  month: number;
  age: number;
  emoji: string;
  text: string;
  major: boolean;
}

export type Tone = "good" | "bad" | "neutral";

export interface LogEntry {
  month: number;
  age: number;
  text: string;
  tone: Tone;
}

export interface Tweet {
  id: number;
  month: number;
  handle: string;
  name: string;
  avatar: string;
  text: string;
  likes: number;
  rts: number;
  kind: "kol" | "meme" | "rumor" | "news" | "player" | "reply";
  coinId?: string;
}

export interface RunStats {
  startCash: number;
  peakNetWorth: number;
  peakAge: number;
  biggestWin: number;
  biggestWinCoin: string;
  biggestWinProfit: number;
  biggestLoss: number;
  biggestLossCoin: string;
  rugs: number;
  timesBroke: number;
  mcdMonths: number;
  trades: number;
  wins: number;
  losses: number;
  tens: number;
  fifties: number;
  hundreds: number;
  fullSends: number;
  paperHands: number;
  diamondHands: number;
  revengeTrades: number;
  peakStatus: StatusId;
  peakFollowers: number;
  events: number;
  posts: number;
}

export type NumericRunStat = {
  [K in keyof RunStats]: RunStats[K] extends number ? K : never;
}[keyof RunStats];

export interface EventResult {
  text: string;
  tone: Tone;
  cashDelta: number;
  nwDelta: number;
  statDeltas: Partial<Record<StatKey, number>>;
  followersDelta: number;
}

export interface ActiveEvent {
  id: string;
  ctx: Ctx;
  stage: "choose" | "result";
  /** Index of the choice that was made (set once stage is "result"). */
  choice?: number;
  result?: EventResult;
}

export interface QueuedEvent {
  event: string;
  at: number;
  ctx: Ctx;
}

export type SimScript = "moon" | "pumpdump" | "bleed" | "rug" | "fakeout" | "chop" | "legendary";
export type SimScenario = "kol" | "launch" | "dip" | "whale" | "breakout" | "rumor";

export interface SimNote {
  label: string;
  text: string;
  tone: Tone;
}

/** One intraday trade played out on the decision board. */
export interface TradeSim {
  coinId: string;
  scenario: SimScenario;
  script: SimScript;
  title: string;
  scene: string;
  read: string;
  /** Full price series (relative to the price at "now"); only `points[0..revealed]` is shown. */
  points: number[];
  preLen: number;
  legEnds: number[];
  legMults: number[];
  legsRevealed: number;
  revealed: number;
  /** "live" = the price ticks in real time and you can sell whenever (phone skin). */
  phase: "setup" | "decide" | "live" | "done";
  /** Played tick by tick instead of leg by leg. */
  live?: boolean;
  /** Came from a KOL call notification (costs a week when it ends). */
  fromCall?: boolean;
  kolId?: string;
  entered: boolean;
  passed: boolean;
  stake: number;
  realized: number;
  exits: number[];
  adds: number[];
  notes: SimNote[];
  /** What a medium bag would have done, for the "you passed" recap. */
  hypothetical: number;
}

export interface CallOffer {
  id: number;
  kolId: string;
  text: string;
  sim: TradeSim;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  player: Player;
  /** Months elapsed since the run started. */
  month: number;
  cash: number;
  positions: Position[];
  coins: Coin[];
  nextCoinId: number;
  job: JobState;
  status: StatusId;
  reputation: number;
  followers: number;
  /** Flag name -> month it was set. */
  flags: Record<string, number>;
  seen: Record<string, number>;
  lastSeen: Record<string, number>;
  queue: QueuedEvent[];
  current: ActiveEvent | null;
  /** Active trade simulation, if any. Optional for saves made before sims existed. */
  sim?: TradeSim | null;
  /** A KOL call waiting for "go in" or "ignore". */
  offer?: CallOffer | null;
  /** How a call you ignored played out, for the follow-up notification. */
  callResult?: { id: number; text: string; tone: Tone } | null;
  nextCallId?: number;
  /** Weeks used this month by calls (4 calls = one month). */
  week?: number;
  /** Latest emotional reaction and when it happened; fades after a month. */
  mood?: { kind: Mood; month: number } | null;
  signals: Signal[];
  history: HistoryEntry[];
  log: LogEntry[];
  feed: Tweet[];
  nextTweetId: number;
  kolIntel: Record<string, number>;
  soldWatch: SoldWatch[];
  lastBigLoss: { amount: number; month: number } | null;
  run: RunStats;
  ended: null | { cause: "death" | "retired"; age: number; month: number; text: string };
}

// ---------------------------------------------------------------------------
// Event definitions (content is pure data interpreted by events/engine.ts)
// ---------------------------------------------------------------------------

export type EventCategory =
  | "onboarding"
  | "crypto"
  | "trade"
  | "kol"
  | "life"
  | "mcd"
  | "social"
  | "legendary"
  | "system";

export type KolArchetype = "alpha" | "whale" | "memelord" | "shiller" | "veteran" | "guru";

export interface Kol {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  archetype: KolArchetype;
  /** Chance their calls are real (0..1). Hidden. */
  accuracy: number;
  /** Chance they dump on followers right after posting (0..1). Hidden. */
  dump: number;
  influence: number;
  audience: number;
  risk: RiskLevel;
}

/** A dollar amount: fixed, random range, or relative to the player's situation. */
export type Amount =
  | number
  | [number, number]
  | { cashPct: number }
  | { nwPct: number }
  | { salary: number }
  | { ctx: string; mult?: number };

export type Effect =
  | { type: "cash"; amount: Amount; as?: string }
  | { type: "stat"; stat: StatKey; delta: number }
  | { type: "followers"; flat?: number | [number, number]; pct?: number | [number, number] }
  | { type: "reputation"; delta: number }
  | {
      type: "spawnCoin";
      fate?: CoinFate | "luck" | "kol" | "good" | "bad";
      tier?: CoinTier;
      narrative?: Narrative;
      as?: string;
    }
  | { type: "pickKol"; archetype?: KolArchetype[]; as?: string }
  | { type: "pickHeld"; as?: string; best?: boolean }
  | { type: "pickMarket"; as?: string; trending?: boolean }
  | { type: "buy"; coin?: string; size?: SizeBand; amount?: Amount; as?: string }
  | { type: "sell"; coin?: string; fraction: number; as?: string }
  | { type: "sellAll"; as?: string }
  /** Hacks, drains, scams: every position disappears (recorded as losses). */
  | { type: "wipePositions"; as?: string }
  | { type: "coinMove"; coin?: string; mult: number | [number, number] }
  | { type: "marketMove"; mult: [number, number]; heldOnly?: boolean }
  | { type: "research"; coin?: string }
  | { type: "flag"; set?: string; clear?: string }
  | { type: "queue"; event: string; months?: number | [number, number] }
  | { type: "job"; action: "start" | "quit" }
  | { type: "history"; text: string; emoji?: string; major?: boolean }
  | { type: "runStat"; stat: NumericRunStat; delta: number }
  | { type: "kolIntel"; delta: number; kol?: string };

export interface Requirement {
  minAge?: number;
  maxAge?: number;
  minCash?: number;
  maxCash?: number;
  minNetWorth?: number;
  maxNetWorth?: number;
  minPortfolio?: number;
  maxPortfolio?: number;
  status?: StatusId[];
  minStatus?: StatusId;
  maxStatus?: StatusId;
  minStat?: Partial<Stats>;
  maxStat?: Partial<Stats>;
  minReputation?: number;
  minFollowers?: number;
  maxFollowers?: number;
  employed?: boolean;
  flags?: string[];
  notFlags?: string[];
  seen?: string[];
  notSeen?: string[];
  minRugs?: number;
  minWins?: number;
  minTimesBroke?: number;
  hasPositions?: boolean;
  /** Took a big loss within the last N months. */
  recentBigLoss?: number;
  /** Event context must contain these keys (e.g. a position bought on a KOL call). */
  ctx?: string[];
}

/** fame: log-scaled followers (0 at 1K, +1 at 100K, -1 at 10). */
export type ModKey = StatKey | "kolAccuracy" | "kolDump" | "fame";

export interface Outcome {
  weight?: number;
  /** Scales the weight by player stats (0..100 centered on 50) or KOL traits (0..1 centered on 0.5). */
  mods?: Partial<Record<ModKey, number>>;
  text: string;
  tone?: Tone;
  effects?: Effect[];
}

export interface Choice {
  text: string;
  req?: Requirement;
  outcomes: Outcome[];
}

export interface EventDef {
  id: string;
  category: EventCategory;
  emoji: string;
  title: string;
  text: string | string[];
  req?: Requirement;
  weight?: number;
  once?: boolean;
  max?: number;
  cooldown?: number;
  /** Only fires in response to a market signal of this type. */
  signal?: SignalType;
  /** Only fires when queued by another event or a game action. */
  chainOnly?: boolean;
  /** Effects applied when the event is presented (bind coins, KOLs...). Failure makes it ineligible. */
  setup?: Effect[];
  choices: Choice[];
}
