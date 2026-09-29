import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, Text, View, useWindowDimensions } from "react-native";
import type { LayoutChangeEvent, ViewToken } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Mode } from "./shared/api";
import { useBenchParams } from "./shared/params";
import { useContentMeter, useUIThreadMeter } from "./shared/meters";
import { useNativeProducer } from "./shared/nativeProducer";
import {
  GUTTER,
  Glide,
  Link,
  Metric,
  SegmentedControl,
  styles,
  theme,
} from "./shared/light";
import { ProducerCell, useRun } from "./shared/ui";

// A list of live chart tiles, the everyday case: many small animated views
// on screen while the user scrolls. Scrolling, layout and mounting are
// main-thread work; picture views (version 2) add a replay and a snap per
// tile per frame on top of it, recording views (version 3) only present, or
// nothing at all when the producer presents. Native producer threads draw
// every visible tile each vsync in both versions.
//
// Styled for slides: light, no header, no chrome beyond the essentials.

const ITEMS = 48;
const ITEM_HEIGHT = 66;
const TILE_RADIUS = 12;
const BAR_COUNTS = [60, 240, 960];
const THREADS = 3;
const MODES = [
  { value: "picture", label: "Version 2" },
  { value: "recording", label: "Version 3" },
] as const;
const data = Array.from({ length: ITEMS }, (_, i) => i);
// The native producer reads sizes and targets from the views itself.
const noop = () => {};

export const BenchAnimatedList = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useBenchParams();
  const [mode, setMode] = useState<Mode>(params.mode ?? "recording");
  const [barsIndex, setBarsIndex] = useState(1);
  const [autoScroll, setAutoScroll] = useState(params.autoScroll ?? true);
  const [present, setPresent] = useState<"main" | "producer">("producer");
  const { stats: ui } = useUIThreadMeter();
  const producer = useNativeProducer(ITEMS, {
    mode,
    threads: THREADS,
    scene: "chart",
    bars: BAR_COUNTS[barsIndex],
    background: theme.card,
    page: theme.background,
    cornerRadius: TILE_RADIUS,
    line: theme.text,
    present,
  });
  const content = useContentMeter(producer.ids);
  const batchMs = Math.round(producer.stats.batchMs);
  const listRef = useAnimatedRef<Animated.FlatList<number>>();
  // Only tiles on screen are drawn: FlatList keeps a window of mounted
  // items around the viewport, and drawing those would be wasted work.
  const [visibleCount, setVisibleCount] = useState(0);
  const { setEnabled } = producer;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
      const visible = new Set(viewableItems.map((v) => v.item));
      setVisibleCount(visible.size);
      setEnabled(data.map((index) => visible.has(index)));
    },
    [setEnabled]
  );
  const viewport = useSharedValue(0);
  const scrolling = useSharedValue(autoScroll);

  useEffect(() => {
    scrolling.value = autoScroll;
  }, [autoScroll, scrolling]);

  // Scroll up and down continuously from the UI thread (as a finger would).
  useFrameCallback((frame) => {
    "worklet";
    if (!scrolling.value || viewport.value === 0) {
      return;
    }
    const range = ITEMS * ITEM_HEIGHT - viewport.value;
    // A full pass down and up in 16 s, about the pace of a finger.
    const period = 16000;
    const phase = (frame.timestamp % period) / period;
    const y = range * (phase < 0.5 ? phase * 2 : 2 - phase * 2);
    scrollTo(listRef, 0, y, false);
  });

  const run = useRun("animated-list", () => ({
    uiFps: ui.fps,
    worstFrameMs: ui.worst,
    longFrames: ui.long,
    contentFps: content.fps,
    activeViews: content.active,
    batchMs,
  }));
  const startRun = run.start;
  useEffect(() => {
    if (params.autoRun) {
      const timeout = setTimeout(
        () => startRun(`${mode}-${BAR_COUNTS[barsIndex]}`),
        1500
      );
      return () => clearTimeout(timeout);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.autoRun, startRun]);

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <View style={{ height: ITEM_HEIGHT, paddingVertical: 4 }}>
        <ProducerCell
          key={`${mode}-${item}`}
          index={item}
          mode={mode}
          onId={producer.setId}
          onSize={noop}
          onTarget={noop}
          // Always opaque (SurfaceView on Android): no compositing copy. The
          // producer draws the tile's corners since the parent cannot clip.
          opaque
          style={{ flex: 1, borderRadius: TILE_RADIUS, overflow: "hidden" }}
        />
      </View>
    ),
    [mode, producer.setId]
  );

  const contentWidth = width - 2 * GUTTER;

  // Red when the main thread dropped frames in the last second: any frame
  // over LONG_FRAME_MS, or fewer than 55 frames.
  const smooth = ui.long === 0 && ui.fps >= 55;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={styles.controls}>
          <SegmentedControl options={MODES} value={mode} onChange={setMode} />
          <Link
            title={`${BAR_COUNTS[barsIndex]} bars`}
            onPress={() => setBarsIndex((i) => (i + 1) % BAR_COUNTS.length)}
          />
        </View>
        <View style={[styles.controls, styles.secondRow]}>
          {mode === "recording" && (
            <Link
              title={`present on ${present}`}
              onPress={() =>
                setPresent((p) => (p === "main" ? "producer" : "main"))
              }
            />
          )}
          <Link
            title={autoScroll ? "scrolling" : "still"}
            onPress={() => setAutoScroll((v) => !v)}
          />
        </View>

        <View style={styles.metrics}>
          <Metric
            value={ui.fps}
            unit="fps"
            label="Main thread"
            detail={`worst ${ui.worst} ms`}
            alert={!smooth}
          />
          <Metric
            value={content.fps}
            unit="fps"
            label="Tiles"
            detail={`${visibleCount} on screen`}
          />
          <Metric
            value={batchMs}
            unit="ms"
            label="Producer"
            detail={`${THREADS} threads`}
          />
        </View>

        <Glide width={contentWidth} />
      </View>

      <Animated.FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => `${mode}-${item}`}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onLayout={(e: LayoutChangeEvent) => {
          viewport.value = e.nativeEvent.layout.height;
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 1 }}
      />
      {run.running && (
        <Text style={[styles.metricDetail, { paddingHorizontal: GUTTER }]}>
          {`measuring, ${run.progress} s`}
        </Text>
      )}
    </View>
  );
};
