import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Skia,
  SkiaGraphiteView,
  TileMode,
  __experimental,
} from "react-native-skia";
import type { SkGraphiteContext, SkiaGraphiteViewRef } from "react-native-skia";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

import {
  ANIMATION_SECONDS,
  SETTLE_MS,
  getStats,
  measureFps,
  sleep,
  summarize,
} from "./Runner";
import { makeScene, useAnimatedValues } from "./Scene";
import type { BenchProps } from "./Retained";

/**
 * The prototype's scalar only canvas calls, in immediate mode from a worklet
 * on every frame: a SkiaGraphiteView records the frame on the UI runtime;
 * every draw call carries numbers and a paint handle. The paints and
 * shaders are set up once on the JS thread.
 *
 * Measured: the time of the worklet per frame (the draw loop alone, and the
 * whole frame with beginRecording and submit) and the frame rate.
 */
export const ScalarBench = ({ n, onDone, onStatus }: BenchProps) => {
  const { width, height } = useWindowDimensions();
  const nodes = useMemo(
    () => makeScene(n, width, height - 160),
    [n, width, height]
  );
  const values = useAnimatedValues(nodes, true);
  const ref = useRef<SkiaGraphiteViewRef>(null);
  const ctx = useSharedValue<SkGraphiteContext | null>(null);
  const stats = getStats();
  const api = __experimental.getExperimentalApi();

  // One paint per node, with its gradient, set up once.
  const scene = useMemo(() => {
    const paints = nodes.map((node) => {
      const { size } = node;
      const paint = api.createPaint();
      const [r, g, b, a] = Skia.Color(node.color);
      api.setColor(
        paint,
        Math.round(a * 255) * 0x1000000 +
          Math.round(r * 255) * 0x10000 +
          Math.round(g * 255) * 0x100 +
          Math.round(b * 255)
      );
      api.setStrokeWidth(paint, node.strokeWidth);
      api.setStyle(paint, node.style === "stroke" ? 1 : 0);
      api.setShader(
        paint,
        api.registerShader(
          Skia.Shader.MakeLinearGradient(
            { x: -size, y: -size },
            { x: size, y: size },
            [
              Skia.Color(node.gradient.colors[0]),
              Skia.Color(node.gradient.colors[1]),
            ],
            null,
            TileMode.Clamp
          )
        )
      );
      api.setAlpha(paint, node.opacity);
      return paint;
    });
    return {
      count: nodes.length,
      paints,
      kinds: nodes.map((node) => (node.kind === "circle" ? 0 : 1)),
      xs: nodes.map((node) => node.x),
      ys: nodes.map((node) => node.y),
      sizes: nodes.map((node) => node.size),
      animated: nodes.map((node) => node.animated),
    };
  }, [nodes, api]);
  const { xs, ys, opacities } = values;

  useEffect(() => {
    ctx.value = ref.current?.getContext() ?? null;
  }, [ctx]);

  useFrameCallback(() => {
    "worklet";
    const c = ctx.value;
    if (!c) {
      return;
    }
    const start = performance.now();
    const canvas = c.beginRecording();
    api.bindCanvas(canvas);
    api.clear(0xff0b1020);
    const drawStart = performance.now();
    for (let i = 0; i < scene.count; i++) {
      const paint = scene.paints[i];
      const animated = scene.animated[i];
      api.save();
      api.concat(
        1,
        0,
        0,
        1,
        animated ? xs[i]!.value : scene.xs[i],
        animated ? ys[i]!.value : scene.ys[i]
      );
      if (animated) {
        api.setAlpha(paint, opacities[i]!.value);
      }
      const size = scene.sizes[i];
      if (scene.kinds[i] === 0) {
        api.drawCircle(0, 0, size, paint);
      } else {
        api.drawRect(-size, -size / 2, size, size / 2, paint);
      }
      api.restore();
    }
    const drawEnd = performance.now();
    api.unbindCanvas();
    c.submit(c.finishRecording());
    if (stats) {
      stats.addSample("scalar-draw", (drawEnd - drawStart) * 1000);
      stats.addSample("scalar-frame", (performance.now() - start) * 1000);
    }
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      onStatus(`scalar n=${n}: settling`);
      await sleep(SETTLE_MS);
      if (cancelled) {
        return;
      }
      onStatus(`scalar n=${n}: animating ${ANIMATION_SECONDS}s`);
      stats?.reset();
      const nativeId = ref.current?.getNativeId() ?? -1;
      const fps = await measureFps(nativeId, ANIMATION_SECONDS);
      const snapshot = stats?.snapshot();
      if (cancelled) {
        return;
      }
      const us = 1e-3;
      onDone({
        mode: "scalar",
        n,
        timings: {
          workletDraw: summarize(snapshot?.named["scalar-draw"] ?? [], us),
          workletFrame: summarize(snapshot?.named["scalar-frame"] ?? [], us),
        },
        fps,
        fpsSeconds: ANIMATION_SECONDS,
        notes: stats
          ? []
          : [
              "__RNSkiaRecorderStats is missing: rebuild with RNSKIA_RECORDER_STATS=1",
            ],
      });
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SkiaGraphiteView ref={ref} style={styles.canvas} />;
};

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#0b1020" },
});
