import type { Vector } from "@shopify/react-native-skia";
import {
  useClockValue,
  Group,
  useLoop,
  mix,
  useComputedValue,
  rrect,
  rect,
  Canvas,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const rrectFromCircle = (c: Vector, r: number, rx: number, ry: number) =>
  rrect(rect(c.x - r, c.y - r, 2 * r, 2 * r), rx, ry);
const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const r = 50;

export const Headspace = () => {
  const clock = useClockValue();
  const progress = useLoop({ duration: 3000 });
  const transform = useComputedValue(() => {
    return [
      {
        rotate: clock.current * 0.001,
      },
    ];
  }, [clock]);
  const rct = useComputedValue(() => {
    return rrectFromCircle(
      c,
      r,
      mix(progress.current, r - 0.05 * r, r + 0.15 * r),
      mix(progress.current, r + 0.15 * r, r - 0.05 * r)
    );
  }, [progress]);
  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={transform} origin={c}>
        <RoundedRect rect={rct} />
      </Group>
    </Canvas>
  );
};
