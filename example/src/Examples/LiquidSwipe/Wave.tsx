import type { ReactElement } from "react";
import React from "react";
import { useWindowDimensions } from "react-native";
import type { SkiaValue, Vector, SkPath } from "@shopify/react-native-skia";
import {
  Group,
  useComputedValue,
  vec,
  Skia,
  interpolate,
  Extrapolate,
} from "@shopify/react-native-skia";

import type { SlideProps } from "./Slide";

export const MIN_LEDGE = 25;
export const MARGIN_WIDTH = MIN_LEDGE + 50;

const curve = (path: SkPath, c1: Vector, c2: Vector, to: Vector) => {
  path.cubicTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y);
};

export enum Side {
  LEFT,
  RIGHT,
  NONE,
}

interface WaveProps {
  side: Side;
  position: { x: SkiaValue<number>; y: SkiaValue<number> };
  children: ReactElement<SlideProps>;
  isTransitioning: SkiaValue<boolean>;
}

export const Wave = ({
  side,
  position: { x, y },
  children,
  isTransitioning,
}: WaveProps) => {
  const { width, height } = useWindowDimensions();
  const R = useComputedValue(() => {
    return Math.min(x.current - MIN_LEDGE, width / 2);
  }, [x]);
  const ledge = useComputedValue(() => {
    const minLedge = interpolate(
      x.current,
      [0, MIN_LEDGE],
      [0, MIN_LEDGE],
      Extrapolate.CLAMP
    );
    const baseLedge = minLedge + Math.max(0, x.current - MIN_LEDGE - R.current);
    return isTransitioning.current ? x.current : baseLedge;
    //return withSpring(isTransitioning.current ? x.current : baseLedge);
  }, [x, R]);
  const clip = useComputedValue(() => {
    const stepY = x.current - MIN_LEDGE; // R = 50
    const stepX = R.current / 2; // R/2
    // 0.5522847498 is taken from https://spencermortensen.com/articles/bezier-circle/
    const C = stepY * 0.5522847498;

    const p1 = { x: ledge.current, y: y.current - 2 * stepY };
    const p2 = vec(p1.x + stepX, p1.y + stepY);
    const p3 = vec(p2.x + stepX, p2.y + stepY);
    const p4 = vec(p3.x - stepX, p3.y + stepY);
    const p5 = vec(p4.x - stepX, p4.y + stepY);

    const c11 = vec(p1.x, p1.y + C);
    const c12 = vec(p2.x, p2.y);

    const c21 = vec(p2.x, p2.y);
    const c22 = vec(p3.x, p3.y - C);

    const c31 = vec(p3.x, p3.y + C);
    const c32 = vec(p4.x, p4.y);

    const c41 = vec(p4.x, p4.y);
    const c42 = vec(p5.x, p5.y - C);

    const path = Skia.Path.Make();
    path.moveTo(0, 0);
    path.lineTo(p1.x, 0);
    path.lineTo(p1.x, p1.y);
    curve(path, c11, c12, p2);
    curve(path, c21, c22, p3);
    curve(path, c31, c32, p4);
    curve(path, c41, c42, p5);
    path.lineTo(path.getLastPt().x, height);
    path.lineTo(0, height);
    if (side === Side.RIGHT) {
      const transform = Skia.Matrix();
      transform.translate(width / 2, height / 2);
      transform.scale(-1, 1);
      transform.translate(-width / 2, -height / 2);
      path.transform(transform);
    }
    return path;
  }, [x, y, R, ledge]);

  return <Group clip={clip}>{children}</Group>;
};
