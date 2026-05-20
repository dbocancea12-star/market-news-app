const FLAG: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  NZD: "🇳🇿",
  CHF: "🇨🇭",
  CNY: "🇨🇳",
};

export const flagFor = (code?: string): string | null =>
  code ? FLAG[code.toUpperCase()] ?? null : null;
