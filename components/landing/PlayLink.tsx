import Link from "next/link";

/** The one call to action, everywhere on the page. */
export function PlayLink({ size = "lg", className = "" }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <Link
      href="/play"
      className={`age-btn inline-flex items-center justify-center gap-2 font-extrabold ${size === "lg" ? "px-7 py-3.5 text-[16px]" : "px-4 py-2 text-[13px]"} ${className}`}
    >
      Start a life
      <span aria-hidden>→</span>
    </Link>
  );
}
