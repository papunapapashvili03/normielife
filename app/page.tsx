import { Caveat } from "next/font/google";
import { GameRoot } from "@/components/game/GameRoot";

// Handwriting for the props on the desk (sticky note, name tag).
const caveat = Caveat({ variable: "--font-hand", weight: ["500", "700"], subsets: ["latin"] });

export default function Home() {
  return (
    <div className={caveat.variable}>
      <GameRoot />
    </div>
  );
}
