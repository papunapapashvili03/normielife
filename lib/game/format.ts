export function money(n: number, opts: { sign?: boolean; exact?: boolean } = {}): string {
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (opts.exact || a < 10_000) {
    s = "$" + Math.round(a).toLocaleString("en-US");
  } else if (a < 1_000_000) {
    s = "$" + trim(a / 1_000) + "K";
  } else if (a < 1_000_000_000) {
    s = "$" + trim(a / 1_000_000) + "M";
  } else {
    s = "$" + trim(a / 1_000_000_000) + "B";
  }
  if (neg) return "-" + s;
  if (opts.sign && n > 0) return "+" + s;
  return s;
}

function trim(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function pct(fraction: number, sign = true): string {
  const v = fraction * 100;
  const abs = Math.abs(v);
  const body = abs >= 1000 ? Math.round(abs).toLocaleString("en-US") : abs >= 10 ? Math.round(abs).toString() : abs.toFixed(1);
  const s = v < 0 ? "-" : sign && v > 0 ? "+" : "";
  return `${s}${body}%`;
}

export function mult(x: number): string {
  if (x >= 100) return Math.round(x).toLocaleString("en-US") + "x";
  if (x >= 10) return x.toFixed(1).replace(/\.0$/, "") + "x";
  return x.toFixed(2).replace(/\.?0+$/, "") + "x";
}

export function compact(n: number): string {
  const a = Math.abs(n);
  if (a < 1_000) return Math.round(n).toString();
  if (a < 1_000_000) return trim(n / 1_000) + "K";
  if (a < 1_000_000_000) return trim(n / 1_000_000) + "M";
  return trim(n / 1_000_000_000) + "B";
}
