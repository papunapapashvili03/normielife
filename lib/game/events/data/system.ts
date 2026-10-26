import type { EventDef } from "../../types";
import { ignore, stat } from "./helpers";

const HIRE = { type: "job", action: "start" } as const;

export const SYSTEM: EventDef[] = [
  {
    id: "sys_broke",
    category: "system",
    chainOnly: true,
    emoji: "💀",
    title: "YOU ARE BROKE",
    text: "Your entire portfolio is gone.\n\nYou have: {cash}\n\nYour crypto career is over... for now. You need money to get back into the game.",
    choices: [
      { text: "🍟 Work at {job}", outcomes: [{ text: "You put on the paper hat. {salary}/month. The comeback starts at the fryer.", effects: [HIRE, { type: "history", emoji: "🍟", text: "Broke. Started over at {job}.", major: true }] }] },
      { text: "Ask your parents for money", outcomes: [{ weight: 2, text: "They give you {amount} and a long, silent look.", effects: [{ type: "cash", amount: [100, 400] }] }, { weight: 1, text: "\"Absolutely not.\" They have a point.", effects: [] }] },
      ignore("You lie on the floor and stare at the ceiling. Tomorrow is another day.", "Lie on the floor", [stat("discipline", 1)]),
    ],
  },
  {
    id: "sys_still_broke",
    category: "system",
    weight: 60,
    cooldown: 2,
    req: { flags: ["broke", "first_trade"], employed: false, maxCash: 100 },
    emoji: "🪫",
    title: "STILL BROKE",
    text: "You're still broke. You've watched 40 coins pump this month without a single dollar to buy them.\n\n{job} is still hiring.",
    choices: [
      { text: "🍟 Fine. Apply at {job}.", outcomes: [{ text: "Hired. {salary}/month. Swallow the pride, keep the dream.", effects: [HIRE] }] },
      { text: "Sell your gaming PC", req: { notFlags: ["sold_pc"] }, outcomes: [{ text: "You sell it for {amount}. Your setup is now a laptop on a cardboard box.", effects: [{ type: "cash", amount: [400, 900] }, { type: "flag", set: "sold_pc" }] }] },
      ignore("You refuse. Something will turn up.", "Wait it out"),
    ],
  },
  {
    id: "sys_baseline",
    category: "system",
    chainOnly: true,
    emoji: "💵",
    title: "BACK TO BASELINE",
    text: "Payday hits and your balance reads {cash}.\n\nYou've rebuilt the {baseline} you started with. The fryer did what the charts couldn't.",
    choices: [
      { text: "Quit and trade again", outcomes: [{ text: "You hang up the headset. Same stack as day one. Different person. Probably.", effects: [{ type: "job", action: "quit" }, { type: "history", emoji: "🔁", text: "Rebuilt to {baseline} at {job} and went back to trading.", major: true }] }] },
      ignore("You keep working. A cushion above the baseline never hurt anyone.", "Keep a few more shifts", [stat("discipline", 3)]),
    ],
  },
  {
    id: "sys_first_month_mcd",
    category: "mcd",
    weight: 50,
    once: true,
    req: { employed: true },
    emoji: "🍟",
    title: "FIRST SHIFT",
    text: "Your first shift at {job}. The fryer is hot. The headset is loud. A kid asks you for extra ketchup in a tone that suggests violence.\n\nTip: use the 🍟 Work buttons to fast-forward through shifts, and quit whenever you're ready.",
    choices: [ignore("Welcome to the grind.", "Let's go")],
  },
];
