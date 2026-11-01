"use client";

import { useState, type Dispatch } from "react";
import { NARRATIVE_LABEL, getCoin, holders, lastChange, liquidity, marketCap, shownRisk } from "@/lib/game/coins";
import { MARKET, SIZE_BANDS } from "@/lib/game/config";
import { compact, money } from "@/lib/game/format";
import { getPosition, maxBuy, netWorth, positionValue, sizeBandFor } from "@/lib/game/portfolio";
import type { Action } from "@/lib/game/reducer";
import type { GameState } from "@/lib/game/types";
import { AreaChart, PctTag, RiskBadge } from "./bits";

const PCTS = [0.1, 0.25, 0.5, 1];

export function OrderTicket({
  state,
  coinId,
  dispatch,
  onClose,
}: {
  state: GameState;
  coinId: string;
  dispatch: Dispatch<Action>;
  onClose?: () => void;
}) {
  const coin = getCoin(state, coinId);
  const pos = getPosition(state, coinId);
  const [mode, setMode] = useState<"buy" | "sell">(pos ? "sell" : "buy");
  const [amount, setAmount] = useState("");
  const [sellFrac, setSellFrac] = useState(1);

  if (!coin) return null;
  const effectiveMode = pos ? mode : "buy";
  const cap = maxBuy(state, coin);
  const nw = netWorth(state);
  const value = pos ? positionValue(state, pos) : 0;
  const chosen = Math.min(Number(amount) || 0, cap);
  const band = chosen > 0 ? sizeBandFor(chosen, nw) : null;
  const blocked = !!state.current || !!state.sim;
  const called = state.offer?.sim.coinId === coinId;
  const impact = (v: number) => Math.min(MARKET.sellImpactCap, v / (Math.max(1, liquidity(coin)) * MARKET.sellImpactK));
  const sellValue = value * sellFrac;
  const k = state.player.stats.knowledge;

  const buy = () => {
    if (chosen < 1) return;
    dispatch({ type: "BUY", coinId: coin.id, amount: chosen });
    setAmount("");
  };
  const sell = () => {
    dispatch({ type: "SELL", coinId: coin.id, fraction: sellFrac });
    if (sellFrac >= 1) setMode("buy");
  };

  return (
    <section aria-label={`Trade $${coin.ticker}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-xl font-extrabold tracking-tight">${coin.ticker}</h2>
            {coin.ageMonths > 0 && <PctTag value={lastChange(coin)} className="text-[13px]" />}
          </div>
          <p className="truncate text-xs text-muted">
            {coin.name} · {NARRATIVE_LABEL[coin.narrative]}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-xl text-muted hover:bg-raised hover:text-text">
            ×
          </button>
        )}
      </div>

      <AreaChart points={coin.spark} className="mt-3 h-20 w-full" />

      <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["MC", money(marketCap(coin))],
          ["Liquidity", money(liquidity(coin))],
          ["Holders", compact(holders(coin))],
        ].map(([kk, v]) => (
          <div key={kk} className="rounded-lg bg-raised py-1.5">
            <dt className="text-[10px] text-muted">{kk}</dt>
            <dd className="num text-[13px]">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <RiskBadge risk={shownRisk(coin, k)} />
        {k >= 50 && <span>Rug odds ~{Math.round(coin.rugProb * 100)}%</span>}
        <span className="truncate">By {coin.creator}</span>
      </div>

      {pos && (
        <div className="mt-3 grid grid-cols-2 rounded-full bg-raised p-1 text-[13px] font-bold" role="tablist" aria-label="Order side">
          {(["buy", "sell"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={effectiveMode === m}
              onClick={() => setMode(m)}
              className={`rounded-full py-1.5 capitalize ${effectiveMode === m ? (m === "buy" ? "bg-mint-fill text-mint-ink" : "bg-rose text-white") : "text-muted hover:text-text"}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {effectiveMode === "sell" && pos ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-muted">Position</span>
            <span>
              <span className="num">{money(value)}</span> <PctTag value={pos.cost ? value / pos.cost - 1 : 0} className="text-xs" />
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PCTS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={sellFrac === f}
                onClick={() => setSellFrac(f)}
                className={`num rounded-full border py-1.5 text-xs ${sellFrac === f ? "border-rose text-rose" : "border-line-strong text-muted hover:text-text"}`}
              >
                {f === 1 ? "All" : `${f * 100}%`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            You receive ≈ <span className="num text-text">{money(sellValue * (1 - impact(sellValue)))}</span>
            {impact(sellValue) > 0.05 && <span className="text-amber"> · thin liquidity, price impact {Math.round(impact(sellValue) * 100)}%</span>}
          </p>
          <button type="button" onClick={sell} className="mt-3 w-full rounded-full bg-rose py-3 text-[15px] font-extrabold text-white hover:brightness-105">
            Sell {sellFrac === 1 ? "all" : `${sellFrac * 100}%`} of ${coin.ticker}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {called ? (
            <p className="rounded-xl bg-raised p-3 text-[13px] text-muted">Answer the call first: go in or ignore it.</p>
          ) : blocked ? (
            <p className="rounded-xl bg-raised p-3 text-[13px] text-muted">Finish what&apos;s on the board first, then come back to buy.</p>
          ) : cap < 1 ? (
            <p className="rounded-xl bg-raised p-3 text-[13px] text-muted">No cash to buy with. {state.job.employed ? "Payday is coming." : "Maybe pick up some shifts?"}</p>
          ) : (
            <>
              <label className="flex items-center rounded-xl border border-line-strong bg-bg px-3 focus-within:border-mint">
                <span className="text-muted">$</span>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Amount in dollars"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && buy()}
                  className="num w-full bg-transparent px-2 py-2.5 text-[15px] outline-none"
                />
                <span className="num whitespace-nowrap text-[11px] text-faint">of {money(cap)}</span>
              </label>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PCTS.map((f) => {
                  const v = Math.floor(cap * f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className={`num rounded-full border py-1.5 text-xs ${chosen === v && v > 0 ? "border-mint text-mint" : "border-line-strong text-muted hover:text-text"}`}
                    >
                      {f === 1 ? "Max" : `${f * 100}%`}
                    </button>
                  );
                })}
              </div>
              <p className={`mt-2 h-4 text-[11px] ${band === "fullsend" ? "font-bold text-rose" : "text-muted"}`}>
                {band && (
                  <>
                    {SIZE_BANDS[band].emoji} {SIZE_BANDS[band].label} · {nw > 0 ? Math.round((chosen / nw) * 100) : 0}% of net worth
                  </>
                )}
              </p>
              <button type="button" disabled={chosen < 1} onClick={buy} className="mt-2 w-full rounded-full bg-mint-fill py-3 text-[15px] font-extrabold text-mint-ink hover:brightness-105 disabled:opacity-40">
                {chosen >= 1 ? `Buy ${money(chosen)} of $${coin.ticker}` : "Enter an amount"}
              </button>
              {cap < state.cash && <p className="mt-1.5 text-center text-[11px] text-faint">Max buy is capped by liquidity.</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
