// The one job: McDonald's (name configurable in config.JOB).
import { JOB } from "./config";
import { money } from "./format";
import { addHistory, addLog, hasFlag, setFlag } from "./history";
import type { GameState } from "./types";

export function salary(s: GameState): number {
  const raises = Math.floor(s.job.totalMonths / JOB.raiseEvery);
  return Math.min(JOB.maxSalary, Math.round(JOB.baseSalary * (1 + JOB.raisePct * raises)));
}

export function startJob(s: GameState) {
  if (s.job.employed) return;
  s.job.employed = true;
  s.job.stintMonths = 0;
  s.job.stints++;
  if (hasFlag(s, "broke")) {
    setFlag(s, "mcd_after_broke");
    // Shifts until you're back to the starting stack.
    setFlag(s, "rebuilding");
  }
  // The UI plays the clock-in intro, then clears this.
  setFlag(s, "mcd_intro");
  const again = s.job.stints > 1;
  addHistory(s, JOB.emoji, again ? `Back to work at ${JOB.name}.` : `Started working at ${JOB.name}.`, true);
  addLog(s, `${JOB.emoji} Hired at ${JOB.name}. ${money(salary(s))}/month.`, "neutral");
}

export function quitJob(s: GameState) {
  if (!s.job.employed) return;
  s.job.employed = false;
  setFlag(s, "quit_mcd");
  delete s.flags.rebuilding;
  delete s.flags.mcd_intro;
  addHistory(s, "👋", `Quit ${JOB.name} after ${s.job.stintMonths} month${s.job.stintMonths === 1 ? "" : "s"}.`, s.job.stintMonths >= 3);
  addLog(s, `Quit ${JOB.name}.`, "neutral");
}

export function payday(s: GameState) {
  if (!s.job.employed) return;
  const pay = salary(s);
  s.cash += pay;
  s.job.totalMonths++;
  s.job.stintMonths++;
  s.run.mcdMonths++;
}
