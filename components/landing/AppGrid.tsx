"use client";

import { useEffect, useRef, useState } from "react";
import { appById, IconArt, type AppId } from "@/components/game/phone/apps";
import { BASELINE_CASH } from "@/lib/game/config";
import { money } from "@/lib/game/format";

const SHOWN: [AppId, string][] = [
  ["chirp", "Calls drop nonstop"],
  ["charts", "Trade it live"],
  ["bags", "What you hold"],
  ["bank", "Rent is due"],
  ["mcjobs", `Back to ${money(BASELINE_CASH)}`],
  ["scanner", "Hunt a setup"],
];

/** The game's apps, popping onto the screen one by one when the grid scrolls into view. */
export function AppGrid() {
  const ref = useRef<HTMLUListElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul ref={ref} className="grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-8">
      {SHOWN.map(([id, line], i) => {
        const app = appById(id);
        return (
          <li key={id} className={`group flex flex-col items-start ${shown ? "pop" : "opacity-0"}`} style={{ animationDelay: `${i * 90}ms` }}>
            <span
              className="relative grid size-16 place-items-center overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgb(0_0_0/0.12)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-6 sm:size-[76px] sm:rounded-[21px]"
              style={{ background: app.bg }}
            >
              <IconArt app={app} size={76} />
            </span>
            <span className="mt-3 text-[15px] font-bold">{app.name}</span>
            <span className="text-[13px] text-muted">{line}</span>
          </li>
        );
      })}
    </ul>
  );
}
