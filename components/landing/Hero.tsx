import { LifeChart } from "./LifeChart";
import { PlayLink } from "./PlayLink";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <h1 className="text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[5.6rem]">
        One life.
        <br />
        Infinite <span className="text-mint">rugs.</span>
      </h1>
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <PlayLink />
        <span className="text-[13px] text-muted">Free, in your browser. No wallet, no real money.</span>
      </div>

      <div className="mt-12 sm:mt-16">
        <div className="mb-3 flex items-baseline justify-between gap-4 text-[12px]">
          <p className="num text-muted">Sam · run #482913 · net worth, age 18 to 76</p>
          <p className="num shrink-0 text-faint">
            <span className="sm:hidden">swipe →</span>
            <span className="max-sm:hidden">log scale</span>
          </p>
        </div>
        <LifeChart />
      </div>
    </section>
  );
}
