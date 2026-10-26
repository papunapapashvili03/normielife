// Status progression, milestones, followers.
import { JOB, MILESTONES, SOCIAL_TIERS, STATUSES, STATUS_ORDER, STATUS_THRESHOLDS } from "./config";
import { money } from "./format";
import { addHistory, addLog, ageOf, hasFlag, setFlag } from "./history";
import { netWorth } from "./portfolio";
import { int } from "./rng";
import type { GameState, StatusId } from "./types";

export function computeStatus(s: GameState): StatusId {
  const nw = netWorth(s);
  if (nw >= STATUS_THRESHOLDS.legend) return "legend";
  if (nw >= STATUS_THRESHOLDS.whale) return "whale";
  if (nw >= STATUS_THRESHOLDS.chad) return "chad";
  if (nw >= STATUS_THRESHOLDS.trader.netWorth && s.player.stats.knowledge >= STATUS_THRESHOLDS.trader.knowledge) return "trader";
  if (hasFlag(s, "first_trade")) return "degen";
  return "normie";
}

export function statusIdx(id: StatusId): number {
  return STATUS_ORDER.indexOf(id);
}

/** Call after anything that can change net worth. */
export function updateProgress(s: GameState) {
  const nw = netWorth(s);
  if (nw > s.run.peakNetWorth) {
    s.run.peakNetWorth = nw;
    s.run.peakAge = ageOf(s);
  }
  for (const m of MILESTONES) {
    const f = `ms_${m}`;
    if (nw >= m && !hasFlag(s, f)) {
      setFlag(s, f);
      if (m >= 10_000) addHistory(s, "💰", `Reached ${money(m)} net worth.`, true);
      if (m >= 1_000_000 && hasFlag(s, "mcd_after_broke") && !hasFlag(s, "mcd_millionaire")) {
        setFlag(s, "mcd_millionaire");
        addHistory(s, JOB.emoji, `From the fryer to a million. ${JOB.name} Millionaire.`, true);
      }
    }
  }
  const next = computeStatus(s);
  if (next !== s.status) {
    const up = statusIdx(next) > statusIdx(s.status);
    const st = STATUSES[next];
    addHistory(s, st.emoji, up ? `Became a ${st.label}.` : `Fell back to ${st.label}.`, up || statusIdx(s.status) >= 3);
    addLog(s, up ? `${st.emoji} You are now a ${st.label}!` : `${st.emoji} Demoted to ${st.label}.`, up ? "good" : "bad");
    s.status = next;
    if (statusIdx(next) > statusIdx(s.run.peakStatus)) s.run.peakStatus = next;
  }
  if (s.followers > s.run.peakFollowers) s.run.peakFollowers = s.followers;
}

export function socialTier(followers: number): string {
  let label = SOCIAL_TIERS[0].label;
  for (const t of SOCIAL_TIERS) if (followers >= t.min) label = t.label;
  return label;
}

/** Passive monthly follower drift. */
export function passiveFollowers(s: GameState) {
  const idx = statusIdx(s.status);
  if (idx < 2 && s.followers < 500) return;
  const ch = s.player.stats.charisma / 100;
  const gain = Math.round(ch * idx * idx * int(s, 3, 25) + s.followers * 0.012 * ch);
  const loss = s.followers > 0 && idx <= 1 ? Math.round(s.followers * 0.01) : 0;
  s.followers = Math.max(0, s.followers + gain - loss);
}
