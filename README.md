# DEGEN LIFE

BitLife for crypto degenerates. A browser life simulator where you discover memecoins on TikTok, buy shitcoins, get rugged, work at McDonald's, come back, and maybe become a legend.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000 (landing), /play (the game)
npm test        # engine tests + balance simulation (~2 min)
npm run build
```

Saves live in the browser (localStorage). Every life has a run seed (`RUN #123456`); entering the same seed in the character creator reproduces the same starting stats, money and world.

## How it plays

You live the whole life through your phone:

- **Sleep** to skip ahead, then wake up to a lock screen of notifications.
- **Events arrive as text threads**; answer with quick replies.
- **Famous traders post calls non-stop** while you're on your phone. Go in (a live trade in the Charts app, ticking in real time) or ignore it and find out what you missed. Four calls make a month.
- **Your character's face reacts** to wins and losses.
- **Apps:** Chirp, Charts, Bags, Bank, McJobs, Memories, Scanner, Me and Settings. They open and close like iPhone apps.
- On desktop the phone sits on a desk with your photo, a sticky note, a receipt of your trades, and a McDonald's name tag while you're on shift.

The phone UI lives in `components/game/phone/`; shared pieces (order ticket, charts, pop-ups, hotkeys) are in `components/game/`.

## How it's built

Everything runs client-side. The game engine is plain TypeScript in `lib/game/` with no React:

| File | What it does |
|---|---|
| `config.ts` | Every balance number: salary, expenses, coin fate odds, status thresholds, pacing, death curve. `JOB.name` renames the one job everywhere. |
| `coins.ts` / `market.ts` | Procedural memecoins with hidden price paths, monthly market ticks, pump/crash/rug signals |
| `portfolio.ts` | Buying, selling, liquidity caps, rugs, run stats |
| `life.ts` | The monthly loop: salary, expenses, market, broke detection, death, retirement |
| `events/engine.ts` | The generic event engine: requirements, weighting, outcomes, effects, templating |
| `events/data/*.ts` | All event content (120+ events) |
| `reducer.ts` | UI actions → engine calls. State is cloned per action; RNG state lives in the save, so runs are deterministic |

The UI is in `components/game/`.

## Adding events

Append an `EventDef` to any file in `lib/game/events/data/`. The engine never needs to change.

```ts
{
  id: "life_lost_wallet",
  category: "life",            // crypto | trade | kol | life | mcd | social | legendary
  weight: 6,                   // relative frequency
  cooldown: 24,                // months before it can repeat
  req: { minCash: 200, maxStatus: "degen" },
  emoji: "👛",
  title: "LOST WALLET",
  setup: [{ type: "spawnCoin", fate: "luck" }],   // binds {coin}
  text: "You find a wallet on the bus. There's a sticker for {coin} on it.",
  choices: [
    { text: "Return it", outcomes: [{ text: "Good karma.", effects: [{ type: "stat", stat: "luck", delta: 3 }] }] },
    {
      text: "Ape the sticker coin",
      req: { minCash: 20 },
      outcomes: [
        { weight: 2, mods: { luck: 0.6 }, text: "{coin} {moved}!", effects: [{ type: "buy", size: "small" }, { type: "coinMove", mult: [2, 5] }] },
        { weight: 3, text: "It rugs. Karma.", effects: [{ type: "buy", size: "small" }, { type: "coinMove", mult: 0 }] },
      ],
    },
  ],
}
```

- **Requirements** (`req`): age, cash, net worth, portfolio, status, stats, followers, employment, flags, previously seen events, rugs, wins, times broke, held positions, a recent big loss.
- **Effects**: `cash`, `stat`, `followers`, `reputation`, `spawnCoin`, `pickKol`, `pickHeld`, `pickMarket`, `buy`, `sell`, `sellAll`, `wipePositions`, `coinMove`, `marketMove`, `research`, `flag`, `queue` (event chains), `job`, `history`, `runStat`, `kolIntel`.
- **Templates**: `{name}`, `{job}`, `{salary}`, `{cash}`, `{nw}`, `{coin}`, `{mc}`, `{kol}`, `{kolRead}`, `{amount}`, `{value}`, `{proceeds}`, `{pnl}`, `{moved}`, `{pct}`, `{multiple}`, and so on.
- **Signal events** (`signal: "pump" | "bigpump" | "megapump" | "crash" | "rug" | "paperhand" | "diamond"`) fire when the market does that to a coin you hold.

`npm test` validates all content: unique ids, every queued follow-up exists, and every template variable resolves.
