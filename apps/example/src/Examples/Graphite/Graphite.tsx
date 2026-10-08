import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type {
  SkGraphiteContext,
  SkImage,
  SkiaGraphiteViewRef,
} from "react-native-skia";
import { Skia, SkiaGraphiteView, TileMode } from "react-native-skia";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

// Two SkiaGraphiteViews, each fed by Graphite recordings from a different
// runtime: the top one from the JS thread (requestAnimationFrame), the bottom
// one from the Reanimated UI runtime (useFrameCallback). A frame is recorded
// on the calling thread and presented by the view on its display link. Both
// draw a GPU-backed image made on the JS thread, so the picture is complete:
// images can be shared between the runtimes and the views.

export const palette = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#1dd1a1",
  "#5f27cd",
  "#ff9ff3",
  "#54a0ff",
  "#00d2d3",
];

const drawFrame = (
  ctx: SkGraphiteContext,
  image: SkImage | null,
  t: number
) => {
  "worklet";
  const { width, height } = ctx;
  const canvas = ctx.beginRecording();
  // The canvas starts with the previous frame: clear it.
  canvas.clear(Skia.Color("#0b1020"));
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  if (image) {
    const size = radius * 1.1;
    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(t * 20, 0, 0);
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(-size / 2, -size / 2, size, size),
      Skia.Paint()
    );
    canvas.restore();
  }
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = t + (i * Math.PI * 2) / count;
    paint.setColor(Skia.Color(palette[i % palette.length]));
    canvas.drawCircle(
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      10 + 6 * Math.sin(t * 3 + i),
      paint
    );
  }
  ctx.submit(ctx.finishRecording());
};

// A GPU-backed image: drawn into an offscreen surface on the JS thread and
// sampled by both views.
export const useGpuImage = () =>
  useMemo(() => {
    const size = 256;
    const surface = Skia.Surface.MakeOffscreen(size, size);
    if (!surface) {
      return null;
    }
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: 0, y: 0 },
        { x: size, y: size },
        [Skia.Color("#ff6b6b"), Skia.Color("#feca57"), Skia.Color("#48dbfb")],
        null,
        TileMode.Clamp
      )
    );
    canvas.drawCircle(size / 2, size / 2, size / 2, paint);
    surface.flush();
    const image = surface.makeImageSnapshot();
    // On the web a texture belongs to the WebGL context that made it; the
    // views have their own, so they need a CPU copy.
    return Platform.OS === "web" ? image.makeNonTextureImage() : image;
  }, []);

const JSThreadView = ({ image }: { image: SkImage | null }) => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext();
    if (!ctx) {
      return undefined;
    }
    let frame = 0;
    const loop = () => {
      drawFrame(ctx, image, Date.now() / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [image]);
  return <SkiaGraphiteView ref={ref} style={styles.view} opaque />;
};

const UIRuntimeView = ({ image }: { image: SkImage | null }) => {
  const ref = useRef<SkiaGraphiteViewRef>(null);
  // The context is obtained on the JS thread once the view is mounted and
  // captured into the worklet through a shared value.
  const ctx = useSharedValue<SkGraphiteContext | null>(null);
  useEffect(() => {
    ctx.value = ref.current?.getContext() ?? null;
  }, [ctx]);
  useFrameCallback((frame) => {
    "worklet";
    if (ctx.value) {
      drawFrame(ctx.value, image, frame.timestamp / 1000);
    }
  });
  return <SkiaGraphiteView ref={ref} style={styles.view} opaque />;
};

export const Graphite = () => {
  const image = useGpuImage();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recorded on the JS thread</Text>
      <JSThreadView image={image} />
      <Text style={styles.label}>Recorded on the Reanimated UI runtime</Text>
      <UIRuntimeView image={image} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  view: { flex: 1 },
  label: {
    color: "#86868b",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
