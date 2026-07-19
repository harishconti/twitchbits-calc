export const COIN_TO_USD = 0.0105; // viewer purchase value per coin (approx)
export const COIN_TO_DIAMOND = 0.5; // 2 coins → 1 diamond for the creator
export const DIAMOND_TO_USD = 0.005; // creator payout per diamond
export const COIN_BULK = [100, 500, 1000, 5000, 10000, 50000];
export const DIAMOND_BULK = [50, 250, 500, 2500, 5000, 25000];

export const TIKTOK_GIFT_EXAMPLES = [
  { name: "Rose", coins: 1, diamonds: 0.5 },
  { name: "TikTok", coins: 1, diamonds: 0.5 },
  { name: "Love You", coins: 5, diamonds: 2.5 },
  { name: "Sun Cream", coins: 50, diamonds: 25 },
  { name: "Doughnut", coins: 30, diamonds: 15 },
  { name: "Lollipop", coins: 10, diamonds: 5 },
] as const;
