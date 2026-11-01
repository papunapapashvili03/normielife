import { JOB, STARTING_CASH } from "@/lib/game/config";

// One whole life as a net worth chart, annotated in marker like a CT screenshot.
// Every annotation sits on a keypoint, so the story and the line always agree.

type Note = { text: string; dx: number; dy: number; tone?: "good" | "bad"; anchor?: "start" | "middle" | "end" };
const KEYS: [age: number, nw: number, note?: Note][] = [
  [18, STARTING_CASH],
  [18.6, 4600],
  [19, 5400],
  [19.35, 14_000, { text: "felt like a genius", dx: -30, dy: -54, anchor: "end" }],
  [19.55, 2600],
  [19.75, 380, { text: "first rug", dx: 34, dy: 52, tone: "bad", anchor: "start" }],
  [20.1, 300],
  [20.6, 1400, { text: `the ${JOB.name} arc`, dx: 40, dy: 66, anchor: "start" }],
  [21.1, 5200],
  [21.45, 61_000, { text: "112x on $PIZZADOG", dx: -26, dy: -50, tone: "good", anchor: "end" }],
  [22.2, 44_000],
  [23.1, 150_000],
  [24, 210_000, { text: "became a chad", dx: -10, dy: 62, anchor: "middle" }],
  [25, 560_000],
  [26, 1_150_000, { text: "whale for three weeks", dx: -24, dy: -26, anchor: "end" }],
  [26.5, 930_000],
  [27.3, 380_000, { text: "-$380K on $SKIBIDIAI", dx: 30, dy: 58, tone: "bad", anchor: "start" }],
  [28, 310_000],
  [40, 880_000],
  [55, 120_000],
  [68, 26_000],
  [76, 2100, { text: "died holding the bag", dx: -16, dy: 56, anchor: "end" }],
];

const W = 1200;
const H = 440;
const PAD = { l: 58, r: 30, t: 40, b: 46 };
const BREAK = 28;
const END = 76;
const LOG_LO = 2; // $100
const LOG_HI = 6.6; // ~$4M

/** Ages 18–28 get most of the width; the next 48 years are squeezed in after a break. */
const xFrac = (age: number) => (age <= BREAK ? ((age - 18) / (BREAK - 18)) * 0.83 : 0.88 + ((age - BREAK) / (END - BREAK)) * 0.12);
const x = (age: number) => PAD.l + xFrac(age) * (W - PAD.l - PAD.r);
const y = (nw: number) => PAD.t + (1 - (Math.log10(Math.max(100, nw)) - LOG_LO) / (LOG_HI - LOG_LO)) * (H - PAD.t - PAD.b);

/** Fills in market noise between keypoints, deterministically. */
function trace(): { early: [number, number][]; late: [number, number][] } {
  let seed = 482913;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const early: [number, number][] = [];
  const late: [number, number][] = [];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a0, v0] = KEYS[i];
    const [a1, v1] = KEYS[i + 1];
    const out = a0 >= BREAK ? late : early;
    const n = Math.max(2, Math.round((xFrac(a1) - xFrac(a0)) * 110));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const lg = Math.log10(v0) + (Math.log10(v1) - Math.log10(v0)) * t;
      const noise = k === 0 ? 0 : (rnd() - 0.5) * 0.16;
      out.push([x(a0 + (a1 - a0) * t), y(10 ** (lg + noise))]);
    }
    if (a1 === BREAK) early.push([x(a1), y(v1)]);
  }
  late.unshift([x(BREAK), y(KEYS.find(([a]) => a === BREAK)![1])]);
  late.push([x(END), y(KEYS[KEYS.length - 1][1])]);
  return { early, late };
}

const line = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
/** Area between the line and the starting-cash line, so gains and losses fill separately. */
const area = (pts: [number, number][], base: number) => `${line(pts)}L${pts[pts.length - 1][0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z`;

/** A marker arrow from the note to the point, with a little head. */
function arrow(px: number, py: number, tx: number, ty: number): string {
  const sx = tx;
  const sy = ty < py ? ty + 8 : ty - 26;
  const ang = Math.atan2(py - sy, px - sx);
  const ex = px - Math.cos(ang) * 9;
  const ey = py - Math.sin(ang) * 9;
  const cx = sx + (ex - sx) * 0.15;
  const cy = sy + (ey - sy) * 0.85;
  const end = Math.atan2(ey - cy, ex - cx);
  const h = (d: number) => `${(ex - Math.cos(end + d) * 9).toFixed(1)},${(ey - Math.sin(end + d) * 9).toFixed(1)}`;
  return `M${sx.toFixed(1)},${sy.toFixed(1)}Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}M${h(0.5)}L${ex.toFixed(1)},${ey.toFixed(1)}L${h(-0.5)}`;
}

