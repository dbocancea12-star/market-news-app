import Constants from "expo-constants";
import type { Event } from "./types";
import { readCache, writeCache } from "./cache";

const DATA_URL: string =
  (Constants.expoConfig?.extra?.dataUrl as string | undefined) ??
  "https://raw.githubusercontent.com/dbocancea12-star/market-news-app/main/data/events.json";

const CACHE_KEY = "events:all";

type Payload = {
  updatedAt: string;
  count: number;
  events: Event[];
};

let inMemory: Event[] | null = null;

const fetchAll = async (): Promise<Event[]> => {
  if (inMemory) return inMemory;
  try {
    // Cache-bust query so GitHub's CDN doesn't serve stale data
    const url = `${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const json = (await res.json()) as Payload;
    inMemory = json.events;
    await writeCache(CACHE_KEY, json.events);
    return json.events;
  } catch (err) {
    const cached = await readCache<Event[]>(CACHE_KEY);
    if (cached) {
      inMemory = cached;
      return cached;
    }
    throw err;
  }
};

export const refreshAll = async (): Promise<Event[]> => {
  inMemory = null;
  return fetchAll();
};

export const fetchEvents = async (opts: {
  from?: string;
  to?: string;
}): Promise<Event[]> => {
  const all = await fetchAll();
  const { from, to } = opts;
  return all.filter((e) => {
    if (from && e.etDay < from) return false;
    if (to && e.etDay > to) return false;
    return true;
  });
};

export const fetchEvent = async (id: string): Promise<Event> => {
  const all = await fetchAll();
  const found = all.find((e) => e.id === id);
  if (!found) throw new Error(`Event ${id} not found`);
  return found;
};

export { DATA_URL };
