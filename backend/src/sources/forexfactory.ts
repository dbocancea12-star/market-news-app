import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import type { Event, Impact } from "../types.js";
import { tagOil } from "./oil.js";
import { etDay, etTime } from "../time.js";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const FEED_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_lastweek.xml",
  "https://nfs.faireconomy.media/ff_calendar_thisweek.xml",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.xml",
];

type RawEvent = {
  title?: string;
  country?: string;
  date?: string;
  time?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  url?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
});

const mapImpact = (raw: string | undefined): Impact => {
  switch ((raw ?? "").toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "holiday":
      return "holiday";
    default:
      return "low";
  }
};

const toUtcIso = (dateStr: string, timeStr: string): string | null => {
  const time = timeStr.toLowerCase() === "all day" ? "12:00am" : timeStr;
  const dt = dayjs.utc(`${dateStr} ${time}`, "MM-DD-YYYY h:mma");
  if (!dt.isValid()) return null;
  return dt.toISOString();
};

const eventId = (source: string, startsAt: string, title: string, country?: string): string =>
  createHash("sha1")
    .update(`${source}|${startsAt}|${country ?? ""}|${title}`)
    .digest("hex")
    .slice(0, 16);

const fetchFeed = async (url: string): Promise<RawEvent[]> => {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; market-news-app/0.1; +https://github.com/)",
      Accept: "application/xml, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`FF feed ${url} returned ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    weeklyevents?: { event?: RawEvent | RawEvent[] };
  };
  const raw = parsed.weeklyevents?.event ?? [];
  return Array.isArray(raw) ? raw : [raw];
};

export const fetchForexFactory = async (): Promise<Event[]> => {
  const all: Event[] = [];
  let anySucceeded = false;
  for (const url of FEED_URLS) {
    let rows: RawEvent[];
    try {
      rows = await fetchFeed(url);
      anySucceeded = true;
    } catch (err) {
      console.warn(`[forex] ${url} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
    for (const r of rows) {
      if (!r.title || !r.date || !r.time) continue;
      const startsAt = toUtcIso(r.date, r.time);
      if (!startsAt) continue;
      const initialSource = "forex";
      const id = eventId(initialSource, startsAt, r.title, r.country);
      const base: Event = {
        id,
        startsAt,
        etDay: etDay(startsAt),
        etTime: etTime(startsAt),
        source: "forex",
        title: r.title,
        country: r.country?.trim() || undefined,
        impact: mapImpact(r.impact),
        forecast: r.forecast?.trim() || undefined,
        previous: r.previous?.trim() || undefined,
        url: r.url?.trim() || undefined,
      };
      all.push(tagOil(base));
    }
  }
  if (!anySucceeded) throw new Error("all FF feeds failed");
  return all;
};
