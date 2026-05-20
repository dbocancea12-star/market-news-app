import Constants from "expo-constants";
import dayjs from "dayjs";
import type { Event, Source } from "./types";
import { readCache, writeCache } from "./cache";

const API_BASE: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:8080";

export const fetchEvents = async (opts: {
  from?: string;
  to?: string;
  sources?: Source[];
}): Promise<Event[]> => {
  const from = opts.from ?? dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const to = opts.to ?? dayjs().add(14, "day").format("YYYY-MM-DD");
  const sources = (opts.sources ?? ["forex", "oil", "earnings"]).join(",");
  const cacheKey = `events:${from}:${to}:${sources}`;

  const url = `${API_BASE}/api/events?from=${from}&to=${to}&sources=${sources}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const json = (await res.json()) as { events: Event[] };
    await writeCache(cacheKey, json.events);
    return json.events;
  } catch (err) {
    const cached = await readCache<Event[]>(cacheKey);
    if (cached) return cached;
    throw err;
  }
};

export const fetchEvent = async (id: string): Promise<Event> => {
  const res = await fetch(`${API_BASE}/api/events/${id}`);
  if (!res.ok) throw new Error(`api ${res.status}`);
  return (await res.json()) as Event;
};

export { API_BASE };
