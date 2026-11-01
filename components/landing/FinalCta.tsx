import { PlayLink } from "./PlayLink";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <h2 className="text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">
        One life.
        <br />
        Don&apos;t buy the top.
      </h2>
      <div className="mt-8 flex justify-center">
        <PlayLink />
      </div>
      <p className="mt-3 text-[24px] text-muted [font-family:var(--font-hand)]">(you will buy the top)</p>
    </section>
  );
}
