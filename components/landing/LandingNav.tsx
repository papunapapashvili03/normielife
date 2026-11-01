import { Logo } from "@/components/game/Logo";
import { PlayLink } from "./PlayLink";

export function LandingNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Logo />
      <PlayLink size="sm" />
    </header>
  );
}
