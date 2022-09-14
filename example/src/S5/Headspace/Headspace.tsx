/* eslint-disable max-len */
import {
  Path,
  Skia,
  useClockValue,
  useComputedValue,
  Canvas,
  vec,
  Group,
  useLoop,
  fitbox,
  Circle,
  useValue,
  useSpring,
  useTouchHandler,
  Spring,
} from "@shopify/react-native-skia";
import React, { useState } from "react";
import { Dimensions } from "react-native";
import SimplexNoise from "simplex-noise";
// @ts-exppect-error
import { interpolate } from "flubber";

const C = 0.55228474983079;
const F = 20000;
const A = 0.2;
const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const r = 50;
const n1 = new SimplexNoise(0);
const n2 = new SimplexNoise(1);
const n3 = new SimplexNoise(2);
const n4 = new SimplexNoise(3);

const bounds = { x: 0, y: 0, width: 100, height: 126 };
const pauseRight = Skia.Path.MakeFromSVGString(
  "M 0 0 V 10.3 V 20.6 V 41.1 V 61.7 V 82.2 L 22.3 66.9 L 44.5 51.5 C 46.2 50.3 47.6 48.8 48.6 47 C 49.5 45.2 50 43.2 50 41.1 C 50 39.1 49.5 37 48.6 35.2 C 47.6 33.4 46.2 31.9 44.5 30.7 L 22.3 15.4 L 0 0 Z"
)!;
const playRight = Skia.Path.MakeFromSVGString(
  "M16.6667 0C12.2464 0 8.00716 1.75595 4.88155 4.88155C1.75595 8.00716 0 12.2464 0 16.6667V105.556C0 109.976 1.75595 114.215 4.88155 117.341C8.00716 120.466 12.2464 122.222 16.6667 122.222C21.0869 122.222 25.3262 120.466 28.4518 117.341C31.5774 114.215 33.3333 109.976 33.3333 105.556V16.6667C33.3333 12.2464 31.5774 8.00716 28.4518 4.88155C25.3262 1.75595 21.0869 0 16.6667 0Z"
)!;

const tx = bounds.width - playRight.computeTightBounds().width;
const m3 = Skia.Matrix();
m3.translate(tx, (126 - pauseRight.computeTightBounds().height) / 2);
pauseRight.transform(m3);

m3.identity();
m3.translate(tx, 0);
playRight.transform(m3);

const leftInterpolator = interpolate(
  "M 8 125 C 3.5 123 0.4 118.6 0 113.6 V 12.7 C 0.2 10.3 1 7.9 2.4 5.9 C 3.9 3.9 5.8 2.3 8 1.3 C 9.8 0.4 11.8 0 13.7 0 C 14.2 0 14.7 0 15.1 0.1 C 17.6 0.3 19.9 1.2 21.9 2.7 L 50 22 V 104.3 L 21.9 123.6 C 20.3 124.8 18.5 125.6 16.6 126 H 10.9 C 9.9 125.8 8.9 125.5 8 125 Z",
  "M16.6667 0C12.2464 0 8.00716 1.75595 4.88155 4.88155C1.75595 8.00716 0 12.2464 0 16.6667V105.556C0 109.976 1.75595 114.215 4.88155 117.341C8.00716 120.466 12.2464 122.222 16.6667 122.222C21.0869 122.222 25.3262 120.466 28.4518 117.341C31.5774 114.215 33.3333 109.976 33.3333 105.556V16.6667C33.3333 12.2464 31.5774 8.00716 28.4518 4.88155C25.3262 1.75595 21.0869 0 16.6667 0Z"
);

const rightInterpolator = interpolate(
  pauseRight.toSVGString(),
  playRight.toSVGString(),
  {
    maxSegmentLength: 1,
  }
);

export const Headspace = () => {
  const [toggled, setToggled] = useState(false);
  const onTouch = useTouchHandler({ onEnd: () => setToggled((t) => !t) });
  const progress = useSpring(toggled ? 1 : 0, Spring.Config.Gentle);

  const clock = useClockValue();

  const path = useComputedValue(() => {
    const C1 = C + A * n1.noise2D(clock.current / F, 0);
    const C2 = C + A * n2.noise2D(clock.current / F, 0);
    const C3 = C + A * n3.noise2D(clock.current / F, 0);
    const C4 = C + A * n4.noise2D(clock.current / F, 0);
    const p = Skia.Path.Make();
    p.moveTo(c.x, c.y - r);
    p.cubicTo(c.x + C1 * r, c.y - r, c.x + r, c.y - C1 * r, c.x + r, c.y);
    p.cubicTo(c.x + r, c.y + C2 * r, c.x + C2 * r, c.y + r, c.x, c.y + r);
    p.cubicTo(c.x - C3 * r, c.y + r, c.x - r, c.y + C3 * r, c.x - r, c.y);
    p.cubicTo(c.x - r, c.y - C4 * r, c.x - C4 * r, c.y - r, c.x, c.y - r);
    const transform = Skia.Matrix();
    transform.translate(c.x, c.y);
    transform.rotate(clock.current / 2000);
    transform.translate(-c.x, -c.y);
    p.transform(transform);
    return p;
  }, [clock]);
  const left = useComputedValue(
    () => leftInterpolator(progress.current)!,
    [progress]
  );
  const right = useComputedValue(
    () => rightInterpolator(progress.current)!,
    [progress]
  );
  return (
    <Canvas style={{ flex: 1 }} onTouch={onTouch}>
      <Path path={path} />
      <Group
        color="white"
        transform={fitbox("contain", bounds, {
          x: c.x - r * 0.61,
          y: c.y - r * 0.61,
          width: 2 * r * 0.61,
          height: 2 * r * 0.61,
        })}
      >
        <Path path={left} />
        <Path path={right} />
      </Group>
    </Canvas>
  );
};
