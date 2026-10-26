import type { Choice, EventDef } from "../../types";
import { ignore } from "./helpers";

const AFTER_MOON: Choice[] = [
  { text: "💰 SELL EVERYTHING", outcomes: [{ text: "You sell for {proceeds}. You scream into a pillow. Life-changing.", effects: [{ type: "sell", fraction: 1 }] }] },
  { text: "Sell half", outcomes: [{ text: "You sell half for {proceeds} and let the rest ride. Balanced. Like all things should be.", effects: [{ type: "sell", fraction: 0.5 }] }] },
  ignore("You hold for 1000x. You are either a genius or a cautionary tale.", "💎 Hold for 1000x"),
];

export const LEGENDARY: EventDef[] = [
  {
    id: "leg_100x",
    category: "legendary",
    weight: 1.2,
    cooldown: 60,
    req: { minCash: 50 },
    emoji: "🚨",
    title: "YOU FOUND A 100X",
    setup: [{ type: "spawnCoin", fate: "chop", tier: "micro" }],
    text: "Months ago you threw $100 at a random coin called {coin} and forgot about it.\n\nYou just opened your wallet.",
    choices: [
      {
        text: "Look at the number",
        outcomes: [
          {
            text: "{coin} is up 100x. Your $100 is now {value}.\n\nYou check it again. It's real.",
            effects: [
              { type: "buy", amount: 100 },
              { type: "coinMove", mult: [90, 120] },
              { type: "history", emoji: "🚨", text: "Found a forgotten 100x on {coin}.", major: true },
              { type: "queue", event: "leg_after_moon", months: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "leg_500x",
    category: "legendary",
    weight: 0.25,
    cooldown: 120,
    req: { minCash: 50 },
    emoji: "🌌",
    title: "YOU FOUND A 500X",
    setup: [{ type: "spawnCoin", fate: "chop", tier: "micro" }],
    text: "You bought $50 of {coin} as a joke because the logo was a potato with sunglasses.",
    choices: [
      {
        text: "Check the potato",
        outcomes: [
          {
            text: "The potato did a 500x. Your $50 is now {value}.\n\nYou are going to frame this screenshot.",
            effects: [
              { type: "buy", amount: 50 },
              { type: "coinMove", mult: [450, 600] },
              { type: "history", emoji: "🌌", text: "Hit a 500x on a potato coin ({coin}).", major: true },
              { type: "queue", event: "leg_after_moon", months: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "leg_after_moon",
    category: "legendary",
    chainOnly: true,
    emoji: "🫨",
    title: "WHAT NOW",
    text: "{coin} position: {value}.\n\nThe chart is vertical. Your hands are not steady.",
    choices: AFTER_MOON,
  },
  {
    id: "leg_billionaire_tweet",
    category: "legendary",
    weight: 1.5,
    cooldown: 48,
    req: { hasPositions: true },
    setup: [{ type: "pickHeld" }],
    emoji: "🪐",
    title: "BILLIONAIRE TWEET",
    text: "A famous tech billionaire (definitely not named after a fruit) just tweeted a picture of... {coin}'s mascot.\n\nNo caption. Just the picture.",
    choices: [
      {
        text: "Refresh the chart",
        outcomes: [
          { weight: 2, text: "{coin} {moved}. Your position: {value}. One tweet. One. Tweet.", effects: [{ type: "coinMove", mult: [5, 25] }, { type: "history", emoji: "🪐", text: "A billionaire tweeted {coin}'s mascot. It exploded.", major: true }, { type: "queue", event: "leg_after_moon", months: 0 }] },
          { weight: 1, text: "It pumps {moved}, then he deletes the tweet. Whiplash.", effects: [{ type: "coinMove", mult: [1.5, 3] }] },
        ],
      },
    ],
  },
  {
    id: "leg_old_wallet",
    category: "legendary",
    weight: 0.8,
    once: true,
    req: { minAge: 25 },
    emoji: "🗝️",
    title: "OLD WALLET",
    text: "Cleaning your room, you find a notebook with a seed phrase from years ago. You don't remember this wallet at all.",
    choices: [
      {
        text: "Import it",
        outcomes: [
          { weight: 3, text: "It has $11 and 400 dead coins in it. Nostalgic.", effects: [{ type: "cash", amount: 11 }] },
          { weight: 1, mods: { luck: 1 }, text: "One of those \"dead\" coins woke up. The wallet has {amount} in it.", effects: [{ type: "cash", amount: [20_000, 250_000] }, { type: "history", emoji: "🗝️", text: "Found an old wallet worth {amount}.", major: true }] },
        ],
      },
    ],
  },
  {
    id: "leg_bought_bottom",
    category: "legendary",
    weight: 1.2,
    cooldown: 36,
    req: { hasPositions: true, minRugs: 2 },
    setup: [{ type: "pickHeld" }],
    emoji: "🎯",
    title: "PERFECT BOTTOM",
    text: "For once in your life, you bought the exact bottom. {coin} reversed the minute you bought.",
    choices: [ignore("{coin} {moved}. This never happens. Screenshot everything.", "Screenshot it", [{ type: "coinMove", mult: [4, 15] }, { type: "history", emoji: "🎯", text: "Bought the exact bottom of {coin}." }, { type: "queue", event: "leg_after_moon", months: 0 }])],
  },
  {
    id: "leg_whale_contact",
    category: "legendary",
    weight: 3,
    once: true,
    req: { flags: ["whale_contact"], minCash: 100 },
    setup: [{ type: "spawnCoin", fate: "mega", tier: "micro" }],
    emoji: "🐋",
    title: "THE LAMBO GUY",
    text: "Remember the Lambo guy from the drive-thru? He texts you a contract address.\n\n\"You were nice to me. Buy {coin}. Don't tell anyone.\"",
    choices: [
      { text: "Buy it", outcomes: [{ text: "You buy {amount} of {coin}. The drive-thru connection pays off?", effects: [{ type: "buy", size: "large" }] }] },
      ignore("Strangers giving coins = rug. Probably.", "Too good to be true"),
    ],
  },
  {
    id: "leg_alien",
    category: "legendary",
    weight: 0.5,
    once: true,
    emoji: "👽",
    title: "DISCLOSURE",
    setup: [{ type: "spawnCoin", fate: "luck", narrative: "stupid" }],
    text: "A government official says on live TV that aliens are real. Within seconds, {coin} (an alien meme coin) exists.",
    choices: [
      { text: "Ape the aliens", req: { minCash: 20 }, outcomes: [{ weight: 1, mods: { luck: 0.8 }, text: "The aliens deliver. {coin} {moved}!", effects: [{ type: "buy", size: "medium" }, { type: "coinMove", mult: [5, 30] }, { type: "queue", event: "leg_after_moon", months: 0 }] }, { weight: 2, text: "Turns out it was a weather balloon. {coin} {moved}.", effects: [{ type: "buy", size: "medium" }, { type: "coinMove", mult: [0.05, 0.3] }] }] },
      ignore("You go outside and look at the sky instead.", "Look at the sky"),
    ],
  },
];
