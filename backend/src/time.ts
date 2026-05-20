const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});

export const etDay = (isoUtc: string): string => {
  const parts = dateFmt.formatToParts(new Date(isoUtc));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

export const etTime = (isoUtc: string): string =>
  timeFmt.format(new Date(isoUtc)).replace(/^24/, "00");

export const etWeekday = (isoUtc: string): string =>
  weekdayFmt.format(new Date(isoUtc));
