import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { SkiaPictureView, SkiaRecordingView } from "@shopify/react-native-skia";
import type {
  SkDeferredTargetInfo,
  SkiaRecordingViewRef,
} from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { median } from "./api";
import type { Mode } from "./api";
import type { ContentStats, UIStats } from "./meters";

export const colors = {
  background: "#0b0f14",
  panel: "#1f2732",
  accent: "#3d7eff",
  text: "#c9d1d9",
  muted: "#6b7583",
  good: "#3ddc84",
  bad: "#ff5c5c",
};

export const Segment = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.segment}>
    {options.map((option) => (
      <Pressable
        key={option}
        onPress={() => onChange(option)}
        style={[
          styles.segmentItem,
          option === value && styles.segmentItemActive,
        ]}
      >
        <Text
          style={[
            styles.segmentText,
            option === value && styles.segmentTextActive,
          ]}
        >
          {option}
        </Text>
      </Pressable>
    ))}
  </View>
);

export const Button = ({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    style={[styles.button, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </Pressable>
);

/** UI-thread numbers, green when the main thread keeps up. */
export const UIMeter = ({
  ui,
  content,
  batchMs,
}: {
  ui: UIStats;
  content?: ContentStats;
  batchMs?: number;
}) => {
  const smooth = ui.long === 0 && ui.fps >= 55;
  return (
    <View style={styles.meter}>
      <Text style={[styles.stat, smooth ? styles.good : styles.bad]}>
        {`UI thread: ${ui.fps} fps, worst frame ${ui.worst} ms, ${ui.long} long frames/s`}
      </Text>
      {content && (
        <Text style={styles.stat}>
          {`Views: ${content.fps} presented frames/s per view (${content.active} active)`}
        </Text>
      )}
      {batchMs !== undefined && (
        <Text
          style={styles.stat}
        >{`Producer thread: ${batchMs} ms per batch`}</Text>
      )}
    </View>
  );
};

/** A spinner and a sliding knob animated on the UI thread: they stutter when the main thread is busy. */
export const JankIndicator = ({ width }: { width: number }) => {
  const rotation = useSharedValue(0);
  const slide = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1
    );
    slide.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [rotation, slide]);
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * (width - 64) }],
  }));
  return (
    <View style={styles.indicators}>
      <Animated.View style={[styles.spinner, spinnerStyle]} />
      <View style={styles.track}>
        <Animated.View style={[styles.knob, sliderStyle]} />
      </View>
    </View>
  );
};

/** A cell of a grid or list, registering itself into a producer slot. */
export const ProducerCell = ({
  index,
  mode,
  onId,
  onSize,
  onTarget,
  style,
  opaque,
}: {
  index: number;
  mode: Mode;
  opaque?: boolean;
  onId: (index: number, id: number) => void;
  onSize: (index: number, width: number, height: number) => void;
  onTarget: (index: number, target: SkDeferredTargetInfo | null) => void;
  style: object;
}) => {
  const recordingRef = useRef<SkiaRecordingViewRef>(null);
  const pictureRef = useRef<SkiaPictureView>(null);
  useEffect(() => {
    const id =
      mode === "recording"
        ? recordingRef.current?.nativeId
        : pictureRef.current?.nativeId;
    if (id !== undefined) {
      onId(index, id);
    }
    return () => {
      onId(index, -1);
      onTarget(index, null);
    };
  }, [index, mode, onId, onTarget]);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) =>
      onSize(index, e.nativeEvent.layout.width, e.nativeEvent.layout.height),
    [index, onSize]
  );
  return (
    <View style={style} onLayout={onLayout}>
      {mode === "recording" ? (
        <SkiaRecordingView
          ref={recordingRef}
          style={styles.cell}
          opaque={opaque}
          onTarget={(target) => onTarget(index, target)}
        />
      ) : (
        <SkiaPictureView ref={pictureRef} style={styles.cell} opaque={opaque} />
      )}
    </View>
  );
};

