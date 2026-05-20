import cron from "node-cron";
import dayjs from "dayjs";
import { fetchForexFactory } from "./sources/forexfactory.js";
import { fetchEarningsRange } from "./sources/nasdaq.js";
import { upsertEvents, setSourceStatus } from "./db.js";

const EARNINGS_DAYS_BACK = 7;
const EARNINGS_DAYS_FORWARD = 31;

const refreshForex = async (): Promise<void> => {
  try {
    const events = await fetchForexFactory();
    upsertEvents(events);
    setSourceStatus({
      source: "forex",
      lastRefresh: new Date().toISOString(),
      lastError: null,
    });
    console.log(`[forex] ok, ${events.length} events`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setSourceStatus({
      source: "forex",
      lastRefresh: null,
      lastError: msg,
    });
    console.error(`[forex] failed:`, msg);
  }
};

const refreshEarnings = async (): Promise<void> => {
  try {
    const start = dayjs().subtract(EARNINGS_DAYS_BACK, "day").format("YYYY-MM-DD");
    const total = EARNINGS_DAYS_BACK + EARNINGS_DAYS_FORWARD;
    const { events, tier } = await fetchEarningsRange(start, total);
    upsertEvents(events);
    setSourceStatus({
      source: "earnings",
      lastRefresh: new Date().toISOString(),
      lastError: null,
      lastUsedTier: tier,
    });
    console.log(`[earnings] ok, ${events.length} events via ${tier}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setSourceStatus({
      source: "earnings",
      lastRefresh: null,
      lastError: msg,
    });
    console.error(`[earnings] failed:`, msg);
  }
};

export const refreshAll = async (): Promise<void> => {
  await Promise.all([refreshForex(), refreshEarnings()]);
};

export const startScheduler = (): void => {
  cron.schedule("*/15 * * * *", () => {
    void refreshAll();
  });
  void refreshAll();
};
