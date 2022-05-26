import type {
  SkPath,
  SkiaReadonlyValue,
  SkPaint,
} from "@shopify/react-native-skia";
import {
  SkColor,
  TileMode,
  interpolateColors,
  dist,
  StrokeCap,
  PaintStyle,
  Skia,
  Drawing,
  PathVerb,
} from "@shopify/react-native-skia";
import React from "react";
import bezier from "adaptive-bezier-curve";

const toVec = ([x, y]: [number, number]) => Skia.Point(x, y);

interface Line {
  from: [number, number];
  to: [number, number];
  paint: SkPaint;
  totalLength: number;
}

interface PathGradientProps {
  path: SkPath;
  colors: string[];
  progress: SkiaReadonlyValue<number>;
  strokeWidth: number;
}

export const PathGradient = ({
  path,
  colors,
  progress,
  strokeWidth,
}: PathGradientProps) => {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setStrokeCap(StrokeCap.Round);
  const points = path
    .toCmds()
    .map(([verb, sx, sy, c1x, c1y, c2X, c2Y, ex, ey]) => {
      if (verb === PathVerb.Cubic) {
        return bezier([sx, sy], [c1x, c1y], [c2X, c2Y], [ex, ey]);
      }
      return null;
    })
    .flat();
  const LENGTH = points.reduce((acc, point, i) => {
    const prev = points[i - 1];
    if (i === 0 || point === null || prev === null) {
      return acc;
    }
    return acc + dist(toVec(prev), toVec(point));
  }, 0);
  const delta = LENGTH / colors.length;
  const inputRange = colors.map((_, j) => j * delta);
  const outputRange = colors.map((cl) => Skia.Color(cl));
  const lines: Line[] = [];
  points.forEach((point, i) => {
    if (point === null) {
      return;
    }
    const prev = points[i - 1];
    if (!prev) {
      return;
    }
    const from = toVec(prev);
    const to = toVec(point);
    const length = dist(from, to);
    const prevLength = lines[lines.length - 1]
      ? lines[lines.length - 1].totalLength
      : 0;
    const totalLength = prevLength + length;
    // const c1 = interpolateColors(prevLength, inputRange, outputRange);
    // const c2 = interpolateColors(totalLength, inputRange, outputRange);
    const p = paint.copy();
    p.setColor(interpolateColors(prevLength, inputRange, outputRange));
    // p.setShader(
    //   Skia.Shader.MakeLinearGradient(from, to, [c1, c2], null, TileMode.Clamp)
    // );
    lines.push({
      from: prev,
      to: point,
      paint: p,
      totalLength,
    });
  });

  return (
    <Drawing
      drawing={({ canvas }) => {
        const t = progress.current * LENGTH;
        lines.forEach(
          ({ from: [x1, y1], to: [x2, y2], paint: p, totalLength }) => {
            if (totalLength <= t) {
              canvas.drawLine(x1, y1, x2, y2, p);
            }
          }
        );
      }}
    />
  );
};
