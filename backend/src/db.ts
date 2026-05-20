import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Event, SourceStatus } from "./types.js";

const DB_PATH = process.env.DB_PATH ?? "./cache.db";

try {
  mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {
  // ignore — directory may already exist or be cwd
}

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    starts_at   TEXT NOT NULL,
    et_day      TEXT NOT NULL DEFAULT '',
    et_time     TEXT NOT NULL DEFAULT '',
    source      TEXT NOT NULL,
    title       TEXT NOT NULL,
    country     TEXT,
    ticker      TEXT,
    company     TEXT,
    impact      TEXT NOT NULL,
    is_mag7     INTEGER NOT NULL DEFAULT 0,
    forecast    TEXT,
    previous    TEXT,
    actual      TEXT,
    when_market TEXT,
    eps_est     REAL,
    market_cap  REAL,
    url         TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
  CREATE INDEX IF NOT EXISTS idx_events_source    ON events(source);

  CREATE TABLE IF NOT EXISTS source_status (
    source         TEXT PRIMARY KEY,
    last_refresh   TEXT,
    last_error     TEXT,
    last_used_tier TEXT
  );
`);

for (const col of ["et_day TEXT NOT NULL DEFAULT ''", "et_time TEXT NOT NULL DEFAULT ''"]) {
  try {
    db.exec(`ALTER TABLE events ADD COLUMN ${col}`);
  } catch {
    // column already exists
  }
}

const insertStmt = db.prepare(`
  INSERT INTO events (
    id, starts_at, et_day, et_time, source, title, country, ticker, company, impact,
    is_mag7, forecast, previous, actual, when_market, eps_est, market_cap, url
  ) VALUES (
    $id, $startsAt, $etDay, $etTime, $source, $title, $country, $ticker, $company, $impact,
    $isMag7, $forecast, $previous, $actual, $whenMarket, $epsEstimate, $marketCap, $url
  )
  ON CONFLICT(id) DO UPDATE SET
    starts_at   = excluded.starts_at,
    et_day      = excluded.et_day,
    et_time     = excluded.et_time,
    source      = excluded.source,
    title       = excluded.title,
    country     = excluded.country,
    ticker      = excluded.ticker,
    company     = excluded.company,
    impact      = excluded.impact,
    is_mag7     = excluded.is_mag7,
    forecast    = excluded.forecast,
    previous    = excluded.previous,
    actual      = excluded.actual,
    when_market = excluded.when_market,
    eps_est     = excluded.eps_est,
    market_cap  = excluded.market_cap,
    url         = excluded.url
`);

const beginStmt = db.prepare("BEGIN");
const commitStmt = db.prepare("COMMIT");
const rollbackStmt = db.prepare("ROLLBACK");

export const upsertEvents = (events: Event[]): void => {
  beginStmt.run();
  try {
    for (const e of events) {
      insertStmt.run({
        id: e.id,
        startsAt: e.startsAt,
        etDay: e.etDay,
        etTime: e.etTime,
        source: e.source,
        title: e.title,
        country: e.country ?? null,
        ticker: e.ticker ?? null,
        company: e.company ?? null,
        impact: e.impact,
        isMag7: e.isMag7 ? 1 : 0,
        forecast: e.forecast ?? null,
        previous: e.previous ?? null,
        actual: e.actual ?? null,
        whenMarket: e.whenMarket ?? null,
        epsEstimate: e.epsEstimate ?? null,
        marketCap: e.marketCap ?? null,
        url: e.url ?? null,
      });
    }
    commitStmt.run();
  } catch (err) {
    rollbackStmt.run();
    throw err;
  }
};

type Row = {
  id: string;
  starts_at: string;
  et_day: string;
  et_time: string;
  source: string;
  title: string;
  country: string | null;
  ticker: string | null;
  company: string | null;
  impact: string;
  is_mag7: number;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  when_market: string | null;
  eps_est: number | null;
  market_cap: number | null;
  url: string | null;
};

const rowToEvent = (r: Row): Event => ({
  id: r.id,
  startsAt: r.starts_at,
  etDay: r.et_day,
  etTime: r.et_time,
  source: r.source as Event["source"],
  title: r.title,
  country: r.country ?? undefined,
  ticker: r.ticker ?? undefined,
  company: r.company ?? undefined,
  impact: r.impact as Event["impact"],
  isMag7: r.is_mag7 === 1,
  forecast: r.forecast ?? undefined,
  previous: r.previous ?? undefined,
  actual: r.actual ?? undefined,
  whenMarket: (r.when_market as Event["whenMarket"]) ?? undefined,
  epsEstimate: r.eps_est ?? undefined,
  marketCap: r.market_cap ?? undefined,
  url: r.url ?? undefined,
});

const selectRange = db.prepare(`
  SELECT * FROM events
  WHERE et_day >= $from AND et_day <= $to
  ORDER BY et_day ASC, et_time ASC
`);

export const getEvents = (from: string, to: string): Event[] =>
  (selectRange.all({ from, to }) as unknown as Row[]).map(rowToEvent);

const selectOne = db.prepare(`SELECT * FROM events WHERE id = ?`);
export const getEvent = (id: string): Event | null => {
  const r = selectOne.get(id) as Row | undefined;
  return r ? rowToEvent(r) : null;
};

const upsertStatus = db.prepare(`
  INSERT INTO source_status (source, last_refresh, last_error, last_used_tier)
  VALUES ($source, $lastRefresh, $lastError, $lastUsedTier)
  ON CONFLICT(source) DO UPDATE SET
    last_refresh   = excluded.last_refresh,
    last_error     = excluded.last_error,
    last_used_tier = excluded.last_used_tier
`);

export const setSourceStatus = (s: SourceStatus): void => {
  upsertStatus.run({
    source: s.source,
    lastRefresh: s.lastRefresh,
    lastError: s.lastError,
    lastUsedTier: s.lastUsedTier ?? null,
  });
};

const selectStatus = db.prepare(`SELECT * FROM source_status`);
export const getSourceStatuses = (): SourceStatus[] =>
  (
    selectStatus.all() as unknown as Array<{
      source: string;
      last_refresh: string | null;
      last_error: string | null;
      last_used_tier: string | null;
    }>
  ).map((r) => ({
    source: r.source as SourceStatus["source"],
    lastRefresh: r.last_refresh,
    lastError: r.last_error,
    lastUsedTier: r.last_used_tier,
  }));
