import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SkPicture } from "@shopify/react-native-skia";

import type { Mode } from "./shared/api";
import { useBenchParams } from "./shared/params";
import { useContentMeter, useUIThreadMeter } from "./shared/meters";
import {
  CARD_RADIUS,
  GUTTER,
  Glide,
  Metric,
  SegmentedControl,
  formatCount,
  styles,
  theme,
} from "./shared/light";
import { useNativeProducer } from "./shared/nativeProducer";
import { buildField, buildFieldSvg, buildSvgs } from "./shared/scenes";
import { SVG_KINDS, SVG_LABELS, useSvgs } from "./shared/svgs";
import type { SvgKind } from "./shared/svgs";
import { ViewGrid, useRun } from "./shared/ui";

// Six views, native producer threads, two ways to get pixels on screen.
//
// Every view shows the same particle field: a picture with thousands of
// circles, recorded once, drawn rotating by native threads paced by vsync
// (Skia.Context.startProducer: no JS, worklet runtime or shared value in the
// loop). Producing a frame is one drawPicture call; what costs is Skia
// turning those circles into GPU work, and the mode decides which thread
// pays for it:
// - Picture: the producer records a tiny SkPicture that references the field.
//   Each SkiaPictureView then replays it into its swapchain and snaps a
//   Recording on the main thread, every frame.
// - Recording: the producer draws into a deferred canvas and snaps. The main
//   thread only binds the swapchain texture, submits and presents.
//
// Styled for slides: light, no header, no chrome beyond the essentials.

const VIEW_COUNTS = [4, 6, 2];
// Producer threads: one per view, up to the Pixel 8's fast cores. Version 3
// is what makes them pay off: the heavy work runs on them, while in version 2
// it stays on the main thread.
const MAX_THREADS = 4;
type SceneKind = "circles" | "tigers";
const DRAWS = ["picture", "direct", "svg"] as const;
const COUNTS: Record<SceneKind, number[]> = {
  circles: [1000, 2000, 3000, 4000, 5000, 10000, 20000],
  tigers: [1, 2, 4, 8],
};
const MODES = [
  { value: "picture", label: "Version 2" },
  { value: "recording", label: "Version 3" },
] as const;
// ViewGrid puts a 4 pt margin around each cell: 8 pt between two cards.
const MARGIN = 4;

// The native producer reads sizes and targets from the views itself.
const noop = () => {};

