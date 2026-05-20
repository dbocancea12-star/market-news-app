import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  IMPACT,
  SURFACE,
  SURFACE_HIGHLIGHT,
  TEXT,
  TEXT_DIM,
  TEXT_DIMMER,
  BORDER,
} from "@/lib/colors";
import { flagFor } from "@/lib/flags";
import type { Event } from "@/lib/types";

type Props = {
  event: Event;
  onPress: (e: Event) => void;
};

export function EventRow({ event, onPress }: Props) {
  const barColor = IMPACT[event.impact] ?? IMPACT.low;
  const isEarnings = event.source === "earnings";
  const isMag7 = !!event.isMag7;
  const flag = isEarnings ? null : flagFor(event.country);
  const code = isEarnings ? event.ticker ?? "" : event.country ?? "";
  const whenSuffix =
    isEarnings && event.whenMarket ? ` · ${event.whenMarket}` : "";
  const showActuals =
    !isEarnings && (event.actual || event.forecast || event.previous);
  const rowStyle = [
    styles.row,
    isMag7 && styles.rowMag7,
  ];

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={({ pressed }) => [...rowStyle, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <Text style={styles.time}>{event.etTime}</Text>
      <View style={styles.cc}>
        {flag ? <Text style={styles.flag}>{flag}</Text> : null}
        <Text style={styles.code} numberOfLines={1}>
          {code}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.impact === "holiday" ? "🏦 " : ""}
            {event.title}
            {whenSuffix ? <Text style={styles.dim}>{whenSuffix}</Text> : null}
          </Text>
          {isMag7 ? (
            <View style={styles.mag7Pill}>
              <Text style={styles.mag7Text}>MAG 7</Text>
            </View>
          ) : null}
        </View>
        {showActuals ? (
          <View style={styles.metricsRow}>
            <Metric label="A" value={event.actual} highlight />
            <Metric label="F" value={event.forecast} />
            <Metric label="P" value={event.previous} />
          </View>
        ) : null}
        {isEarnings && event.epsEstimate !== undefined ? (
          <Text style={styles.epsLine}>
            <Text style={styles.metricLabel}>EPS est </Text>
            <Text style={styles.metricStrong}>{event.epsEstimate.toFixed(2)}</Text>
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <Text style={styles.metric}>
      <Text style={styles.metricLabel}>{label} </Text>
      <Text style={highlight ? styles.metricStrong : styles.metricValue}>{value}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 10,
    paddingRight: 14,
  },
  rowMag7: { backgroundColor: SURFACE_HIGHLIGHT },
  bar: { width: 4, alignSelf: "stretch", marginRight: 12 },
  time: {
    color: TEXT,
    fontVariant: ["tabular-nums"],
    width: 46,
    fontSize: 13,
    fontWeight: "500",
    paddingTop: 2,
  },
  cc: {
    width: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 1,
  },
  flag: { fontSize: 14 },
  code: {
    color: TEXT_DIM,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { color: TEXT, fontSize: 14, flex: 1, lineHeight: 19 },
  dim: { color: TEXT_DIMMER },
  mag7Pill: {
    backgroundColor: "#E53935",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  mag7Text: { color: "white", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  metricsRow: { flexDirection: "row", marginTop: 4, gap: 16 },
  metric: { fontSize: 12 },
  metricLabel: { color: TEXT_DIMMER, fontWeight: "700" },
  metricValue: { color: TEXT_DIM },
  metricStrong: { color: TEXT, fontWeight: "700" },
  epsLine: { fontSize: 12, marginTop: 4 },
});
