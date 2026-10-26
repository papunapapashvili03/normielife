import type { Choice, EventDef, KolArchetype } from "../../types";
import { CAN_BUY, ignore, research, stat } from "./helpers";

/** APE / RESEARCH / IGNORE — outcomes depend on the KOL's hidden accuracy & dump habits. */
function kolCallChoices(size: "small" | "medium" | "large" = "medium"): Choice[] {
  return [
    {
      text: "🦍 APE",
      req: CAN_BUY,
      outcomes: [
        { weight: 2, mods: { kolDump: 1.2 }, text: "You ape {amount}. {kol}'s wallet sells into your buy. {coin} {moved} in an hour.", effects: [{ type: "buy", size }, { type: "coinMove", mult: [0.15, 0.5] }, { type: "kolIntel", delta: 0.2 }] },
        { weight: 2, mods: { kolAccuracy: 1.2 }, text: "You ape {amount}. {kol}'s audience piles in. {coin} {moved}!", effects: [{ type: "buy", size }, { type: "coinMove", mult: [1.3, 3] }, { type: "kolIntel", delta: 0.15 }] },
        { weight: 1, text: "You ape {amount}. The chart wiggles. Nobody cares. You wait.", effects: [{ type: "buy", size }, { type: "kolIntel", delta: 0.1 }] },
      ],
    },
    research("You check {kol}'s wallet history and {coin}'s holders..."),
    ignore("You scroll past. {kol} will post another one in 20 minutes anyway.", "IGNORE"),
  ];
}

function kolCall(id: string, archetypes: KolArchetype[] | undefined, weight: number, text: string | string[], emoji = "🐦", title = "CRYPTO TWITTER"): EventDef {
  return {
    id,
    category: "kol",
    weight,
    cooldown: 3,
    emoji,
    title,
    setup: [{ type: "pickKol", archetype: archetypes }, { type: "spawnCoin", fate: "kol" }],
    text,
    choices: kolCallChoices(),
  };
}

