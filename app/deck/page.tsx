import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GameRoot } from "@/components/game/GameRoot";

// Chunky serif for card names, like a real trading card game.
const fraunces = Fraunces({ variable: "--font-card", weight: ["600", "800", "900"], style: ["normal", "italic"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEGEN LIFE · Deck",
  description: "Draw your degen life card by card. Play your hand, collect coins, reveal their rarity.",
};

export default function DeckPage() {
  return (
    <div className={fraunces.variable}>
      <GameRoot skin="deck" />
    </div>
  );
}
