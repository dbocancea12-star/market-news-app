import { createHash } from "node:crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import tz from "dayjs/plugin/timezone.js";
import type { Event, WhenMarket } from "../types.js";
import { isMag7 } from "../mag7.js";
import { etDay, etTime } from "../time.js";

dayjs.extend(utc);
dayjs.extend(tz);

const ET = "America/New_York";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/market-activity/earnings",
};

type NasdaqRow = {
  symbol?: string;
  name?: string;
  time?: string;
  epsForecast?: string;
  marketCap?: string;
};

const parseNumber = (v?: string): number | undefined => {
  if (!v) return undefined;
  const cleaned = v.replace(/[$,\s]/g, "");
  if (!cleaned || cleaned === "N/A") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

const mapTime = (t?: string): WhenMarket | undefined => {
  if (!t) return undefined;
  const k = t.toLowerCase();
  if (k.includes("pre-market") || k.includes("before")) return "BMO";
  if (k.includes("after-hours") || k.includes("after")) return "AMC";
  if (k.includes("during")) return "DMH";
  return undefined;
};

const startsAtFor = (date: string, when?: WhenMarket): string => {
  const base = dayjs.tz(date, ET);
  const dt =
    when === "BMO"
      ? base.hour(8).minute(0)
      : when === "AMC"
        ? base.hour(16).minute(30)
        : base.hour(12).minute(0);
  return dt.utc().toISOString();
};

const eventId = (date: string, ticker: string): string =>
  createHash("sha1").update(`earnings|${date}|${ticker}`).digest("hex").slice(0, 16);

const rowToEvent = (date: string, r: NasdaqRow): Event | null => {
  const ticker = r.symbol?.trim().toUpperCase();
  if (!ticker) return null;
  const when = mapTime(r.time);
  const mag7 = isMag7(ticker);
  const startsAt = startsAtFor(date, when);
  return {
    id: eventId(date, ticker),
    startsAt,
    etDay: etDay(startsAt),
    etTime: etTime(startsAt),
    source: "earnings",
    title: `${ticker} Earnings`,
    ticker,
    company: r.name?.trim() || undefined,
    impact: mag7 ? "high" : "medium",
    isMag7: mag7 || undefined,
    whenMarket: when,
    epsEstimate: parseNumber(r.epsForecast),
    marketCap: parseNumber(r.marketCap),
    url: `https://www.nasdaq.com/market-activity/stocks/${ticker.toLowerCase()}/earnings`,
  };
};

type Fetcher = (date: string) => Promise<{ events: Event[]; tier: string }>;

const fetchNasdaqApi: Fetcher = async (date) => {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${date}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`nasdaq-api ${res.status}`);
  const json = (await res.json()) as { data?: { rows?: NasdaqRow[] | null } };
  const rows = json.data?.rows ?? [];
  const events = rows.map((r) => rowToEvent(date, r)).filter((e): e is Event => !!e);
  return { events, tier: "nasdaq-api" };
};

const fetchNasdaqHtml: Fetcher = async (date) => {
  const url = `https://www.nasdaq.com/market-activity/earnings?date=${date}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`nasdaq-html ${res.status}`);
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/,
  );
  if (!match) throw new Error("nasdaq-html: __NEXT_DATA__ not found");
  const data = JSON.parse(match[1]) as unknown;
  const rows = findRows(data);
  const events = rows.map((r) => rowToEvent(date, r)).filter((e): e is Event => !!e);
  return { events, tier: "nasdaq-html" };
};

const findRows = (node: unknown): NasdaqRow[] => {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findRows(item);
      if (r.length) return r;
    }
    return [];
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.rows) && obj.rows.length && typeof obj.rows[0] === "object") {
    const first = obj.rows[0] as Record<string, unknown>;
    if ("symbol" in first || "epsForecast" in first) return obj.rows as NasdaqRow[];
  }
  for (const k of Object.keys(obj)) {
    const r = findRows(obj[k]);
    if (r.length) return r;
  }
  return [];
};

const fetchYahoo: Fetcher = async (date) => {
  const url = `https://finance.yahoo.com/calendar/earnings?day=${date}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const html = await res.text();
  const rowRe =
    /<tr[^>]*>[\s\S]*?<a[^>]*data-symbol="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*aria-label="Company"[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*aria-label="Earnings Call Time"[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*aria-label="EPS Estimate"[^>]*>([^<]*)<\/td>/g;
  const rows: NasdaqRow[] = [];
  for (const m of html.matchAll(rowRe)) {
    rows.push({
      symbol: m[1],
      name: m[3],
      time: m[4],
      epsForecast: m[5],
    });
  }
  const events = rows.map((r) => rowToEvent(date, r)).filter((e): e is Event => !!e);
  return { events, tier: "yahoo" };
};

const TIERS: Fetcher[] = [fetchNasdaqApi, fetchNasdaqHtml, fetchYahoo];

export const fetchEarningsForDate = async (
  date: string,
): Promise<{ events: Event[]; tier: string }> => {
  let lastErr: unknown;
  for (const fn of TIERS) {
    try {
      const result = await fn(date);
      return result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("all earnings tiers failed");
};

export const fetchEarningsRange = async (
  startDate: string,
  days: number,
): Promise<{ events: Event[]; tier: string }> => {
  const start = dayjs(startDate);
  const all: Event[] = [];
  let tierUsed = "none";
  for (let i = 0; i < days; i++) {
    const d = start.add(i, "day").format("YYYY-MM-DD");
    try {
      const { events, tier } = await fetchEarningsForDate(d);
      all.push(...events);
      tierUsed = tier;
    } catch (err) {
      console.warn(`[earnings] ${d} failed:`, err);
    }
  }
  return { events: all, tier: tierUsed };
};
