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
const p1 =
  "M8,125C3.5,123,0.4,118.6,0,113.6C0,113.6,0,12.7,0,12.7C0.2,10.3,1,7.9,2.4,5.9C3.9,3.9,5.8,2.3,8,1.3C9.8,0.4,11.8,0,13.7,0C14.2,0,14.7,0,15.1,0.1C17.6,0.3,19.9,1.2,21.9,2.7C21.9,2.7,50,22,50,22C50,22,50,104.3,50,104.3C50,104.3,21.9,123.6,21.9,123.6C20.3,124.8,18.5,125.6,16.6,126C16.6,126,10.9,126,10.9,126C9.9,125.8,8.9,125.5,8,125C8,125,8,125,8,125";
const p2 =
  "M0,0C0,0,0,10.3,0,10.3C0,10.3,0,20.6,0,20.6C0,20.6,0,41.1,0,41.1C0,41.1,0,61.7,0,61.7C0,61.7,0,82.2,0,82.2C0,82.2,22.3,66.9,22.3,66.9C22.3,66.9,44.5,51.5,44.5,51.5C46.2,50.3,47.6,48.8,48.6,47C49.5,45.2,50,43.2,50,41.1C50,39.1,49.5,37,48.6,35.2C47.6,33.4,46.2,31.9,44.5,30.7C44.5,30.7,22.3,15.4,22.3,15.4C22.3,15.4,0,0,0,0C0,0,0,0,0,0";
const s1 =
  "M16.7,0C12.2,0,8,1.8,4.9,4.9C1.8,8,0,12.2,0,16.7C0,16.7,0,105.6,0,105.6C0,110,1.8,114.2,4.9,117.3C8,120.5,12.2,122.2,16.7,122.2C21.1,122.2,25.3,120.5,28.5,117.3C31.6,114.2,33.3,110,33.3,105.6C33.3,105.6,33.3,83.3,33.3,83.3C33.3,83.3,33.3,61.1,33.3,61.1C33.3,61.1,33.3,38.9,33.3,38.9C33.3,38.9,33.3,16.7,33.3,16.7C33.3,12.2,31.6,8,28.5,4.9C25.3,1.8,21.1,0,16.7,0C16.7,0,16.7,0,16.7,0";

const playLeft = Skia.Path.MakeFromSVGString(p1)!;
const playRight = Skia.Path.MakeFromSVGString(p2)!;
const m3 = Skia.Matrix();
m3.translate(50, (126 - playRight.computeTightBounds().height) / 2);
playRight.transform(m3);

const pauseLeft = Skia.Path.MakeFromSVGString(s1)!;
const pauseRight = Skia.Path.MakeFromSVGString(s1)!;
m3.identity();
m3.translate(50, 0);
pauseRight.transform(m3);

const bounds = { x: 0, y: 0, width: 100, height: 126 };

export const Headspace = () => {
  const progress = useLoop({ duration: 4000 });
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
    () => playLeft.interpolate(pauseLeft, progress.current)!,
    [progress]
  );
  const right = useComputedValue(
    () => playRight.interpolate(pauseRight, progress.current)!,
    [progress]
  );
  return (
    <Canvas style={{ flex: 1 }}>
      <Path path={path} />
      <Group color="red">
        <Path path={left} />
        <Path path={right} />
      </Group>
    </Canvas>
  );
};
