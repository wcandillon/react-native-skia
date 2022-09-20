/* eslint-disable max-len */
import type { SkiaValue, Vector } from "@shopify/react-native-skia";
import {
  fitbox,
  Group,
  mix,
  Path,
  useComputedValue,
  Skia,
} from "@shopify/react-native-skia";
import React from "react";
import { interpolate } from "flubber";

const bounds = { x: 0, y: 0, width: 100, height: 126 };

const pauseRight = Skia.Path.MakeFromSVGString(
  "M 0 0 V 10.3 V 20.6 V 41.1 V 61.7 V 82.2 L 22.3 66.9 L 44.5 51.5 C 46.2 50.3 47.6 48.8 48.6 47 C 49.5 45.2 50 43.2 50 41.1 C 50 39.1 49.5 37 48.6 35.2 C 47.6 33.4 46.2 31.9 44.5 30.7 L 22.3 15.4 L 0 0 Z"
)!;
const playRight = Skia.Path.MakeFromSVGString(
  "M16.6667 0C12.2464 0 8.00716 1.75595 4.88155 4.88155C1.75595 8.00716 0 12.2464 0 16.6667V105.556C0 109.976 1.75595 114.215 4.88155 117.341C8.00716 120.466 12.2464 122.222 16.6667 122.222C21.0869 122.222 25.3262 120.466 28.4518 117.341C31.5774 114.215 33.3333 109.976 33.3333 105.556V16.6667C33.3333 12.2464 31.5774 8.00716 28.4518 4.88155C25.3262 1.75595 21.0869 0 16.6667 0Z"
)!;

const m3 = Skia.Matrix();
m3.translate(
  bounds.width / 2,
  (bounds.height - pauseRight.computeTightBounds().height) / 2
);
pauseRight.transform(m3);

m3.identity();
m3.translate(bounds.width - playRight.computeTightBounds().width, 0);
playRight.transform(m3);

const leftInterpolator = interpolate(
  "M 8 125 C 3.5 123 0.4 118.6 0 113.6 V 12.7 C 0.2 10.3 1 7.9 2.4 5.9 C 3.9 3.9 5.8 2.3 8 1.3 C 9.8 0.4 11.8 0 13.7 0 C 14.2 0 14.7 0 15.1 0.1 C 17.6 0.3 19.9 1.2 21.9 2.7 L 50 22 V 104.3 L 21.9 123.6 C 20.3 124.8 18.5 125.6 16.6 126 H 10.9 C 9.9 125.8 8.9 125.5 8 125 Z",
  "M 16.7 0 C 12.2 0 8 1.8 4.9 4.9 C 1.8 8 0 12.2 0 16.7 V 105.6 C 0 110 1.8 114.2 4.9 117.3 C 8 120.5 12.2 122.2 16.7 122.2 C 21.1 122.2 25.3 120.5 28.5 117.3 C 31.6 114.2 33.3 110 33.3 105.6 V 16.7 C 33.3 12.2 31.6 8 28.5 4.9 C 25.3 1.8 21.1 0 16.7 0 Z"
);

const rightInterpolator = interpolate(
  pauseRight.toSVGString(),
  playRight.toSVGString()
);

interface PlayProps {
  progress: SkiaValue<number>;
  c: Vector;
  r: number;
}

export const Play = ({ progress, c, r }: PlayProps) => {
  const left = useComputedValue(() => {
    const pathLeft = Skia.Path.MakeFromSVGString(
      leftInterpolator(progress.current)
    )!;
    return pathLeft;
  }, [progress]);
  const right = useComputedValue(() => {
    const pathRight = Skia.Path.MakeFromSVGString(
      rightInterpolator(progress.current)
    )!;
    return pathRight;
  }, [progress]);
  const transform = useComputedValue(() => {
    const sf = 0.45;
    const h = r * sf * 2;
    const centroid = h / 2 - h / 3;
    return [
      ...fitbox("contain", bounds, {
        x: c.x - h / 2,
        y: c.y - h / 2,
        width: h,
        height: h,
      }),
      { translateX: mix(progress.current, centroid, 0) },
    ];
  }, [progress]);
  return (
    <Group color="white" transform={transform}>
      <Path path={left} />
      <Path path={right} />
    </Group>
  );
};
