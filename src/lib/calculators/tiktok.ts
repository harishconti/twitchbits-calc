import { COIN_TO_USD, DIAMOND_TO_USD, COIN_BULK } from "../../data/coinConfig";

export function coinsToUsd(coins: number): number {
  if (!Number.isFinite(coins) || coins < 0) return 0;
  return coins * COIN_TO_USD;
}
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / COIN_TO_USD);
}
export function diamondsToUsd(diamonds: number): number {
  if (!Number.isFinite(diamonds) || diamonds < 0) return 0;
  return diamonds * DIAMOND_TO_USD;
}
export function coinsBulkTable(rows: number[] = COIN_BULK) {
  return rows.map((coins) => ({ bits: coins, usd: coinsToUsd(coins) }));
}
