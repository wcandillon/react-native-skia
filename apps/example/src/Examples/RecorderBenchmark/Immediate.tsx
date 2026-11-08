import React, { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Canvas,
  PaintStyle,
  Picture,
  Skia,
  TileMode,
  useCanvasRef,
} from "react-native-skia";
import type { SkRect, SkShader } from "react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

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

export interface ImmediateBenchProps extends BenchProps {
  variant: "alloc" | "hoisted";
}

/**
 * The current immediate mode, as the docs show it: a derived value records
 * the scene into a picture on the UI thread on every frame, and <Picture>
 * draws it.
 *
 * "alloc" follows the docs example: a PictureRecorder, a cull rect, and a
 * Paint, a Color(string) and a gradient per node, every frame. "hoisted"
 * creates every object once (one paint, one recorder, one cull rect, the
 * shaders and rects of every node) and only calls into them per frame, to
 * tell the cost of the objects from the cost of the calls.
 *
 * Measured: the time of the worklet per frame and the frame rate.
 */
export const ImmediateBench = ({
  n,
  variant,
  onDone,
  onStatus,
}: ImmediateBenchProps) => {
  const { width, height } = useWindowDimensions();
  const nodes = useMemo(
    () => makeScene(n, width, height - 160),
    [n, width, height]
  );
  const values = useAnimatedValues(nodes, true);
  const ref = useCanvasRef();
  const stats = getStats();
  const timer = `immediate-${variant}`;

  // Hoisted once, on the JS thread; captured by the worklet.
  const hoisted = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const cull = Skia.XYWHRect(0, 0, width, height);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    const shaders: SkShader[] = [];
    const rects: SkRect[] = [];
    const alphas: number[] = [];
    const strokeWidths: number[] = [];
    const styles: number[] = [];
    nodes.forEach((node) => {
      const { size } = node;
      shaders.push(
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
      );
      rects.push(Skia.XYWHRect(-size, -size / 2, size * 2, size));
      alphas.push(node.opacity);
      strokeWidths.push(node.strokeWidth);
      styles.push(
        node.style === "stroke" ? PaintStyle.Stroke : PaintStyle.Fill
      );
    });
    return {
      recorder,
      cull,
      paint,
      shaders,
      rects,
      alphas,
      strokeWidths,
      styles,
    };
  }, [nodes, width, height]);

  // What the worklets need of the scene, as plain numbers and strings.
  const scene = useMemo(
    () => ({
      count: nodes.length,
      kinds: nodes.map((node) => (node.kind === "circle" ? 0 : 1)),
      xs: nodes.map((node) => node.x),
      ys: nodes.map((node) => node.y),
      sizes: nodes.map((node) => node.size),
      colors: nodes.map((node) => node.color),
      gradients: nodes.map((node) => node.gradient.colors),
      strokeWidths: nodes.map((node) => node.strokeWidth),
      strokes: nodes.map((node) => node.style === "stroke"),
      opacities: nodes.map((node) => node.opacity),
      animated: nodes.map((node) => node.animated),
    }),
    [nodes]
  );
  const { xs, ys, opacities } = values;

  const picture = useDerivedValue(() => {
    "worklet";
    const start = performance.now();
    if (variant === "alloc") {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(
        Skia.XYWHRect(0, 0, width, height)
      );
      for (let i = 0; i < scene.count; i++) {
        const size = scene.sizes[i];
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setColor(Skia.Color(scene.colors[i]));
        paint.setStrokeWidth(scene.strokeWidths[i]);
        paint.setStyle(scene.strokes[i] ? PaintStyle.Stroke : PaintStyle.Fill);
        paint.setShader(
          Skia.Shader.MakeLinearGradient(
            { x: -size, y: -size },
            { x: size, y: size },
            [
              Skia.Color(scene.gradients[i][0]),
              Skia.Color(scene.gradients[i][1]),
            ],
            null,
            TileMode.Clamp
          )
        );
        const animated = scene.animated[i];
        paint.setAlphaf(animated ? opacities[i]!.value : scene.opacities[i]);
        canvas.save();
        canvas.translate(
          animated ? xs[i]!.value : scene.xs[i],
          animated ? ys[i]!.value : scene.ys[i]
        );
        if (scene.kinds[i] === 0) {
          canvas.drawCircle(0, 0, size, paint);
        } else {
          canvas.drawRect(
            Skia.XYWHRect(-size, -size / 2, size * 2, size),
            paint
          );
        }
        canvas.restore();
      }
      const result = recorder.finishRecordingAsPicture();
      if (stats) {
        stats.addSample(timer, (performance.now() - start) * 1000);
      }
      return result;
    }
    const {
      recorder,
      cull,
      paint,
      shaders,
      rects,
      alphas,
      strokeWidths,
      styles,
    } = hoisted;
    const canvas = recorder.beginRecording(cull);
    for (let i = 0; i < scene.count; i++) {
      paint.setShader(shaders[i]);
      paint.setStrokeWidth(strokeWidths[i]);
      paint.setStyle(styles[i]);
      const animated = scene.animated[i];
      paint.setAlphaf(animated ? opacities[i]!.value : alphas[i]);
      canvas.save();
      canvas.translate(
        animated ? xs[i]!.value : scene.xs[i],
        animated ? ys[i]!.value : scene.ys[i]
      );
      if (scene.kinds[i] === 0) {
        canvas.drawCircle(0, 0, scene.sizes[i], paint);
      } else {
        canvas.drawRect(rects[i], paint);
      }
      canvas.restore();
    }
    const result = recorder.finishRecordingAsPicture();
    if (stats) {
      stats.addSample(timer, (performance.now() - start) * 1000);
    }
    return result;
  }, [scene, hoisted, xs, ys, opacities]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      onStatus(`${timer} n=${n}: settling`);
      await sleep(SETTLE_MS);
      if (cancelled) {
        return;
      }
      onStatus(`${timer} n=${n}: animating ${ANIMATION_SECONDS}s`);
      stats?.reset();
      const nativeId = ref.current?.getNativeId() ?? -1;
      const fps = await measureFps(nativeId, ANIMATION_SECONDS);
      const snapshot = stats?.snapshot();
      if (cancelled) {
        return;
      }
      const us = 1e-3;
      onDone({
        mode: timer,
        n,
        timings: {
          worklet: summarize(snapshot?.named[timer] ?? [], us),
          mapperReadUpdates: summarize(snapshot?.timers.readUpdates ?? [], us),
          replayPlay: summarize(snapshot?.timers.play ?? [], us),
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

  return (
    <Canvas ref={ref} style={styles.canvas}>
      <Picture picture={picture} />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#0b1020" },
});
