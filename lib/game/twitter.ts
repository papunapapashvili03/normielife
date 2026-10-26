// Monthly Crypto Twitter feed generator.
import { lastChange, marketCap } from "./coins";
import { money, pct } from "./format";
import { KOLS } from "./kols";
import { trendingCoins } from "./market";
import { chance, int, pick, range } from "./rng";
import type { Coin, GameState, Kol, Tweet } from "./types";

const SHILL_LINES = [
  "This is the one. ${t}",
  "${t} is going to be huge. Don't fade.",
  "Loaded a bag of ${t}. NFA.",
  "If you're not in ${t} you're ngmi",
  "${t} chart is literally a cup and handle. Just saying.",
  "Last chance to get ${t} under ${mc}",
  "${t} community is unmatched 🫡",
  "Dev of ${t} is based. Talked to him for 4 hours.",
];
const VETERAN_LINES = [
  "Stop buying every coin you see.",
  "Take profits. Nobody ever went broke taking profits. (Many went broke not taking them.)",
  "If you can't explain why you're in a coin, you're exit liquidity.",
  "Check the top 10 holders before you ape. Every time.",
  "Bear markets make you rich. Bull markets make you think you're a genius.",
];
const GURU_LINES = [
  "Every coin I post is going 100x. Every. Single. One.",
  "My course is 80% off today only (it's always today) 🔥",
  "Woke up at 4am, cold plunge, aped ${t}. Discipline.",
  "Turned $50 into $5M. Ask me how 👇",
];
const MEMES = [
  "me explaining to my wife why we're eating ramen again 📉🍜",
  "dev: 'we're building' — the dev:",
  "bought the top. again. it's a lifestyle.",
  "'it's just a dip' — me, -94%",
  "gm to everyone except the guy who sold me his bags",
  "my portfolio looking like a ski slope ⛷️",
  "wen lambo? ser it's a Honda Civic now",
  "they don't know I'm down 80% on a frog",
  "trust the process (the process is losing money)",
  "my therapist says I need to stop checking charts at 3am. my therapist is ngmi.",
  "sold everything. bought back higher. classic.",
  "I'm not addicted to memecoins I can stop whenever I want (after this next 100x)",
];
const NEWS = [
  "🚨 BREAKING: ${t} dev wallet just moved funds",
  "📈 ${t} volume up ${p} in 24h",
  "🐋 A whale just aped ${t}",
  "⚠️ Rumor: ${t} getting listed on a major exchange",
  "💀 ${t} down ${p}. Holders in shambles.",
  "🔍 On-chain sleuths are looking into ${t}",
];
const REPLIES_GOOD = [
  "${h} has been cooking lately ngl",
  "Following ${h} was the best decision of my life",
  "${h} called it. Again.",
  "how is ${h} always early??",
];
const REPLIES_BAD = [
  "${h} is down bad lmao",
  "Inverse ${h} and retire",
  "${h} really thought they were a trader 💀",
  "who let ${h} cook",
];

function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\$\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

function kolTweet(s: GameState, k: Kol, c: Coin | undefined): Tweet {
  let pool = SHILL_LINES;
  if (k.archetype === "veteran" && chance(s, 0.6)) pool = VETERAN_LINES;
  if (k.archetype === "guru") pool = GURU_LINES;
  if (k.archetype === "memelord" && chance(s, 0.6)) pool = MEMES;
  const text = fill(pick(s, pool), {
    t: c ? `$${c.ticker}` : "$" + "FROG",
    mc: c ? money(marketCap(c) * 2) : "$1M",
  });
  const likes = Math.round(k.audience * range(s, 0.004, 0.03));
  return {
    id: s.nextTweetId++,
    month: s.month,
    handle: k.handle,
    name: k.name,
    avatar: k.avatar,
    text,
    likes,
    rts: Math.round(likes * range(s, 0.1, 0.35)),
    kind: "kol",
    coinId: c && text.includes(c.ticker) ? c.id : undefined,
  };
}

export function generateFeed(s: GameState) {
  const trending = trendingCoins(s, 5);
  const fresh: Tweet[] = [];
  const nKol = int(s, 2, 3);
  for (let i = 0; i < nKol; i++) {
    fresh.push(kolTweet(s, pick(s, KOLS), trending.length ? pick(s, trending) : undefined));
  }
  if (chance(s, 0.8)) {
    const anon = pick(s, ["@ngmi_andy", "@wagmi_wendy", "@exitliquidity", "@rektguy", "@solsurfer", "@chartcrimes", "@frogfather", "@bagsforsale"]);
    const likes = int(s, 50, 40_000);
    fresh.push({ id: s.nextTweetId++, month: s.month, handle: anon, name: anon.slice(1), avatar: pick(s, ["🤡", "🥲", "😭", "🗿", "🦧", "🫠"]), text: pick(s, MEMES), likes, rts: Math.round(likes * 0.2), kind: "meme" });
  }
  const any = s.coins.filter((c) => c.ageMonths > 0);
  if (any.length && chance(s, 0.85)) {
    const c = pick(s, any);
    const likes = int(s, 200, 20_000);
    fresh.push({
      id: s.nextTweetId++,
      month: s.month,
      handle: "@DegenNewsWire",
      name: "Degen News Wire",
      avatar: "📰",
      text: fill(pick(s, NEWS), { t: `$${c.ticker}`, p: pct(Math.abs(lastChange(c)), false) }),
      likes,
      rts: Math.round(likes * 0.3),
      kind: "news",
      coinId: c.id,
    });
  }
  if (s.followers >= 1_000 && chance(s, 0.6)) {
    const good = chance(s, 0.55);
    const likes = int(s, 5, Math.max(10, Math.round(s.followers * 0.01)));
    fresh.push({
      id: s.nextTweetId++,
      month: s.month,
      handle: pick(s, ["@anon8312", "@cryptokid99", "@definitelynotabot", "@mfer_mike", "@sad_trader"]),
      name: "anon",
      avatar: good ? "🫡" : "🤡",
      text: fill(pick(s, good ? REPLIES_GOOD : REPLIES_BAD), { h: s.player.handle }),
      likes,
      rts: 0,
      kind: "reply",
    });
  }
  s.feed = [...fresh.reverse(), ...s.feed].slice(0, 40);
}

export function playerTweet(s: GameState, text: string, likes: number) {
  s.feed.unshift({
    id: s.nextTweetId++,
    month: s.month,
    handle: s.player.handle,
    name: s.player.name,
    avatar: s.player.avatar,
    text,
    likes,
    rts: Math.round(likes * 0.2),
    kind: "player",
  });
  if (s.feed.length > 40) s.feed.length = 40;
}
