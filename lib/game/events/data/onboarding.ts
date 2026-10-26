import type { Effect, EventDef } from "../../types";

const DISCOVER: Effect[] = [
  { type: "flag", set: "discovered" },
  { type: "flag", set: "tiktok_origin" },
];

export const ONBOARDING: EventDef[] = [
  {
    id: "onboard_tiktok",
    category: "onboarding",
    chainOnly: true,
    emoji: "📱",
    title: "TIKTOK",
    text: "You're scrolling TikTok at 2am when a video autoplays:\n\n\"HOW I TURNED $300 INTO $30,000 WITH MEMECOINS.\"\n\nThe comments are full of people talking about Crypto Twitter, 100x gains, and someone called \"the dev\".\n\nYou've never traded crypto before.",
    choices: [
      {
        text: "Ignore it",
        outcomes: [
          {
            text: "You scroll past. Next video: a guy cooking pasta in a bathtub. Life goes on... for now.",
            effects: [{ type: "flag", set: "ignored_tiktok" }, { type: "queue", event: "onboard_fomo", months: [2, 5] }],
          },
        ],
      },
      {
        text: "Research crypto",
        outcomes: [
          {
            text: "You fall into a 6-hour YouTube rabbit hole. You now know what a \"wallet\" is and that \"liquidity\" matters for some reason.",
            effects: [
              ...DISCOVER,
              { type: "stat", stat: "knowledge", delta: 5 },
              { type: "stat", stat: "intelligence", delta: 1 },
              { type: "history", emoji: "📱", text: "Discovered memecoins through TikTok. Did \"research\".", major: true },
              { type: "queue", event: "onboard_first_coin", months: 0 },
            ],
          },
        ],
      },
      {
        text: "Ask a friend",
        outcomes: [{ text: "You text your friend Gio, who \"does crypto\". He replies in 4 seconds.", effects: [{ type: "queue", event: "onboard_friend", months: 0 }] }],
      },
      {
        text: "Buy your first memecoin 🦍",
        req: { minCash: 20 },
        outcomes: [
          {
            text: "You download a wallet, skip every warning, and buy {amount} of {coin}, the first ticker you saw in the comments. Market cap: {mc}. You have no idea what that means.\n\nYou feel incredible.",
            effects: [
              ...DISCOVER,
                            { type: "history", emoji: "📱", text: "Discovered memecoins through TikTok and aped immediately.", major: true },
{ type: "spawnCoin", fate: "luck", tier: "micro" },
              { type: "buy", amount: { cashPct: 0.4 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "onboard_first_coin",
    category: "onboarding",
    chainOnly: true,
    emoji: "📊",
    title: "YOUR FIRST SCREENER",
    setup: [{ type: "spawnCoin", fate: "luck", tier: "micro" }],
    text: "You open a memecoin screener for the first time. Hundreds of coins. Numbers everywhere. One catches your eye:\n\n{coin} ({coinName})\n{narrative} · MC {mc}\nCreated by {creator}.",
    choices: [
      { text: "Buy $50 to test the waters", req: { minCash: 50 }, outcomes: [{ text: "You buy {amount} of {coin}. Your hands are shaking. Over $50. You check the price 31 times in the next hour.", effects: [{ type: "buy", amount: 50 }] }] },
      { text: "Buy a real bag", req: { minCash: 100 }, outcomes: [{ text: "You put {amount} into {coin}. No going back now. You are officially a degen.", effects: [{ type: "buy", amount: { cashPct: 0.4 } }] }] },
      { text: "Research it first", outcomes: [{ text: "You open the chart, the holders tab, and the dev's Twitter. Let's see...", effects: [{ type: "research" }, { type: "queue", event: "onboard_research_result", months: 0 }] }] },
      { text: "Just watch for now", outcomes: [{ text: "You add {coin} to your watchlist. You can buy coins any time from the 🛒 Market tab. (You will check it 400 times a day.)" }] },
    ],
  },
  {
    id: "onboard_research_result",
    category: "onboarding",
    chainOnly: true,
    emoji: "🔍",
    title: "RESEARCH RESULTS",
    text: "You spent hours digging into {coin}.\n\n{verdict}",
    choices: [
      { text: "Ape in anyway", req: { minCash: 20 }, outcomes: [{ text: "Research is for people who aren't early. You buy {amount} of {coin}.", effects: [{ type: "buy", amount: { cashPct: 0.35 } }] }] },
      { text: "Small bag", req: { minCash: 20 }, outcomes: [{ text: "You buy a tiny {amount} position. Responsible degeneracy.", effects: [{ type: "buy", amount: { cashPct: 0.1 } }, { type: "stat", stat: "discipline", delta: 1 }] }] },
      { text: "Pass", outcomes: [{ text: "You pass. There will be other coins. (There will be ten thousand other coins.)", effects: [{ type: "stat", stat: "discipline", delta: 2 }] }] },
    ],
  },
  {
    id: "onboard_friend",
    category: "onboarding",
    chainOnly: true,
    emoji: "📞",
    title: "YOUR FRIEND GIO",
    text: "Gio shows you his phone: a chart going straight up.\n\n\"Bro. Solana memecoins. You're SO early.\"\n\n(You are not early.)",
    choices: [
      {
        text: "\"What should I buy?\"",
        req: { minCash: 20 },
        outcomes: [
          {
            text: "He sends you a contract address and \"trust me\". You buy {amount} of {coin} without reading a single thing.",
            effects: [
              { type: "flag", set: "discovered" },
                            { type: "history", emoji: "📞", text: "Got into memecoins because a friend said \"trust me\".", major: true },
{ type: "spawnCoin", fate: "luck", tier: "micro" },
              { type: "buy", amount: { cashPct: 0.3 } },
            ],
          },
        ],
      },
      {
        text: "\"Teach me first\"",
        outcomes: [
          {
            text: "Gio spends 3 hours explaining wallets, liquidity, and why you should never trust anyone (except him). You actually learned something.",
            effects: [
              { type: "flag", set: "discovered" },
              { type: "stat", stat: "knowledge", delta: 7 },
              { type: "stat", stat: "discipline", delta: 2 },
              { type: "history", emoji: "📞", text: "Learned crypto from a friend. Gave it a real shot.", major: true },
              { type: "queue", event: "onboard_first_coin", months: 0 },
            ],
          },
        ],
      },
      {
        text: "Decide Gio is an idiot",
        outcomes: [{ text: "You leave him on read. Gio is, in fact, an idiot. But idiots make money in bull markets.", effects: [{ type: "queue", event: "onboard_fomo", months: [3, 6] }] }],
      },
    ],
  },
  {
    id: "onboard_fomo",
    category: "onboarding",
    chainOnly: true,
    emoji: "😩",
    title: "FOMO",
    text: "Your cousin just bought a car. With memecoin money. At Sunday dinner everyone keeps asking him about \"Solana\".\n\nYour mom looks at you.",
    choices: [
      {
        text: "Fine. I'm getting in.",
        req: { minCash: 20 },
        outcomes: [
          {
            text: "You ask your cousin for a coin and buy {amount} of {coin} that same night under the table.",
            effects: [
              ...DISCOVER,
                            { type: "history", emoji: "😩", text: "Gave in to family FOMO and bought a memecoin.", major: true },
{ type: "spawnCoin", fate: "luck", tier: "micro" },
              { type: "buy", amount: { cashPct: 0.5 } },
            ],
          },
        ],
      },
      { text: "Still not interested", outcomes: [{ text: "You eat your potatoes in silence. You're above this. (For now.)", effects: [{ type: "queue", event: "onboard_fomo2", months: [4, 8] }] }] },
    ],
  },
  {
    id: "onboard_fomo2",
    category: "onboarding",
    chainOnly: true,
    emoji: "🌊",
    title: "IT'S EVERYWHERE",
    text: "Your barber talks about memecoins. Your grandma asked what a \"rug\" is. A billboard says \"WAGMI\".\n\nResistance is futile.",
    choices: [
      {
        text: "Okay okay, one coin",
        req: { minCash: 20 },
        outcomes: [
          {
            text: "You cave and buy {amount} of {coin}. The barber nods approvingly.",
            effects: [
              ...DISCOVER,
                            { type: "history", emoji: "🌊", text: "Finally caved and bought a memecoin.", major: true },
{ type: "spawnCoin", fate: "luck", tier: "micro" },
              { type: "buy", amount: { cashPct: 0.4 } },
            ],
          },
        ],
      },
      {
        text: "Learn it properly",
        outcomes: [
          {
            text: "You download a wallet and start learning. The 🛒 Market tab is now unlocked.",
            effects: [...DISCOVER, { type: "stat", stat: "knowledge", delta: 5 }, { type: "history", emoji: "🌊", text: "Started learning crypto. Late, but here.", major: true }],
          },
        ],
      },
    ],
  },
  {
    id: "onboard_seed_phrase",
    category: "crypto",
    once: true,
    weight: 30,
    req: { maxStatus: "degen" },
    emoji: "📝",
    title: "SEED PHRASE",
    text: "Your wallet shows you 12 random words.\n\n\"Write these down. Never share them with anyone.\"",
    choices: [
      { text: "Write it on paper and hide it", outcomes: [{ text: "Paper, sock drawer, done. Boring. Correct.", effects: [{ type: "stat", stat: "discipline", delta: 2 }, { type: "stat", stat: "knowledge", delta: 1 }] }] },
      { text: "Screenshot it", outcomes: [{ text: "Convenient! What could possibly go wrong?", effects: [{ type: "flag", set: "seed_screenshot" }, { type: "queue", event: "crypto_wallet_drained", months: [6, 24] }] }] },
      { text: "Google Doc called \"CRYPTO PASSWORDS\"", outcomes: [{ text: "Shared with: anyone with the link. Perfect.", effects: [{ type: "flag", set: "seed_screenshot" }, { type: "queue", event: "crypto_wallet_drained", months: [3, 15] }] }] },
    ],
  },
  {
    id: "onboard_telegram",
    category: "crypto",
    once: true,
    weight: 20,
    req: { maxStatus: "trader" },
    emoji: "💬",
    title: "TELEGRAM GROUP",
    text: "Someone adds you to a Telegram group: \"🚀 100X GEMS ONLY 🚀\". 4,000 members. The admin says the next call drops in 5 minutes.",
    choices: [
      { text: "Wait for the call", outcomes: [{ text: "You stare at the chat. Notifications on. Heart racing.", effects: [{ type: "flag", set: "tg_group" }, { type: "queue", event: "crypto_tg_call", months: 0 }] }] },
      { text: "Leave immediately", outcomes: [{ text: "You leave. Somewhere, a pump-and-dump group lost its exit liquidity.", effects: [{ type: "stat", stat: "discipline", delta: 2 }, { type: "stat", stat: "intelligence", delta: 1 }] }] },
    ],
  },
];
