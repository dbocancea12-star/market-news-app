import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fetchEvent } from "@/lib/api";
import { BG, BORDER, IMPACT, SURFACE, TEXT, TEXT_DIM } from "@/lib/colors";
import type { Event } from "@/lib/types";

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setEvent(await fetchEvent(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [id]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: TEXT_DIM }}>Couldn't load: {error}</Text>
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={TEXT} />
      </View>
    );
  }

  const impactColor = IMPACT[event.impact] ?? IMPACT.low;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.impactStrip, { backgroundColor: impactColor }]} />
      <Text style={styles.title}>{event.title}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>{event.etDay} · {event.etTime} ET</Text>
        {event.country ? <Text style={styles.meta}> · {event.country}</Text> : null}
        {event.whenMarket ? <Text style={styles.meta}> · {event.whenMarket}</Text> : null}
        {event.isMag7 ? (
          <View style={styles.mag7Pill}>
            <Text style={styles.mag7Text}>MAG 7</Text>
          </View>
        ) : null}
      </View>

      {event.source === "earnings" ? (
        <View style={styles.card}>
          <Field label="Ticker" value={event.ticker} />
          <Field label="Company" value={event.company} />
          <Field
            label="EPS estimate"
            value={
              event.epsEstimate !== undefined ? event.epsEstimate.toFixed(2) : undefined
            }
          />
          <Field
            label="Market cap"
            value={
              event.marketCap !== undefined
                ? `$${(event.marketCap / 1e9).toFixed(2)}B`
                : undefined
            }
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Field label="Forecast" value={event.forecast} />
          <Field label="Previous" value={event.previous} />
          <Field label="Actual" value={event.actual} />
        </View>
      )}

      {event.url ? (
        <Pressable
          style={styles.linkBtn}
          onPress={() => void Linking.openURL(event.url!)}
        >
          <Text style={styles.linkText}>Open source ↗</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  impactStrip: { height: 4, borderRadius: 2, marginBottom: 14 },
  title: { color: TEXT, fontSize: 20, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 6, flexWrap: "wrap" },
  meta: { color: TEXT_DIM, fontSize: 13 },
  mag7Pill: {
    backgroundColor: "#E53935",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  mag7Text: { color: "white", fontSize: 10, fontWeight: "800" },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    marginTop: 18,
    padding: 14,
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  label: { color: TEXT_DIM, fontSize: 13 },
  value: { color: TEXT, fontSize: 13, fontWeight: "600" },
  linkBtn: {
    marginTop: 18,
    backgroundColor: SURFACE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  linkText: { color: "#3B82F6", fontWeight: "600" },
});
