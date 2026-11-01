import { AppGrid } from "./AppGrid";
import { CallDemo } from "./CallDemo";

export function PhoneSection() {
  return (
    <section className="border-y border-line bg-raised">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:gap-24">
        <CallDemo />
        <div>
          <h2 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Your life is on your phone.</h2>
          <div className="mt-12">
            <AppGrid />
          </div>
        </div>
      </div>
    </section>
  );
}
