import type { EventDef } from "../../types";
import { ignore, stat } from "./helpers";

const POSTED = { type: "runStat", stat: "posts", delta: 1 } as const;

export const SOCIAL: EventDef[] = [
  {
    id: "social_post",
    category: "social",
    chainOnly: true,
    emoji: "🐦",
    title: "POST ON CRYPTO TWITTER",
    text: "{followers} followers are waiting for your next take. (Or 3 bots and your mom.)\n\nWhat do you post?",
    choices: [
      {
        text: "Shill your biggest bag",
        req: { hasPositions: true },
        outcomes: [
          { weight: 4, mods: { fame: -1 }, text: "\"I'm watching {coin} 👀\" — nobody cares. 2 likes.", effects: [{ type: "pickHeld", best: true }, POSTED] },
          { weight: 2, mods: { charisma: 0.4 }, text: "\"I'm watching {coin} 👀\" — decent engagement. +{followersGain} followers.", effects: [{ type: "pickHeld", best: true }, { type: "followers", flat: [10, 200], pct: [0.01, 0.04] }, POSTED] },
          { weight: 1, mods: { fame: 1.2, charisma: 0.5 }, text: "\"I'm watching {coin} 👀\" goes VIRAL. Your followers ape. {coin} {moved}! +{followersGain} followers.", effects: [{ type: "pickHeld", best: true }, { type: "coinMove", mult: [1.3, 2.5] }, { type: "followers", flat: [100, 1500], pct: [0.05, 0.15] }, { type: "reputation", delta: 2 }, POSTED, { type: "history", emoji: "🐦", text: "Shilled {coin} on CT and moved the chart." }] },
          { weight: 1, mods: { fame: 0.5 }, text: "People call you a shiller and a scammer. The quote tweets are brutal.", effects: [{ type: "pickHeld", best: true }, { type: "reputation", delta: -3 }, { type: "followers", pct: [-0.04, -0.01] }, POSTED] },
        ],
      },
      {
        text: "Post a meme",
        outcomes: [
          { weight: 3, text: "Your meme gets {followersGain} new followers. Mid, but honest work.", effects: [{ type: "followers", flat: [0, 60] }, POSTED] },
          { weight: 1, mods: { charisma: 1 }, text: "Your meme is EVERYWHERE. Even {kolName} reposted it. +{followersGain} followers.", effects: [{ type: "pickKol" }, { type: "followers", flat: [500, 8000], pct: [0.05, 0.2] }, POSTED, { type: "history", emoji: "😂", text: "Posted a meme that went viral on CT." }] },
        ],
      },
      {
        text: "Share your PnL",
        req: { minWins: 1 },
        outcomes: [
          { weight: 2, mods: { fame: 0.3 }, text: "Green PnL screenshot: +{followersGain} followers. CT loves a winner.", effects: [{ type: "followers", flat: [20, 400], pct: [0.02, 0.06] }, POSTED] },
          { weight: 1, text: "Replies: \"fake\", \"photoshop\", \"show the losses\". You don't show the losses.", effects: [{ type: "reputation", delta: -1 }, POSTED] },
        ],
      },
      {
        text: "Give genuine advice",
        outcomes: [
          { weight: 2, text: "\"Take profits. Check liquidity. Don't marry bags.\" A few people thank you. +{followersGain}.", effects: [{ type: "followers", flat: [5, 120] }, { type: "reputation", delta: 2 }, POSTED] },
          { weight: 1, mods: { knowledge: 0.6 }, text: "Your thread on avoiding rugs gets bookmarked 20K times. Respect earned. +{followersGain}.", effects: [{ type: "followers", flat: [200, 3000], pct: [0.03, 0.1] }, { type: "reputation", delta: 5 }, POSTED] },
        ],
      },
      {
        text: "Call out a scam",
        req: { minStat: { knowledge: 30 } },
        outcomes: [
          { weight: 1, text: "You expose a bundled coin. You save some people money. +{followersGain}.", effects: [{ type: "followers", flat: [30, 900] }, { type: "reputation", delta: 4 }, POSTED] },
          { weight: 1, text: "The dev's alt accounts swarm your replies. You're \"FUDding\". Reputation holds.", effects: [{ type: "reputation", delta: 1 }, POSTED] },
        ],
      },
    ],
  },
  {
    id: "social_viral",
    category: "social",
    weight: 5,
    cooldown: 12,
    emoji: "📈",
    title: "VIRAL",
    text: "A random tweet you posted months ago about getting rugged suddenly goes viral.",
    choices: [ignore("+{followersGain} followers overnight. Pain is content.", "Ride the wave", [{ type: "followers", flat: [200, 5000], pct: [0.02, 0.1] }])],
  },
  {
    id: "social_hater",
    category: "social",
    weight: 6,
    req: { minFollowers: 2_000 },
    emoji: "🤡",
    title: "HATER",
    text: "An anon account has made it their mission to quote-tweet everything you post with a clown emoji.",
    choices: [
      { text: "Clap back", outcomes: [{ weight: 1, mods: { charisma: 0.8 }, text: "Your clap back is legendary. The anon deletes their account. +{followersGain}.", effects: [{ type: "followers", flat: [100, 2000] }] }, { weight: 1, text: "You lose the argument to an anime pfp. Painful.", effects: [{ type: "followers", pct: [-0.02, 0] }] }] },
      ignore("You block them. Peace.", "Block", [stat("discipline", 1)]),
    ],
  },
  {
    id: "social_milestone",
    category: "social",
    weight: 15,
    once: true,
    req: { minFollowers: 10_000 },
    emoji: "🎉",
    title: "10K FOLLOWERS",
    text: "You just hit 10,000 followers. People actually listen to you now. Terrifying.",
    choices: [ignore("You post a thank-you thread. Even your haters like it.", "Thank the community", [{ type: "reputation", delta: 3 }, { type: "history", emoji: "🎉", text: "Hit 10K followers on Crypto Twitter.", major: true }])],
  },
  {
    id: "social_become_kol",
    category: "social",
    weight: 20,
    once: true,
    req: { minFollowers: 100_000 },
    emoji: "📣",
    title: "YOU ARE A KOL",
    text: "100,000 followers. When you post a coin, it moves. Projects are in your DMs offering bags.\n\nYou've become the thing you used to buy from.",
    choices: [
      ignore("You promise yourself: only post what you actually hold and believe in.", "Use the power responsibly", [{ type: "reputation", delta: 6 }, { type: "history", emoji: "📣", text: "Became a KOL with 100K followers.", major: true }]),
      ignore("You open your DMs to paid promos. The money is incredible. The morals are flexible.", "Monetize", [{ type: "reputation", delta: -6 }, { type: "cash", amount: [20_000, 80_000] }, { type: "history", emoji: "📣", text: "Became a KOL and started taking paid promos.", major: true }]),
    ],
  },
  {
    id: "social_podcast",
    category: "social",
    weight: 6,
    req: { minFollowers: 30_000 },
    emoji: "🎧",
    title: "PODCAST INVITE",
    text: "A big crypto podcast wants you on to tell your story.",
    choices: [
      { text: "Go on the show", outcomes: [{ weight: 2, mods: { charisma: 0.6 }, text: "Great episode. You tell the {job} story. People love it. +{followersGain}.", effects: [{ type: "followers", flat: [1000, 15000] }, { type: "reputation", delta: 3 }] }, { weight: 1, text: "You accidentally reveal your bags on air. Front-runners are already in them.", effects: [{ type: "followers", flat: [200, 2000] }] }] },
      ignore("You decline. Mystery is a brand.", "Decline"),
    ],
  },
  {
    id: "social_brand_deal",
    category: "social",
    weight: 6,
    req: { minFollowers: 50_000 },
    emoji: "🤝",
    title: "BRAND DEAL",
    text: "A crypto exchange offers you a sponsorship deal to post about them once a week.",
    choices: [
      { text: "Sign it", outcomes: [{ weight: 3, text: "Easy money: {amount}.", effects: [{ type: "cash", amount: [10_000, 60_000] }] }, { weight: 1, text: "You got {amount}... and then the exchange collapsed. Your followers are furious.", effects: [{ type: "cash", amount: [10_000, 60_000] }, { type: "reputation", delta: -8 }, { type: "followers", pct: [-0.15, -0.05] }, { type: "history", emoji: "🤝", text: "Promoted an exchange that collapsed.", major: true }] }] },
      ignore("You pass. Never shill what you don't control.", "Pass", [{ type: "reputation", delta: 1 }]),
    ],
  },
  {
    id: "social_doxxed",
    category: "social",
    weight: 4,
    once: true,
    req: { minFollowers: 80_000 },
    emoji: "🕵️",
    title: "DOXXED",
    text: "Someone posted your real name and city. Your DMs are full of people asking for money.",
    choices: [
      { text: "Hire security", outcomes: [{ text: "You hire security and move. -{cost}. Safe, poorer.", effects: [{ type: "cash", amount: [-40_000, -10_000], as: "cost" }] }] },
      ignore("You lean into it and do a face reveal. Charisma check passed.", "Face reveal", [{ type: "followers", pct: [0.05, 0.12] }, stat("charisma", 2)]),
    ],
  },
  {
    id: "social_exposed",
    category: "social",
    chainOnly: true,
    emoji: "📸",
    title: "EXPOSED",
    text: "@OnChainSherlock just posted a thread about undisclosed paid promos. Your wallet is in it.",
    choices: [
      ignore("You apologize publicly. Some forgive you. Most don't.", "Apologize", [{ type: "reputation", delta: -6 }, { type: "followers", pct: [-0.12, -0.04] }]),
      ignore("You deny everything. The receipts are on-chain. It goes badly.", "Deny everything", [{ type: "reputation", delta: -12 }, { type: "followers", pct: [-0.25, -0.1] }, { type: "history", emoji: "📸", text: "Exposed for undisclosed paid promos.", major: true }]),
    ],
  },
  {
    id: "social_alpha_group",
    category: "social",
    weight: 6,
    once: true,
    req: { minFollowers: 20_000 },
    emoji: "💎",
    title: "START A PAID GROUP?",
    text: "Fans keep asking for your \"real calls\". You could start a paid alpha group: $50/month.",
    choices: [
      { text: "Launch it", outcomes: [{ text: "Hundreds subscribe. You made {amount} in the first month. Now you have to actually be right.", effects: [{ type: "cash", amount: [5_000, 40_000] }, { type: "flag", set: "alpha_group" }] }] },
      ignore("You keep your calls free. Respect.", "Keep it free", [{ type: "reputation", delta: 3 }]),
    ],
  },
];
