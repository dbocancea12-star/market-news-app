const fmtET = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
});

const todayET = (): string => fmtET.format(new Date());

const addDays = (ymd: string, n: number): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const weekdayUTC = (ymd: string): number => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun .. 6 Sat
};

const startOfWeek = (ymd: string): string => addDays(ymd, -weekdayUTC(ymd)); // Sunday
const endOfWeek = (ymd: string): string => addDays(startOfWeek(ymd), 6); // Saturday
const startOfMonth = (ymd: string): string => `${ymd.slice(0, 7)}-01`;
const endOfMonth = (ymd: string): string => {
  const [y, m] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

export type RangeKey =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "thisWeek"
  | "nextWeek"
  | "lastWeek"
  | "thisMonth"
  | "nextMonth"
  | "lastMonth";

export type Range = { key: RangeKey; label: string; from: string; to: string };

export const computeRange = (key: RangeKey): Range => {
  const today = todayET();
  switch (key) {
    case "today":
      return { key, label: "Today", from: today, to: today };
    case "tomorrow": {
      const d = addDays(today, 1);
      return { key, label: "Tomorrow", from: d, to: d };
    }
    case "yesterday": {
      const d = addDays(today, -1);
      return { key, label: "Yesterday", from: d, to: d };
    }
    case "thisWeek":
      return { key, label: "This Week", from: startOfWeek(today), to: endOfWeek(today) };
    case "nextWeek":
      return {
        key,
        label: "Next Week",
        from: addDays(startOfWeek(today), 7),
        to: addDays(endOfWeek(today), 7),
      };
    case "lastWeek":
      return {
        key,
        label: "Last Week",
        from: addDays(startOfWeek(today), -7),
        to: addDays(endOfWeek(today), -7),
      };
    case "thisMonth":
      return {
        key,
        label: "This Month",
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    case "nextMonth": {
      const next = addDays(endOfMonth(today), 1);
      return { key, label: "Next Month", from: startOfMonth(next), to: endOfMonth(next) };
    }
    case "lastMonth": {
      const prev = addDays(startOfMonth(today), -1);
      return { key, label: "Last Month", from: startOfMonth(prev), to: endOfMonth(prev) };
    }
  }
};

export const RANGE_PRESETS: RangeKey[] = [
  "today",
  "tomorrow",
  "yesterday",
  "thisWeek",
  "nextWeek",
  "lastWeek",
  "thisMonth",
  "nextMonth",
  "lastMonth",
];

export const formatRangeSubtitle = (range: Range): string => {
  if (range.from === range.to) {
    const [y, m, d] = range.from.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${monthFmt.format(dt)} ${d}, ${y}`;
  }
  const [yf, mf, df] = range.from.split("-").map(Number);
  const [yt, mt, dt2] = range.to.split("-").map(Number);
  const dtFrom = new Date(Date.UTC(yf, mf - 1, df));
  const dtTo = new Date(Date.UTC(yt, mt - 1, dt2));
  const fromLabel = `${monthFmt.format(dtFrom)} ${df}`;
  const toLabel =
    mf === mt && yf === yt
      ? `${dt2}`
      : `${monthFmt.format(dtTo)} ${dt2}`;
  return `${fromLabel} – ${toLabel}`;
};
