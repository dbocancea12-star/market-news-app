import { StyleSheet, Text, View } from "react-native";
import { BG, BORDER, TEXT, TEXT_DIM } from "@/lib/colors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const todayET = (): string => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

export function DayHeader({ date }: { date: string }) {
  // date is "YYYY-MM-DD" in ET — parse without timezone arithmetic
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAYS[dt.getUTCDay()];
  const monthLabel = MONTHS[m - 1];
  const isToday = date === todayET();
  return (
    <View style={styles.wrap}>
      <Text style={styles.day}>{weekday}</Text>
      <Text style={styles.date}>{`${monthLabel} ${d}`}</Text>
      {isToday ? <View style={styles.todayDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 6,
  },
  day: { color: TEXT, fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },
  date: { color: TEXT_DIM, fontSize: 12 },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginLeft: 3,
  },
});
