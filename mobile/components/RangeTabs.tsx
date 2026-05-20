import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { BORDER, SURFACE, TEXT, TEXT_DIM } from "@/lib/colors";
import {
  RANGE_PRESETS,
  computeRange,
  type Range,
  type RangeKey,
} from "@/lib/range";

type Props = {
  active: RangeKey;
  onPick: (range: Range) => void;
};

export function RangeTabs({ active, onPick }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      {RANGE_PRESETS.map((key) => {
        const r = computeRange(key);
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onPick(r)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {r.label}
            </Text>
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
    height: 52,
  },
  content: {
    paddingHorizontal: 10,
    gap: 4,
    alignItems: "center",
    height: 52,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabActive: { backgroundColor: "#3B82F6" },
  label: { color: TEXT_DIM, fontSize: 13, fontWeight: "600" },
  labelActive: { color: "white" },
});