export const KOL_EVENTS: EventDef[] = [
  kolCall("kol_shill", undefined, 18, [
    "{kol} just posted:\n\n\"This is the one.\"\n\n{coin} · MC {mc}\n\n{kolRead}",
    "{kol}: \"Not financial advice but {coin} is going to change my life. And yours.\"\n\nMC {mc}\n\n{kolRead}",
  ]),
  kolCall("kol_alpha_call", ["alpha"], 12, "{kol} (Alpha KOL) posted a contract address with one word: \"early.\"\n\n{coin} · MC {mc}\n\n{kolRead}"),
  kolCall("kol_guru_100x", ["guru"], 10, "{kol}: \"{coin} is a GUARANTEED 100x. I've never been more sure. My students are already in.\"\n\nMC {mc}\n\n{kolRead}", "💯", "GURU CALL"),
  kolCall("kol_veteran_call", ["veteran"], 5, "{kol} rarely posts calls. Today: \"Took a position in {coin}. Small. Thesis below 🧵\"\n\nMC {mc}\n\n{kolRead}", "🥋", "RARE CALL"),
  kolCall("kol_whale_buy", ["whale"], 8, "{kol} just bought $2M of {coin} and posted the transaction.\n\nMC {mc}. Copy the whale?\n\n{kolRead}", "🐋", "WHALE ALERT"),
  kolCall("kol_memelord", ["memelord"], 8, "{kol} posted a meme with {coin} in it. It has 80K likes. The coin is up 300% on the meme alone.\n\nMC {mc}\n\n{kolRead}", "🐸", "MEME LORD"),
  {
    id: "kol_paid_shill_offer",
    category: "kol",
    weight: 10,
    req: { minFollowers: 3_000 },
    emoji: "💼",
    title: "PAID PROMO",
    setup: [{ type: "spawnCoin", fate: "bad" }],
    text: "A \"marketing agency\" DMs you: they'll pay you to tweet about {coin}.\n\n\"Just say you're bullish. No need to disclose 😉\"",
    choices: [
      {
        text: "Take the money",
        outcomes: [
          { weight: 3, text: "You tweet. You get paid {amount}. Your followers buy. It dumps. Your replies are... not kind.", effects: [{ type: "cash", amount: [1500, 8000] }, { type: "reputation", delta: -6 }, { type: "followers", pct: [-0.06, -0.01] }] },
          { weight: 1, text: "You get paid {amount}. Nobody notices. Easy money. This time.", effects: [{ type: "cash", amount: [1500, 8000] }, { type: "reputation", delta: -2 }, { type: "flag", set: "paid_shiller" }, { type: "queue", event: "social_exposed", months: [3, 12] }] },
        ],
      },
      ignore("You decline. Your reputation is worth more than their money.", "Decline", [{ type: "reputation", delta: 2 }]),
    ],
  },
  {
    id: "kol_reply",
    category: "kol",
    weight: 8,
    req: { minFollowers: 300 },
    emoji: "💬",
    setup: [{ type: "pickKol" }],
    title: "NOTICED",
    text: "{kol} replied to your tweet!\n\n\"based\"",
    choices: [
      { text: "Screenshot it", outcomes: [{ text: "You frame it. Your followers notice. +{followersGain} followers.", effects: [{ type: "followers", flat: [50, 900] }, { type: "kolIntel", delta: 0.05 }] }] },
      { text: "Reply \"ser pls follow\"", outcomes: [{ weight: 1, mods: { charisma: 0.5 }, text: "{kol} follows you back! +{followersGain} followers.", effects: [{ type: "followers", flat: [300, 3000] }] }, { weight: 1, text: "{kol} blocks you. Too thirsty.", effects: [] }] },
    ],
  },
  {
    id: "kol_drama",
    category: "kol",
    weight: 7,
    setup: [{ type: "pickKol", archetype: ["alpha", "guru", "shiller"] }, { type: "pickKol", archetype: ["veteran", "whale", "memelord"], as: "kol2" }],
    emoji: "🍿",
    title: "CT DRAMA",
    text: "{kol} and another big account are publicly accusing each other of rugging followers. CT is on fire.",
    choices: [
      { text: "Pick a side", outcomes: [{ weight: 1, mods: { charisma: 0.5 }, text: "Your spicy take gets traction. +{followersGain} followers.", effects: [{ type: "followers", flat: [20, 800] }] }, { weight: 1, text: "Both sides' fans dunk on you. Neutrality was an option.", effects: [{ type: "followers", flat: [-30, 0] }] }] },
      ignore("You grab popcorn and learn a lot about who's actually rugging whom.", "Watch the chaos", [{ type: "kolIntel", delta: 0.3 }, stat("knowledge", 1)]),
    ],
  },
  {
    id: "kol_exposed",
    category: "kol",
    weight: 6,
    setup: [{ type: "pickKol", archetype: ["guru", "shiller", "alpha"] }],
    emoji: "🔎",
    title: "EXPOSED",
    text: "On-chain sleuth @OnChainSherlock just published a thread: {kol} was paid $40K per shill post and sold on followers every time.\n\nReceipts included.",
    choices: [ignore("You will never look at {kol} the same way.", "Noted", [{ type: "kolIntel", delta: 0.6 }, stat("knowledge", 2)])],
  },
  {
    id: "kol_group_invite",
    category: "kol",
    weight: 8,
    once: true,
    req: { minFollowers: 15_000 },
    emoji: "🕴️",
    title: "THE GROUP CHAT",
    setup: [{ type: "pickKol", archetype: ["alpha", "shiller"] }],
    text: "{kol} invites you to a private group chat with 30 KOLs.\n\nThe rules: buy before everyone posts. Post together. Sell to followers.",
    choices: [
      { text: "Join the cabal", outcomes: [{ text: "You're in. Your morals are out.", effects: [{ type: "flag", set: "kol_cabal" }, { type: "reputation", delta: -3 }, { type: "history", emoji: "🕴️", text: "Joined a KOL cabal group chat.", major: true }] }] },
      ignore("You decline. You want to win, but not like that.", "Decline", [{ type: "reputation", delta: 4 }]),
    ],
  },
  {
    id: "kol_cabal_call",
    category: "kol",
    weight: 14,
    cooldown: 3,
    req: { flags: ["kol_cabal"] },
    emoji: "🕴️",
    title: "CABAL CALL",
    setup: [{ type: "spawnCoin", fate: "luck" }],
    text: "The group chat picks {coin} (MC {mc}). Everyone buys now, posts in 10 minutes, sells into the followers.",
    choices: [
      {
        text: "Execute the plan",
        req: CAN_BUY,
        outcomes: [
          { weight: 4, text: "You buy {amount}, post, and sell for {proceeds} into your own followers. You feel rich. And a bit gross.", effects: [{ type: "buy", size: "medium" }, { type: "coinMove", mult: [2, 4] }, { type: "sell", fraction: 1 }, { type: "reputation", delta: -3 }, { type: "followers", pct: [-0.03, 0] }] },
          { weight: 1, text: "Someone in the chat front-ran everyone. You buy {amount} and the coin is already dumping. {moved}.", effects: [{ type: "buy", size: "medium" }, { type: "coinMove", mult: [0.2, 0.5] }] },
          { weight: 1, text: "The chat gets leaked. Screenshots everywhere. Your name is in them.", effects: [{ type: "reputation", delta: -15 }, { type: "followers", pct: [-0.25, -0.1] }, { type: "flag", clear: "kol_cabal" }, { type: "history", emoji: "📸", text: "Got exposed in a leaked KOL cabal chat.", major: true }] },
        ],
      },
      ignore("You leave the chat. Your conscience thanks you.", "Leave the chat", [{ type: "flag", clear: "kol_cabal" }, { type: "reputation", delta: 3 }]),
    ],
  },
  {
    id: "kol_space",
    category: "kol",
    weight: 6,
    req: { minFollowers: 1_000 },
    setup: [{ type: "pickKol" }],
    emoji: "🎙️",
    title: "TWITTER SPACE",
    text: "{kol} invites you to speak in a Twitter Space with 6,000 listeners.",
    choices: [
      { text: "Speak", outcomes: [{ weight: 1, mods: { charisma: 1 }, text: "You're funny, sharp, and a little unhinged. Perfect. +{followersGain} followers.", effects: [{ type: "followers", flat: [200, 4000] }] }, { weight: 1, text: "Your mic is muted the whole time. Nobody notices.", effects: [] }] },
      ignore("You decline. Anxiety wins today.", "Decline"),
    ],
  },
  {
    id: "kol_learn",
    category: "kol",
    weight: 6,
    req: { minStat: { knowledge: 30 } },
    setup: [{ type: "pickKol" }],
    emoji: "📒",
    title: "KOL SPREADSHEET",
    text: "You start a spreadsheet tracking every call {kol} has ever made and what happened after.",
    choices: [ignore("The data doesn't lie. You understand {kol} much better now. {kolRead}", "Study it", [{ type: "kolIntel", delta: 0.5 }, stat("knowledge", 2)])],
  },
];
