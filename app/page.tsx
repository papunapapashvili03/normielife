import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { PhoneSection } from "@/components/landing/PhoneSection";
import { RecapSection } from "@/components/landing/RecapSection";
import { StatusLadder } from "@/components/landing/StatusLadder";

// Landing / marketing page. The game itself lives at /play.
export default function Landing() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <PhoneSection />
        <StatusLadder />
        <RecapSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
