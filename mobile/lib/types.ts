export type Impact = "high" | "medium" | "low" | "holiday";
export type Source = "forex" | "oil" | "earnings";
export type WhenMarket = "BMO" | "AMC" | "DMH";

export type Event = {
  id: string;
  startsAt: string;
  etDay: string;
  etTime: string;
  source: Source;
  title: string;
  country?: string;
  ticker?: string;
  company?: string;
  impact: Impact;
  isMag7?: boolean;
  forecast?: string;
  previous?: string;
  actual?: string;
  whenMarket?: WhenMarket;
  epsEstimate?: number;
  marketCap?: number;
  url?: string;
};
