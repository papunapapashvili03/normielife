import type { Metadata } from "next";
import { GameRoot } from "@/components/game/GameRoot";

export const metadata: Metadata = {
  title: "Play · DEGEN LIFE",
};

export default function Play() {
  return <GameRoot />;
}
