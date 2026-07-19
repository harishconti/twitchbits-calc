export const CURRENCIES: Record<
  string,
  { symbol: string; code: string; decimals: number }
> = {
  USD: { symbol: "$", code: "USD", decimals: 2 },
  GBP: { symbol: "£", code: "GBP", decimals: 2 },
  EUR: { symbol: "€", code: "EUR", decimals: 2 },
  CAD: { symbol: "C$", code: "CAD", decimals: 2 },
  AUD: { symbol: "A$", code: "AUD", decimals: 2 },
  JPY: { symbol: "¥", code: "JPY", decimals: 0 },
  MXN: { symbol: "MX$", code: "MXN", decimals: 2 },
  BRL: { symbol: "R$", code: "BRL", decimals: 2 },
  INR: { symbol: "₹", code: "INR", decimals: 0 },
};
