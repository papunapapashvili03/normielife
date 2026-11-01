import Link from "next/link";
import { Logo } from "@/components/game/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <p>A game. Not financial advice. No real money, no wallet, no tokens.</p>
        <Link href="/play" className="font-semibold text-text hover:text-mint">
          Play
        </Link>
      </div>
    </footer>
  );
}
