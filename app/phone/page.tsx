import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { GameRoot } from "@/components/game/GameRoot";

// Handwriting for the props on the desk (sticky note, name tag).
const caveat = Caveat({ variable: "--font-hand", weight: ["500", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEGEN LIFE · Phone",
  description: "Live your degen life through your phone. Sleep, wake up to notifications, answer the texts.",
};

export default function PhonePage() {
  return (
    <div className={caveat.variable}>
      <GameRoot skin="phone" />
    </div>
  );
}
