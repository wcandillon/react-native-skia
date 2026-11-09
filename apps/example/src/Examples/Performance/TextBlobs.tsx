import React, { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type {
  SkFont,
  SkGraphiteContext,
  SkiaGraphiteViewRef,
  SkPaint,
  SkTextBlob,
} from "react-native-skia";
import { matchFont, Skia, SkiaGraphiteView } from "react-native-skia";
import {
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Text pacing benchmark: thousands of text blobs, each rotating on every
// frame, recorded on the Reanimated UI runtime into a SkiaGraphiteView.
//
// With default surface props Graphite rasterizes a glyph for the exact
// transform it is drawn with, so a rotating blob is masked again, and rebuilt
// (findOrCreateBlob), on every frame. With device independent fonts (see
// RNSkGraphiteTarget::recordingSurfaceProps) a glyph is rasterized once as a
// distance field and reused under any rotation. SDF text only applies to
// glyphs between 18 and 324 device pixels: at a pixel density of 3 the font
// size below (16 pt = 48 px) is within the range.
//
// "rotate" is the scene the problem was reported against; "translate" moves
// the blobs by whole pixels instead, which keeps the glyph masks reusable
// with the defaults too, and is the baseline the change should bring
// "rotate" close to.

const FONT_SIZE = 16;
const STEP = 1000;
const WORDS = ["Skia", "Graphite", "Dawn", "React", "Native", "Text", "Blob"];
const COLORS = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#1dd1a1",
  "#ff9ff3",
  "#54a0ff",
  "#00d2d3",
];

type Mode = "rotate" | "translate";

interface Scene {
  blobs: SkTextBlob[];
  paints: SkPaint[];
  // Angular speed (degrees per second) and phase of each blob.
  speeds: number[];
  phases: number[];
  font: SkFont;
  hud: SkPaint;
}

const makeScene = (count: number): Scene => {
  const font = matchFont({ fontFamily: "sans-serif", fontSize: FONT_SIZE });
  const blobs: SkTextBlob[] = [];
  const speeds: number[] = [];
  const phases: number[] = [];
  for (let i = 0; i < count; i++) {
    const word = WORDS[i % WORDS.length];
    blobs.push(Skia.TextBlob.MakeFromText(`${word} ${i}`, font));
    speeds.push(30 + (i % 7) * 15);
    phases.push((i * 37) % 360);
  }
  const paints = COLORS.map((color) => {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(color));
    return paint;
  });
  const hud = Skia.Paint();
  hud.setColor(Skia.Color("white"));
  return { blobs, paints, speeds, phases, font, hud };
};

interface Stats {
  // Frames recorded in the current sampling window and when it started.
  frames: number;
  since: number;
  // Recording time (beginRecording to submit) over the window, in ms.
  recording: number;
}

