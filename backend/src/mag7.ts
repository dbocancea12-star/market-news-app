export const MAG7 = new Set([
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "NVDA",
  "TSLA",
]);

export const isMag7 = (ticker?: string | null): boolean =>
  !!ticker && MAG7.has(ticker.toUpperCase());