const DRAW_MS = 2600;
const GRID: [number, string][] = [
  [1_000, "$1K"],
  [10_000, "$10K"],
  [100_000, "$100K"],
  [1_000_000, "$1M"],
];
const AGES = [18, 20, 22, 24, 26, 28];

export function LifeChart() {
  const { early, late } = trace();
  const start = y(STARTING_CASH);
  const plotBottom = H - PAD.b;
  const breakX = PAD.l + 0.855 * (W - PAD.l - PAD.r);

  return (
    <figure className="scroll-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Example life: net worth from age 18 to 76">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[760px]" role="img" aria-labelledby="life-chart-desc">
        <desc id="life-chart-desc">
          Net worth over one life. Starts at $5,000 at 18, runs up to $14K on a first coin, gets rugged to $380, works at {JOB.name} back to $5K, hits 112x on $PIZZADOG, becomes a whale at 26 with $1.15M, loses $380K, and dies at 76 holding $2,100.
        </desc>
        <defs>
          <clipPath id="above-start">
            <rect x="0" y="0" width={W} height={start} />
          </clipPath>
          <clipPath id="below-start">
            <rect x="0" y={start} width={W} height={H - start} />
          </clipPath>
        </defs>

        {GRID.map(([v, label]) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize="13" fill="var(--faint)" className="num">
              {label}
            </text>
          </g>
        ))}

        {/* Above the $5K start is green; below it is red. */}
        {[early, late].map((pts, i) => (
          <g key={i} className="fade-in">
            <path d={area(pts, start)} fill="var(--mint-fill)" opacity="0.35" clipPath="url(#above-start)" />
            <path d={area(pts, start)} fill="var(--rose)" opacity="0.12" clipPath="url(#below-start)" />
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={start} y2={start} stroke="var(--mint)" strokeDasharray="4 5" />
        <text x={PAD.l + 8} y={start + 18} fontSize="13" fill="var(--mint)" className="num">
          start · $5K
        </text>

        <path d={`${line(early)}${line(late)}`} fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinejoin="round" pathLength={1} className="draw-life" />

        {/* The break: 48 years squeezed into a sliver. */}
        <g aria-hidden>
          <rect x={breakX - 10} y={PAD.t - 10} width="20" height={plotBottom - PAD.t + 10} fill="var(--bg)" />
          <path d={`M${breakX - 8},${plotBottom + 6}l6,-12M${breakX + 2},${plotBottom + 6}l6,-12`} stroke="var(--faint)" strokeWidth="1.5" />
        </g>

        {AGES.map((a) => (
          <text key={a} x={x(a)} y={H - 14} textAnchor="middle" fontSize="13" fill="var(--faint)" className="num">
            {a}
          </text>
        ))}
        <text x={breakX} y={H - 14} textAnchor="middle" fontSize="13" fill="var(--faint)" className="num">
          …
        </text>
        <text x={x(END)} y={H - 14} textAnchor="end" fontSize="13" fill="var(--faint)" className="num">
          76
        </text>

        {KEYS.filter((k) => k[2]).map(([age, nw, note]) => {
          const n = note!;
          const px = x(age);
          const py = y(nw);
          const tx = px + n.dx;
          const ty = py + n.dy;
          const color = n.tone === "good" ? "var(--mint)" : n.tone === "bad" ? "var(--rose)" : "var(--text)";
          return (
            <g key={age} className="ink-in" style={{ animationDelay: `${Math.round(xFrac(age) * DRAW_MS) + 150}ms` }}>
              <circle cx={px} cy={py} r="4.5" fill="var(--bg)" stroke={color} strokeWidth="2" />
              <path d={arrow(px, py, tx, ty)} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <text x={tx} y={ty} textAnchor={n.anchor ?? "middle"} fontSize="27" fontWeight="700" fill={color} style={{ fontFamily: "var(--font-hand)" }}>
                {n.text}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
