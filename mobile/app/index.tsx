import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fetchEvents } from "@/lib/api";
import { useFilters } from "@/lib/store";
import { computeRange, formatRangeSubtitle, type Range } from "@/lib/range";
import { BG, BORDER, SURFACE, TEXT, TEXT_DIM } from "@/lib/colors";
import type { Event } from "@/lib/types";
import { EventRow } from "@/components/EventRow";
import { DayHeader } from "@/components/DayHeader";
import { RangeTabs } from "@/components/RangeTabs";
import { FilterTabs } from "@/components/FilterTabs";

type Section = { title: string; data: Event[] };

const groupByDay = (events: Event[]): Section[] => {
  const map = new Map<string, Event[]>();
  for (const e of events) {
    const arr = map.get(e.etDay) ?? [];
    arr.push(e);
    map.set(e.etDay, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, data]) => ({
      title: day,
      data: data.sort((x, y) => x.etTime.localeCompare(y.etTime)),
    }));
};

export default function Calendar() {
  const router = useRouter();
  const filters = useFilters();
  const [range, setRange] = useState<Range>(() => computeRange("thisWeek"));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: Range) => {
    setError(null);
    try {
      const data = await fetchEvents({ from: r.from, to: r.to });
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(range).then(() => setLoading(false));
  }, [range, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(range);
    setRefreshing(false);
  }, [load, range]);

  const visible = useMemo(() => {
    const sources = new Set(filters.activeSources());
    return events.filter((e) => {
      if (!sources.has(e.source)) return false;
      if (filters.mag7Only && !e.isMag7) return false;
      if (filters.highOnly && e.impact !== "high") return false;
      if (filters.holidaysOnly && e.impact !== "holiday") return false;
      return true;
    });
  }, [
    events,
    filters.forex,
    filters.oil,
    filters.earnings,
    filters.mag7Only,
    filters.highOnly,
    filters.holidaysOnly,
  ]);

  const sections = useMemo(() => groupByDay(visible), [visible]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Market News</Text>
        <Text style={styles.subtitle}>
          {formatRangeSubtitle(range)} · ET
        </Text>
      </View>
      <RangeTabs active={range.key} onPick={setRange} />
      <FilterTabs />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={TEXT} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventRow event={item} onPress={(e) => router.push(`/event/${e.id}`)} />
          )}
          renderSectionHeader={({ section }) => <DayHeader date={section.title} />}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TEXT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {error ? "Couldn't load data" : "No events"}
              </Text>
              <Text style={styles.emptyBody}>
                {error
                  ? error
                  : "Forex Factory only publishes economic events for the current week — past and future weeks fill in as FF releases the data.\n\nEarnings cover ~7 days back and 31 days ahead."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  titleBar: {
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: { color: TEXT, fontSize: 17, fontWeight: "700" },
  subtitle: { color: TEXT_DIM, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { paddingHorizontal: 28, marginTop: 50 },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyBody: {
    color: TEXT_DIM,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
  },
});
