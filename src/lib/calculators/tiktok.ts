import {
  COIN_TO_USD,
  DIAMOND_TO_USD,
  COIN_TO_DIAMOND,
  COIN_BULK,
  DIAMOND_BULK,
} from "../../data/coinConfig";

export function coinsToUsd(coins: number): number {
  if (!Number.isFinite(coins) || coins < 0) return 0;
  return coins * COIN_TO_USD;
}
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / COIN_TO_USD);
}
export function coinsToDiamonds(coins: number): number {
  if (!Number.isFinite(coins) || coins < 0) return 0;
  return coins * COIN_TO_DIAMOND;
}
export function diamondsToCoins(diamonds: number): number {
  if (!Number.isFinite(diamonds) || diamonds < 0) return 0;
  return Math.round(diamonds / COIN_TO_DIAMOND);
}
export function diamondsToUsd(diamonds: number): number {
  if (!Number.isFinite(diamonds) || diamonds < 0) return 0;
  return diamonds * DIAMOND_TO_USD;
}
export function usdToDiamonds(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / DIAMOND_TO_USD);
}
export function coinsBulkTable(rows: number[] = COIN_BULK) {
  return rows.map((coins) => ({ bits: coins, usd: coinsToUsd(coins) }));
}
export function diamondsBulkTable(rows: number[] = DIAMOND_BULK) {
  return rows.map((diamonds) => ({
    bits: diamonds,
    usd: diamondsToUsd(diamonds),
  }));
}