export const BenchMultipleViews = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useBenchParams();
  const [mode, setMode] = useState<Mode>(params.mode ?? "recording");
  const [scene, setScene] = useState<SceneKind>("circles");
  const [countIndex, setCountIndex] = useState(5);
  const [viewsIndex, setViewsIndex] = useState(0);
  const [svgKind, setSvgKind] = useState<SvgKind>("tiger");
  const [present, setPresent] = useState<"main" | "producer">("producer");
  const [draw, setDraw] = useState<(typeof DRAWS)[number]>("picture");
  const count = COUNTS[scene][countIndex];
  const N = VIEW_COUNTS[viewsIndex];
  const threads = Math.min(N, MAX_THREADS);
  const svgs = useSvgs();
  const svg = svgs[svgKind];
  const { stats: ui } = useUIThreadMeter();
  const [fields, setFields] = useState<SkPicture[] | null>(null);
  const contentWidth = width - 2 * GUTTER;
  const cellWidth = Math.floor((contentWidth + 2 * MARGIN) / 2) - 2 * MARGIN;
  const cellHeight = Math.round(cellWidth * 0.8);
  const radius = Math.hypot(cellWidth, cellHeight) / 2;
  const fieldSvg = useMemo(
    () =>
      scene === "circles" && draw === "svg"
        ? buildFieldSvg(count, radius, true)
        : undefined,
    [count, draw, radius, scene]
  );
  const producer = useNativeProducer(N, {
    mode,
    threads,
    fields,
    background: theme.card,
    present,
    page: theme.background,
    cornerRadius: CARD_RADIUS,
    kaleidoscope: scene === "circles",
    draw: scene === "circles" ? draw : "picture",
    circles: count,
    radius,
    svg: fieldSvg,
  });
  const content = useContentMeter(producer.ids);
  const batchMs = Math.round(producer.stats.batchMs);

  useEffect(() => {
    // The previous field is left to the garbage collector: the producer
    // holds its own reference while it draws it.
    if (scene === "circles") {
      // A different kaleidoscope per view.
      setFields(
        Array.from({ length: N }, (_, i) => buildField(count, radius, true, i))
      );
    } else if (svg) {
      setFields([buildSvgs(count, radius, svg)]);
    }
  }, [N, count, radius, scene, svg]);

  const run = useRun("multiple-views", () => ({
    uiFps: ui.fps,
    worstFrameMs: ui.worst,
    longFrames: ui.long,
    contentFps: content.fps,
    batchMs,
  }));
  const startRun = run.start;
  useEffect(() => {
    if (params.autoRun) {
      const timeout = setTimeout(
        () => startRun(`${mode}-${scene}-${count}-${N}views`),
        1500
      );
      return () => clearTimeout(timeout);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.autoRun, startRun]);

  // Red when the main thread dropped frames in the last second: any frame
  // over LONG_FRAME_MS, or fewer than 55 frames.
  const smooth = ui.long === 0 && ui.fps >= 55;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: GUTTER,
      }}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.controls}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
        <View style={styles.links}>
          <Pressable
            onPress={() => {
              setScene((s) => (s === "circles" ? "tigers" : "circles"));
              setCountIndex(2);
            }}
            hitSlop={12}
          >
            <Text style={styles.link}>
              {scene === "circles" ? "Circles" : "Tigers"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCountIndex((i) => (i + 1) % COUNTS[scene].length)}
            hitSlop={12}
          >
            <Text style={styles.link}>
              {scene === "circles"
                ? `${formatCount(count)} circles`
                : `${count} cop${count > 1 ? "ies" : "y"}`}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.controls, styles.secondRow]}>
        {mode === "recording" && (
          <Pressable
            onPress={() =>
              setPresent((p) => (p === "main" ? "producer" : "main"))
            }
            hitSlop={12}
          >
            <Text style={styles.link}>{`present on ${present}`}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setViewsIndex((i) => (i + 1) % VIEW_COUNTS.length)}
          hitSlop={12}
        >
          <Text style={styles.link}>{`${N} views`}</Text>
        </Pressable>
        {scene === "circles" && (
          <Pressable
            onPress={() =>
              setDraw((d) => DRAWS[(DRAWS.indexOf(d) + 1) % DRAWS.length])
            }
            hitSlop={12}
          >
            <Text style={styles.link}>{`draw: ${draw}`}</Text>
          </Pressable>
        )}
        {scene === "tigers" && (
          <Pressable
            onPress={() =>
              setSvgKind(
                (k) => SVG_KINDS[(SVG_KINDS.indexOf(k) + 1) % SVG_KINDS.length]
              )
            }
            hitSlop={12}
          >
            <Text style={styles.link}>{SVG_LABELS[svgKind]}</Text>
          </Pressable>
        )}
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
          label="Views"
          detail={`${content.active} active`}
        />
        <Metric
          value={batchMs}
          unit="ms"
          label="Producer"
          detail={`${threads} thread${threads > 1 ? "s" : ""}`}
        />
      </View>

      <Glide width={contentWidth} />

      <View style={local.grid}>
        <ViewGrid
          n={N}
          mode={mode}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          onId={producer.setId}
          onSize={noop}
          onTarget={noop}
          cellStyle={styles.card}
          // Always opaque (SurfaceView on Android): no compositing copy. The
          // producer draws the card's corners since the parent cannot clip.
          opaque
        />
      </View>
    </ScrollView>
  );
};

const local = StyleSheet.create({
  grid: { marginHorizontal: -MARGIN },
});
