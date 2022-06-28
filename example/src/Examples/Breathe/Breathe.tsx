import React, { useMemo, useRef, useEffect, useState } from "react";
import { PixelRatio, StyleSheet, useWindowDimensions } from "react-native";
import type { SkiaValue } from "@shopify/react-native-skia";
import {
  Skia,
  SkiaView,
  useComputedValue,
  useLoop,
  BlurMask,
  vec,
  Canvas,
  Circle,
  Fill,
  Group,
  polar2Canvas,
  Easing,
  mix,
} from "@shopify/react-native-skia";
import {
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const c1 = "#61bea2";
const c2 = "#529ca0";

interface RingProps {
  index: number;
  progress: SkiaValue<number>;
}

const Ring = ({ index, progress }: RingProps) => {
  const { width, height } = useWindowDimensions();
  const R = width / 4;
  const center = useMemo(
    () => vec(width / 2, height / 2 - 64),
    [height, width]
  );

  const theta = (index * (2 * Math.PI)) / 6;
  const transform = useComputedValue(() => {
    const { x, y } = polar2Canvas(
      { theta, radius: progress.current * R },
      { x: 0, y: 0 }
    );
    const scale = mix(progress.current, 0.3, 1);
    return [{ translateX: x }, { translateY: y }, { scale }];
  }, [progress]);

  return (
    <Group origin={center} transform={transform}>
      <Circle c={center} r={R} color={index % 2 ? c1 : c2} />
    </Group>
  );
};

export const Breathe = () => {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [nativeId, setNativeId] = useState(0);
  const ref = useAnimatedRef<SkiaView>();
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);
  const cb = (value: number) => {
    "worklet";
    SkiaViewApi;
    if (nativeId === 0) {
      return;
    }

    const canvas = SkiaViewApi.getCanvas(nativeId);
    // const canvas = surface.getCanvas();
    // canvas.save();
    // canvas.scale(3, 3);
    // const paint = Skia.Paint();
    // paint.setColor(Skia.Color("lightblue"));
    // canvas.drawCircle(100, 100, 100 * value, paint);
    // canvas.restore();
  };
  console.log({ closure: cb._closure });
  console.log({ asString: cb.asString });
  useAnimatedReaction(() => progress.value, cb, [nativeId]);
  return (
    <SkiaView
      ref={ref}
      style={{ flex: 1 }}
      onDraw={() => {
        setNativeId(ref.current!.nativeId);
      }}
    />
  );
};
