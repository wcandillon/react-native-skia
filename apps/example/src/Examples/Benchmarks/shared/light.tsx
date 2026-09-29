import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// The light, minimal look of the slide demos (multiple views, animated
// list): white page, gray cards, one accent, large tabular numbers.

export const theme = {
  background: "#ffffff",
  card: "#f5f5f7",
  text: "#1d1d1f",
  secondary: "#86868b",
  separator: "#e8e8ed",
  accent: "#0071e3",
  bad: "#ff3b30",
};

export const GUTTER = 20;
export const CARD_RADIUS = 18;
const DOT = 12;

export const formatCount = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.segment}>
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.segmentItem, selected && styles.segmentItemSelected]}
        >
          <Text
            style={[styles.segmentText, selected && styles.segmentTextSelected]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** A blue text button. */
export const Link = ({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} hitSlop={12}>
    <Text style={styles.link}>{title}</Text>
  </Pressable>
);

export const Metric = ({
  value,
  unit,
  label,
  detail,
  alert,
}: {
  value: number;
  unit: string;
  label: string;
  detail?: string;
  alert?: boolean;
}) => (
  <View style={styles.metric}>
    <Text style={[styles.metricValue, alert && styles.alert]}>
      {value}
      <Text style={styles.metricUnit}>{` ${unit}`}</Text>
    </Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {detail !== undefined && <Text style={styles.metricDetail}>{detail}</Text>}
  </View>
);

/** A dot gliding on a hairline, animated on the UI thread: it stutters when the main thread is busy. */
export const Glide = ({ width }: { width: number }) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (width - DOT) }],
  }));
  return (
    <View style={[styles.glide, { width }]}>
      <View style={styles.glideTrack} />
      <Animated.View style={[styles.glideDot, style]} />
    </View>
  );
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segment: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 9,
    backgroundColor: "rgba(118, 118, 128, 0.12)",
  },
  segmentItem: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 7,
  },
  segmentItemSelected: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: "500", color: theme.text },
  segmentTextSelected: { fontWeight: "600" },
  links: { flexDirection: "row", gap: 16 },
  secondRow: { marginTop: 12, justifyContent: "flex-end", gap: 16 },
  link: { fontSize: 15, fontWeight: "500", color: theme.accent },
  metrics: {
    flexDirection: "row",
    marginTop: 36,
    marginBottom: 28,
  },
  metric: { flex: 1 },
  metricValue: {
    fontSize: 40,
    fontWeight: "600",
    letterSpacing: -1,
    color: theme.text,
    fontVariant: ["tabular-nums"],
  },
  metricUnit: {
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: 0,
    color: theme.secondary,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  metricDetail: {
    fontSize: 13,
    color: theme.secondary,
    fontVariant: ["tabular-nums"],
  },
  alert: { color: theme.bad },
  glide: { height: DOT, justifyContent: "center", marginBottom: 20 },
  glideTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: theme.separator,
  },
  glideDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.text,
  },
  card: { borderRadius: CARD_RADIUS, overflow: "hidden" },
});
