import Image from "next/image";

export type AppId = "charts" | "bags" | "chirp" | "bank" | "mcjobs" | "memories" | "me" | "scanner" | "settings";

export type PhoneApp = { id: AppId; name: string; glyph: string; bg: string; img?: string };

/** Icons live in public/apps. `bg` matches each icon's background so the launch splash blends in. */
export const APPS: PhoneApp[] = [
  { id: "charts", name: "Charts", glyph: "📈", bg: "#ccff00", img: "/apps/robinhood.png" },
  { id: "bags", name: "Bags", glyph: "👜", bg: "#9786e4", img: "/apps/phantom.jpg" },
  { id: "chirp", name: "Chirp", glyph: "🐦", bg: "#000000", img: "/apps/X.jpg" },
  { id: "bank", name: "Bank", glyph: "🏦", bg: "#ffffff", img: "/apps/Revolut.png" },
  { id: "mcjobs", name: "McJobs", glyph: "🍟", bg: "#ffffff", img: "/apps/mcdonalds.png" },
  { id: "memories", name: "Memories", glyph: "🖼️", bg: "#ffffff" },
  { id: "scanner", name: "Scanner", glyph: "🔭", bg: "#212121", img: "/apps/tokensniffer.jpg" },
  { id: "me", name: "Me", glyph: "🪪", bg: "#e9e5ff" },
  { id: "settings", name: "Settings", glyph: "⚙️", bg: "#d4d7de", img: "/apps/settings.jpg" },
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;

/** An app's icon art: the image if there is one, otherwise its emoji. */
export function IconArt({ app, size }: { app: PhoneApp; size: number }) {
  if (app.img) return <Image src={app.img} alt="" fill sizes={`${size}px`} className="object-cover" />;
  return (
    <span aria-hidden style={{ fontSize: size * 0.5 }}>
      {app.glyph}
    </span>
  );
}