/** `n` cells in two columns. Remounts when the mode changes. */
export const ViewGrid = ({
  n,
  mode,
  cellWidth,
  cellHeight,
  onId,
  onSize,
  onTarget,
  cellStyle,
  opaque,
}: {
  n: number;
  opaque?: boolean;
  mode: Mode;
  cellWidth: number;
  cellHeight: number;
  onId: (index: number, id: number) => void;
  onSize: (index: number, width: number, height: number) => void;
  onTarget: (index: number, target: SkDeferredTargetInfo | null) => void;
  cellStyle?: object;
}) => (
  <View style={styles.grid}>
    {Array.from({ length: n }, (_, index) => (
      <ProducerCell
        key={`${mode}-${opaque ? "o" : "t"}-${index}`}
        index={index}
        mode={mode}
        onId={onId}
        onSize={onSize}
        onTarget={onTarget}
        opaque={opaque}
        style={[{ width: cellWidth, height: cellHeight, margin: 4 }, cellStyle]}
      />
    ))}
  </View>
);

export type Sample = Record<string, number>;

/**
 * Collects one sample per second for `seconds`, then reports the median of
 * each key. Results are also logged as one JSON line prefixed with
 * "[benchmark]" so they can be copied from the Metro output.
 */
export const useRun = (name: string, sampler: () => Sample, seconds = 10) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Sample | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The sampler reads React state; always call the latest one.
  const samplerRef = useRef(sampler);
  samplerRef.current = sampler;
  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setRunning(false);
  }, []);
  const start = useCallback(
    (label?: string) =>
      new Promise<Sample>((resolve) => {
        samplesRef.current = [];
        setResult(null);
        setProgress(0);
        setRunning(true);
        let elapsed = 0;
        timer.current = setInterval(() => {
          elapsed += 1;
          // The first second is warm-up.
          if (elapsed > 1) {
            samplesRef.current.push(samplerRef.current());
          }
          setProgress(elapsed);
          if (elapsed >= seconds + 1) {
            stop();
            const keys = new Set<string>();
            samplesRef.current.forEach((s) =>
              Object.keys(s).forEach((k) => keys.add(k))
            );
            const medians: Sample = {};
            keys.forEach((k) => {
              medians[k] = median(samplesRef.current.map((s) => s[k] ?? 0));
            });
            setResult(medians);
            console.log(
              `[benchmark] ${JSON.stringify({ name, label, seconds, ...medians })}`
            );
            resolve(medians);
          }
        }, 1000);
      }),
    [name, seconds, stop]
  );
  useEffect(() => stop, [stop]);
  return { running, progress, result, start, stop };
};

export const ResultRow = ({
  label,
  values,
}: {
  label: string;
  values: (string | number)[];
}) => (
  <View style={styles.resultRow}>
    <Text style={[styles.resultCell, styles.resultLabel]}>{label}</Text>
    {values.map((v, i) => (
      <Text key={i} style={styles.resultCell}>
        {v}
      </Text>
    ))}
  </View>
);

export const Note = ({ children }: { children: string }) => (
  <Text style={styles.note}>{children}</Text>
);

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: colors.panel,
    overflow: "hidden",
  },
  segmentItem: { paddingVertical: 8, paddingHorizontal: 14 },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: "#9aa4b2", fontWeight: "600" },
  segmentTextActive: { color: "white" },
  button: {
    backgroundColor: colors.panel,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "600" },
  meter: { marginBottom: 8 },
  stat: { color: colors.text, fontVariant: ["tabular-nums"], fontSize: 13 },
  good: { color: colors.good },
  bad: { color: colors.bad },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    height: 32,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#feca57",
    marginRight: 12,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.panel,
    justifyContent: "center",
  },
  knob: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#48dbfb",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flex: 1, borderRadius: 8, overflow: "hidden" },
  note: { color: colors.muted, fontSize: 12, padding: 8 },
  resultRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.panel,
    paddingVertical: 4,
  },
  resultCell: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  resultLabel: { textAlign: "left", flex: 1.4, color: colors.muted },
});
