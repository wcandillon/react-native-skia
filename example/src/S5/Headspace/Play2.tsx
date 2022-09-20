import type { SkiaValue, Vector } from "@shopify/react-native-skia";
import {
  mix,
  CornerPathEffect,
  dist,
  vec,
  fitbox,
  processTransform,
  Skia,
  Path,
  useComputedValue,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions } from "react-native";

const getPointAtLength = (length: number, from: Vector, to: Vector) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const x = from.x + length * Math.cos(angle);
  const y = from.y + length * Math.sin(angle);
  return vec(x, y);
};

const src = Skia.XYWHRect(0, 0, 24, 24);
const pause = Skia.Path.Make();
pause.addRect(Skia.XYWHRect(0, 0, 8, 24));
pause.addRect(Skia.XYWHRect(24 - 8, 0, 8, 24));
console.log({ points: pause.countPoints() });

const t = dist(vec(0, 0), vec(24, 12)) / 2;
const mid1 = getPointAtLength(t, vec(0, 0), vec(24, 12));
const mid2 = getPointAtLength(t, vec(0, 24), vec(24, 12));

const play = Skia.Path.Make();
play.moveTo(0, 0);
play.lineTo(mid1.x, mid1.y);
play.lineTo(mid2.x, mid2.y);
play.lineTo(0, 24);
play.close();
play.moveTo(mid1.x, mid1.y);
play.lineTo(24, 12);
play.lineTo(24, 12);
play.lineTo(mid2.x, mid2.y);
play.close();

const { width, height } = Dimensions.get("window");
const c = vec(width / 2, height / 2);
const r = 25;
const dst = Skia.XYWHRect(c.x - r, c.y - r, r * 2, r * 2);
const m3 = Skia.Matrix();
processTransform(m3, fitbox("contain", src, dst));
pause.transform(m3);
play.transform(m3);

interface Play2Props {
  progress: SkiaValue<number>;
  c: Vector;
  r: number;
}

export const Play2 = ({ progress }: Play2Props) => {
  const path = useComputedValue(() => {
    const p = pause.interpolate(play, progress.current)!;
    p.simplify();
    return p;
  }, [progress]);
  return (
    <Path path={path} color="white">
      <CornerPathEffect r={8} />
    </Path>
  );
};
