import { STATUSES, STATUS_THRESHOLDS } from "@/lib/game/config";
import { money } from "@/lib/game/format";
import type { StatusId } from "@/lib/game/types";

// The real thresholds from the game, drawn as stairs. Each step is a status you can lose.
const STEPS: [StatusId, string][] = [
  ["normie", "Everyone starts here"],
  ["degen", "Make your first trade"],
  ["trader", `${money(STATUS_THRESHOLDS.trader.netWorth)} and some actual research`],
  ["chad", `${money(STATUS_THRESHOLDS.chad)} net worth`],
  ["whale", `${money(STATUS_THRESHOLDS.whale)} net worth`],
  ["legend", `${money(STATUS_THRESHOLDS.legend)} net worth`],
];

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function StatusLadder() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="max-w-2xl text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Climb from Normie to Legend. Fall back down.</h2>
      <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted">Your status follows your net worth. Lose the money and you lose the title, and the rent you were paying for it keeps coming.</p>

      <ol className="mt-12 grid gap-3 border-line-strong lg:grid-cols-6 lg:items-end lg:gap-2 lg:border-b">
        {STEPS.map(([id, how], i) => {
          const st = STATUSES[id];
          const top = id === "legend";
          return (
            <li
              key={id}
              className={`flex flex-col justify-end rounded-2xl border p-4 lg:rounded-b-none lg:border-b-0 ${top ? "border-amber/40 bg-amber/10" : "border-line bg-panel"} ${STEP_H[i]}`}
            >
              <span className="text-[28px] leading-none" aria-hidden>
                {st.emoji}
              </span>
              <p className={`mt-3 text-[17px] font-extrabold ${top ? "text-amber" : ""}`}>{sentence(st.label)}</p>
              <p className="num mt-0.5 text-[12px] text-muted">{how}</p>
              <p className="mt-3 text-[13px] italic leading-snug text-faint">&ldquo;{st.quote}&rdquo;</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const STEP_H = ["lg:min-h-[13rem]", "lg:min-h-[15.5rem]", "lg:min-h-[18rem]", "lg:min-h-[20.5rem]", "lg:min-h-[23rem]", "lg:min-h-[25.5rem]"];
