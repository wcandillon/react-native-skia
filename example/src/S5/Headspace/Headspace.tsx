/* eslint-disable max-len */
import {
  Path,
  Skia,
  useClockValue,
  useComputedValue,
  Canvas,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";
import SimplexNoise from "simplex-noise";

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
const play = Skia.Path.MakeFromSVGString(
  "M8 6.422v19.156c.076.95.659 1.785 1.522 2.182a2.616 2.616 0 002.64-.267l13.8-9.518a2.397 2.397 0 000-3.95l-13.8-9.518a2.616 2.616 0 00-2.64-.267A2.634 2.634 0 008 6.422z"
)!;
const stop = Skia.Path.MakeFromSVGString(
  "M10 5a3 3 0 00-3 3v16a3 3 0 006 0V8a3 3 0 00-3-3zm12 0a3 3 0 00-3 3v16a3 3 0 006 0V8a3 3 0 00-3-3z"
)!;
console.log(play.isInterpolatable(stop));
export const Headspace = () => {
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
  return (
    <Canvas style={{ flex: 1 }}>
      <Path path={path} />
    </Canvas>
  );
};
