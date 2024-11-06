import type { SkiaContext } from "@shopify/react-native-skia";
import {
  BlendMode,
  BlurStyle,
  mix,
  polar2Canvas,
  Skia,
} from "@shopify/react-native-skia";
import { Dimensions, PixelRatio } from "react-native";
import { runOnUI, useSharedValue } from "react-native-reanimated";
import { useCanvasEffect } from "react-native-wgpu";

const pd = PixelRatio.get();

export const useSkiaContext = () => {
  const context = useSharedValue<SkiaContext | null>(null);
  const ref = useCanvasEffect(() => {
    const nativeSurface = ref.current!.getNativeSurface();
    const { surface, width, height } = nativeSurface;
    runOnUI(() => {
      context.value = Skia.Context(surface, width * pd, height * pd);
    })();
  });
  return {
    context,
    ref,
  };
};

const { width, height } = Dimensions.get("window");
const center = { x: width / 2, y: height / 2 };
const R = width / 4;

const c1 = "#61bea2";
const c2 = "#529ca0";
const root = Skia.Paint();
root.setBlendMode(BlendMode.Screen);
// TODO: fix mask filter for graphite
//root.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, 10, true));
const p1 = root.copy();
p1.setColor(Skia.Color(c1));
const p2 = root.copy();
p2.setColor(Skia.Color(c2));

export const drawBreatheDemo = (ctx: SkiaContext, progress: number) => {
  "worklet";
  const surface = ctx.getSurface();
  if (surface === null) {
    throw new Error("No surface available");
  }
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("rgb(36, 43, 56)"));
  canvas.save();
  canvas.scale(pd, pd);
  canvas.rotate(progress * -180, center.x, center.y);
  // const offscreen = Skia.Surface.MakeOffscreen(256, 256)!;
  // const offscreenCanvas = offscreen.getCanvas();
  // offscreenCanvas.clear(Skia.Color("green"));
  // canvas.drawImage(offscreen.makeImageSnapshot(), 0, 0);
  new Array(6).fill(0).map((_, index) => {
    canvas.save();
    const theta = (index * (2 * Math.PI)) / 6;
    const { x, y } = polar2Canvas(
      { theta, radius: progress * R },
      { x: 0, y: 0 }
    );
    const scale = mix(progress, 0.3, 1);

    canvas.translate(center.x, center.y);
    canvas.translate(x, y);
    canvas.scale(scale, scale);
    canvas.translate(-center.x, -center.y);

    const paint = index % 2 ? p1 : p2;
    canvas.drawCircle(center.x, center.y, R, paint);
    canvas.restore();
  });

  canvas.restore();
};
