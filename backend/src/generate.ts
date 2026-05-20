// One-shot data generator. Used by the GitHub Actions cron.
// Fetches FF + Nasdaq, normalizes, filters earnings, writes data/events.json.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dayjs from "dayjs";
import { fetchForexFactory } from "./sources/forexfactory.js";
import { fetchEarningsRange } from "./sources/nasdaq.js";
import type { Event } from "./types.js";

const DAYS_BACK = 7;
const DAYS_FORWARD = 31;
const OUTPUT = resolve(process.cwd(), "..", "data", "events.json");

const main = async () => {
  console.log("Fetching Forex Factory feed...");
  let forex: Event[] = [];
  try {
    forex = await fetchForexFactory();
    console.log(`  forex: ${forex.length} events`);
  } catch (err) {
    console.error(`  forex failed: ${err instanceof Error ? err.message : err}`);
  }

  const start = dayjs().subtract(DAYS_BACK, "day").format("YYYY-MM-DD");
  const total = DAYS_BACK + DAYS_FORWARD;
  console.log(`Fetching Nasdaq earnings ${start} for ${total} days...`);
  let earnings: Event[] = [];
  let earningsTier = "none";
  try {
    const result = await fetchEarningsRange(start, total);
    earnings = result.events;
    earningsTier = result.tier;
    console.log(`  earnings: ${earnings.length} events via ${earningsTier}`);
  } catch (err) {
    console.error(`  earnings failed: ${err instanceof Error ? err.message : err}`);
  }

  // Filter earnings: keep only Mag 7 or those with an EPS estimate
  const filtered = [...forex, ...earnings].filter((e) => {
    if (e.source === "earnings" && !e.isMag7 && e.epsEstimate === undefined) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const ka = `${a.etDay} ${a.etTime}`;
    const kb = `${b.etDay} ${b.etTime}`;
    return ka.localeCompare(kb);
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    count: filtered.length,
    sources: {
      forex: forex.length,
      earnings: earnings.length,
      earningsTier,
    },
    events: filtered,
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(payload));
  console.log(
    `Wrote ${filtered.length} events to ${OUTPUT} (forex=${forex.length} earnings=${earnings.length})`,
  );
};

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
