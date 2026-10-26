import { describe, expect, it } from "vitest";
import { playLife, RANDOM_POLICY, SMART_POLICY, summarize, type Policy } from "./sim";

async function distribution(policy: Policy, n: number) {
  const runs: ReturnType<typeof summarize>[] = [];
  for (let i = 0; i < n; i++) {
    runs.push(summarize(playLife(1000 + i, 6000, policy)));
    // Yield so the test worker stays responsive during long simulations.
    await new Promise((r) => setImmediate(r));
  }
  const share = (min: number) => runs.filter((r) => r.peak >= min).length / n;
  return {
    "1K": share(1_000),
    "100K": share(100_000),
    "1M": share(1_000_000),
    "10M": share(10_000_000),
    avgBroke: runs.reduce((a, r) => a + r.broke, 0) / n,
  };
}

// Spec §42: $1K achievable, $100K hard, $1M rare, $10M+ extremely rare.
describe("balance", () => {
  const N = Number(process.env.SIM_RUNS ?? 120);

  it("a random degen rarely gets rich", async () => {
    const d = await distribution(RANDOM_POLICY, N);
    console.log("random", d);
    expect(d["1K"]).toBeGreaterThan(0.6);
    expect(d["100K"]).toBeLessThan(0.3);
    expect(d["1M"]).toBeLessThan(0.05);
    expect(d["10M"]).toBeLessThan(0.02);
  }, 600_000);

  it("a careful trader does better, but $1M stays rare", async () => {
    const d = await distribution(SMART_POLICY, N);
    console.log("careful", d);
    expect(d["100K"]).toBeGreaterThan(0.1);
    expect(d["1M"]).toBeLessThan(0.15);
    expect(d["10M"]).toBeLessThan(0.04);
  }, 600_000);
});