const drawFrame = (
  ctx: SkGraphiteContext,
  scene: Scene,
  mode: Mode,
  t: number,
  fps: number,
  recordingMs: number
) => {
  "worklet";
  const { width, height } = ctx;
  const canvas = ctx.beginRecording();
  canvas.clear(Skia.Color("#0b1020"));
  const { blobs, paints, speeds, phases } = scene;
  const count = blobs.length;
  // A grid dense enough to fit every blob on screen, overlapping if needed.
  const columns = Math.max(1, Math.ceil(Math.sqrt((count * width) / height)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = width / columns;
  const cellHeight = (height - 48) / rows;
  for (let i = 0; i < count; i++) {
    const cx = (i % columns) * cellWidth + cellWidth / 2;
    const cy = 48 + Math.floor(i / columns) * cellHeight + cellHeight / 2;
    const paint = paints[i % paints.length];
    canvas.save();
    if (mode === "rotate") {
      canvas.translate(cx, cy);
      canvas.rotate(phases[i] + t * speeds[i], 0, 0);
    } else {
      // Whole pixels, so that the glyph masks are reusable as they are.
      const offset = Math.round(8 * Math.sin((phases[i] + t * speeds[i]) / 57));
      canvas.translate(Math.round(cx) + offset, Math.round(cy));
    }
    canvas.drawTextBlob(blobs[i], 0, 0, paint);
    canvas.restore();
  }
  canvas.drawText(
    `${count} blobs, ${mode}: ${fps.toFixed(0)} fps, ${recordingMs.toFixed(
      1
    )} ms recording`,
    12,
    28,
    scene.hud,
    scene.font
  );
  ctx.submit(ctx.finishRecording());
};

interface BenchmarkViewProps {
  count: number;
  mode: Mode;
  onStats: (fps: number, recordingMs: number) => void;
}

const BenchmarkView = ({ count, mode, onStats }: BenchmarkViewProps) => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  const ctx = useSharedValue<SkGraphiteContext | null>(null);
  // The scene is built on the JS thread; Skia objects are shared with the
  // UI runtime through the shared value.
  const scene = useSharedValue<Scene | null>(null);
  const sceneMode = useSharedValue<Mode>(mode);
  const fps = useSharedValue(0);
  const recordingMs = useSharedValue(0);
  const stats = useSharedValue<Stats>({ frames: 0, since: 0, recording: 0 });
  useEffect(() => {
    ctx.value = ref.current?.getContext() ?? null;
  }, [ctx]);
  useEffect(() => {
    scene.value = makeScene(count);
  }, [count, scene]);
  useEffect(() => {
    sceneMode.value = mode;
  }, [mode, sceneMode]);
  useFrameCallback((frame) => {
    "worklet";
    if (!ctx.value || !scene.value) {
      return;
    }
    const start = performance.now();
    drawFrame(
      ctx.value,
      scene.value,
      sceneMode.value,
      frame.timestamp / 1000,
      fps.value,
      recordingMs.value
    );
    const s = stats.value;
    s.frames += 1;
    s.recording += performance.now() - start;
    if (s.since === 0) {
      s.since = frame.timestamp;
    } else if (frame.timestamp - s.since >= 1000) {
      fps.value = (s.frames * 1000) / (frame.timestamp - s.since);
      recordingMs.value = s.recording / s.frames;
      s.frames = 0;
      s.recording = 0;
      s.since = frame.timestamp;
    }
  });
  useAnimatedReaction(
    () => [fps.value, recordingMs.value] as const,
    ([f, r]) => {
      scheduleOnRN(onStats, f, r);
    }
  );
  return (
    <SkiaGraphiteView
      ref={ref}
      style={styles.view}
      android={{ backingView: "SurfaceView" }}
    />
  );
};

export const TextBlobsBenchmark = () => {
  const [count, setCount] = useState(6000);
  const [mode, setMode] = useState<Mode>("rotate");
  const [stats, setStats] = useState({ fps: 0, recordingMs: 0 });
  // Logged too, so that a run can be read off adb logcat or the Xcode console.
  useEffect(() => {
    if (stats.fps > 0) {
      console.log(
        `TextBlobs ${count} ${mode}: ${stats.fps.toFixed(1)} fps, ` +
          `${stats.recordingMs.toFixed(2)} ms recording`
      );
    }
  }, [count, mode, stats]);
  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Button
          title="-1k"
          onPress={() => setCount((n) => Math.max(STEP, n - STEP))}
        />
        <Text style={styles.label}>{count} blobs</Text>
        <Button title="+1k" onPress={() => setCount((n) => n + STEP)} />
        <Button
          title={mode === "rotate" ? "rotating" : "translating"}
          onPress={() =>
            setMode((m) => (m === "rotate" ? "translate" : "rotate"))
          }
        />
      </View>
      <Text style={styles.label}>
        {stats.fps.toFixed(0)} fps, {stats.recordingMs.toFixed(1)} ms recording
        per frame (UI runtime)
      </Text>
      <BenchmarkView
        count={count}
        mode={mode}
        onStats={(fps, recordingMs) => setStats({ fps, recordingMs })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  panel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  label: {
    color: "#86868b",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: "center",
  },
  view: { flex: 1 },
});
