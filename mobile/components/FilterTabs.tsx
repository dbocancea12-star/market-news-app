import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BORDER, SURFACE, TEXT, TEXT_DIM } from "@/lib/colors";
import { useFilters } from "@/lib/store";

const SOURCE_CHIPS = [
  { key: "forex", label: "Forex" },
  { key: "oil", label: "Oil" },
  { key: "earnings", label: "Earnings" },
] as const;

const NARROW_CHIPS = [
  { key: "highOnly", label: "High" },
  { key: "mag7Only", label: "Mag 7" },
  { key: "holidaysOnly", label: "Holidays" },
] as const;

export function FilterTabs() {
  const state = useFilters();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      {SOURCE_CHIPS.map((c) => {
        const on = state[c.key];
        return (
          <Pressable
            key={c.key}
            onPress={() => state.toggle(c.key)}
            style={[styles.chip, on && styles.chipSourceOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.divider} />
      {NARROW_CHIPS.map((c) => {
        const on = state[c.key];
        return (
          <Pressable
            key={c.key}
            onPress={() => state.toggle(c.key)}
            style={[styles.chip, on && styles.chipNarrowOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    height: 46,
  },
  content: {
    paddingHorizontal: 10,
    gap: 6,
    alignItems: "center",
    height: 46,
  },
  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipSourceOn: { backgroundColor: "#1F3A8A33", borderColor: "#3B82F6" },
  chipNarrowOn: { backgroundColor: "#E5393533", borderColor: "#E53935" },
  divider: { width: 1, height: 18, backgroundColor: BORDER, marginHorizontal: 4 },
  label: { color: TEXT_DIM, fontSize: 12, fontWeight: "600" },
  labelOn: { color: TEXT },
});
