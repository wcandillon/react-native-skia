import React, { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
  BlendMode,
  BlurStyle,
  Skia,
  SkiaView,
  useClockValue,
  useDrawCallback,
  useComputedValue,
  polar2Canvas,
  mix,
} from "@shopify/react-native-skia";

const c1 = "#61bea2";
const c2 = "#529ca0";

const fibonacci = (num: number) => {
  let a = 1,
    b = 0,
    temp;

  while (num >= 0) {
    temp = a;
    a = a + b;
    b = temp;
    num--;
  }

  return b;
};

export const useMakeJsThreadBusy = () =>
  useEffect(() => {
    setInterval(() => {
      console.log("JS thread is busy now");
      while (true) {
        fibonacci(10000);
      }
    }, 2000);
  }, []);

export const Breathe = () => {
  const { width, height } = useWindowDimensions();
  const R = width / 4;
  useMakeJsThreadBusy();
  const _clock = useClockValue(); // Readonly Value

  const _progress = useComputedValue(() => {
    "worklet";
    const clock = _clock;
    const duration = 2000;
    const progress = (clock.current % duration) / duration;
    const odd = Math.floor(clock.current / duration) % 2;
    return odd ? 1 - progress : progress;
  }, [_clock]);

  const onDraw = useDrawCallback((canvas) => {
    "worklet";
    const progress = _progress;
    const center = Skia.Point(width / 2, height / 2 - 64);
    canvas.drawColor(Skia.Color("rgb(36,43,56)"));
    canvas.save();
    const rotate = mix(progress.current, -180, 0);
    canvas.rotate(rotate, center.x, center.y);
    const paint = Skia.Paint();
    paint.setBlendMode(BlendMode.Screen);
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, 40, true));
    for (let index = 0; index < 6; index++) {
      const theta = (index * (2 * Math.PI)) / 6;
      const { x, y } = polar2Canvas(
        { theta, radius: progress.current * R },
        { x: 0, y: 0 }
      );
      paint.setColor(Skia.Color(index % 2 ? c1 : c2));
      const scale = mix(progress.current, 0.3, 1);
      canvas.save();
      canvas.translate(x, y);
      canvas.translate(center.x, center.y);
      canvas.scale(scale, scale);
      canvas.translate(-center.x, -center.y);

      canvas.drawCircle(center.x, center.y, R, paint);
      canvas.restore();
    }
    canvas.restore();
  });

  return (
    <SkiaView style={{ width, height }} onDraw={onDraw} mode="continuous" />
  );
};
