import { PhotoFrame, Slip, SlipRule } from "@/components/game/phone/Desk";
import { JOB } from "@/lib/game/config";

// Same life as the hero chart, so the numbers match.
const LINES: [string, string][] = [
  ["PEAK NET WORTH", "$1,150,000"],
  ["BIGGEST WIN", "112X $PIZZADOG"],
  ["WORST LOSS", "-$380K $SKIBIDIAI"],
  ["TIMES RUGGED", "14"],
  ["TIMES BROKE", "3"],
  [`MONTHS AT ${JOB.name.toUpperCase()}`, "31"],
  ["PEAK STATUS", "WHALE"],
];

export function RecapSection() {
  return (
    <section className="overflow-hidden bg-[#d9d6cf]">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="max-w-xl text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Every life ends. You get the receipt.</h2>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-[#45433d]">
            Die of old age, of a heart attack watching a -90% candle, or right after typing &ldquo;gm&rdquo;. Then see your peak, your worst bag and how many times you went broke.
          </p>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-[#45433d]">Every run has a seed. Send it to a friend and they start the exact same life.</p>
        </div>
        <div className="flex items-center justify-center gap-6 max-sm:flex-col">
          <PhotoFrame avatar="p1" mood="very_sad" caption="Sam, 76" />
          <Slip title="DEGEN LIFE" subtitle="RUN #482913 · FINAL RECEIPT" footer="THANK YOU FOR YOUR LIQUIDITY">
            <ul className="space-y-1">
              {LINES.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span>{k}</span>
                  <span className="text-right">{v}</span>
                </li>
              ))}
            </ul>
            <SlipRule />
            <p className="leading-snug">CAUSE OF DEATH: CHECKING CHARTS AT 3AM</p>
            <SlipRule />
            <p className="flex justify-between font-medium">
              <span>FINAL NET WORTH</span>
              <span>$2,100</span>
            </p>
          </Slip>
        </div>
      </div>
    </section>
  );
}
