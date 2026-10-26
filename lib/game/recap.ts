import { JOB, STATUSES } from "./config";
import { compact, money, mult } from "./format";
import { ageOf } from "./history";
import { netWorth } from "./portfolio";
import type { GameState } from "./types";

export interface Recap {
  name: string;
  avatar: string;
  age: number;
  seed: number;
  lines: { label: string; value: string }[];
  status: string;
  tagline: string;
}

export function tagline(s: GameState): string {
  const r = s.run;
  const final = netWorth(s);
  if (final < 100 && r.peakNetWorth >= 1_000_000) return "WHAT A FUCKING RUN.";
  if (r.peakNetWorth >= 10_000_000) return "A true legend of the trenches.";
  if (final >= 1_000_000) return "Made it. Actually made it.";
  if (r.timesBroke >= 3) return `Professional ${JOB.name} employee. Part-time degen.`;
  if (r.rugs >= 10) return "Exit liquidity hall of fame.";
  if (r.hundreds > 0 && final < r.peakNetWorth * 0.1) return "Hit a 100x. Gave it all back. Classic.";
  if (r.peakNetWorth < 1_000) return "Should've stayed on TikTok.";
  if (r.paperHands >= 3) return "Paper hands. Paper life.";
  return "Another degen life, well lived.";
}

export function buildRecap(s: GameState): Recap {
  const r = s.run;
  const st = STATUSES[r.peakStatus];
  return {
    name: s.player.name,
    avatar: s.player.avatar,
    age: s.ended?.age ?? ageOf(s),
    seed: s.seed,
    status: `${st.emoji} ${st.label}`,
    tagline: tagline(s),
    lines: [
      { label: "Started with", value: money(r.startCash) },
      { label: "Peak net worth", value: money(r.peakNetWorth) },
      { label: "Final net worth", value: money(netWorth(s)) },
      { label: "Biggest win", value: r.biggestWin > 0 ? `${mult(r.biggestWin)}${r.biggestWinCoin ? ` ($${r.biggestWinCoin})` : ""}` : "—" },
      { label: "Biggest loss", value: r.biggestLoss > 0 ? `${money(r.biggestLoss)}${r.biggestLossCoin ? ` ($${r.biggestLossCoin})` : ""}` : "—" },
      { label: "Trades", value: String(r.trades) },
      { label: "10x+ / 50x+ / 100x+", value: `${r.tens} / ${r.fifties} / ${r.hundreds}` },
      { label: "Rugs", value: String(r.rugs) },
      { label: "Times broke", value: String(r.timesBroke) },
      { label: `${JOB.name} months`, value: String(r.mcdMonths) },
      { label: "Full sends", value: String(r.fullSends) },
      { label: "Paper hands", value: String(r.paperHands) },
      { label: "Followers", value: compact(Math.max(s.followers, r.peakFollowers)) },
    ],
  };
}

export function shareText(s: GameState): string {
  const rc = buildRecap(s);
  const get = (l: string) => rc.lines.find((x) => x.label === l)?.value ?? "";
  return [
    "DEGEN LIFE",
    "",
    rc.name.toUpperCase(),
    `Started: ${get("Started with")}`,
    `Peak: ${get("Peak net worth")}`,
    `Final: ${get("Final net worth")}`,
    `Biggest Win: ${get("Biggest win")}`,
    `Rugs: ${s.run.rugs}`,
    `Times Broke: ${s.run.timesBroke}`,
    `${JOB.name}: ${s.run.mcdMonths} months`,
    `STATUS: ${rc.status}`,
    "",
    `"${rc.tagline}"`,
    `RUN #${s.seed}`,
  ].join("\n");
}
