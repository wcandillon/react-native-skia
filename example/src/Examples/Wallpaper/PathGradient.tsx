import type { SkPath, SkiaReadonlyValue } from "@shopify/react-native-skia";
import {
  interpolateColors,
  dist,
  StrokeCap,
  PaintStyle,
  Skia,
  Drawing,
  Points,
  Circle,
  PathVerb,
  Path,
  useDerivedValue,
} from "@shopify/react-native-skia";
import React from "react";
import bezier from "adaptive-bezier-curve";

const toVec = ([x, y]: [number, number]) => ({ x, y });

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
  const points = path
    .toCmds()
    .map(([verb, sx, sy, c1x, c1y, c2X, c2Y, ex, ey]) => {
      if (verb === PathVerb.Cubic) {
        return bezier([sx, sy], [c1x, c1y], [c2X, c2Y], [ex, ey]);
      }
      return null;
    })
    .flat();
  const totalLength = points.reduce((acc, point, i) => {
    const prev = points[i - 1];
    if (i === 0 || point === null || prev === null) {
      return acc;
    }
    return acc + dist(toVec(prev), toVec(point));
  }, 0);
  return (
    <Drawing
      drawing={({ canvas }) => {
        return points.reduce<null | {
          point: [number, number];
          length: number;
        }>((acc, point) => {
          if (acc && point) {
            const [x1, y1] = acc.point;
            const [x2, y2] = point;
            const length = acc.length + dist(toVec(acc.point), toVec(point));
            const paint = Skia.Paint();
            paint.setAntiAlias(true);
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(strokeWidth);
            paint.setStrokeCap(StrokeCap.Round);
            const delta = totalLength / colors.length;
            paint.setColor(
              interpolateColors(
                length,
                colors.map((_, i) => i * delta),
                colors
              )
            );
            canvas.drawLine(x1, y1, x2, y2, paint);
            console.log({
              point,
              length,
            });
            return {
              point,
              length,
            };
          }
          if (point) {
            return {
              point,
              length: 0,
            };
          }
          return null;
        }, null);
      }}
    />
  );
  // const points = useDerivedValue(() => {

  // }, [progress]);
  // return (
  //   <>
  //     {/* {points.map(([cx, cy], i) => (
  //       <Circle r={10} cx={cx} cy={cy} key={i} color="white" />
  //     ))} */}
  //     <Points
  //       points={points}
  //       color="white"
  //       style="stroke"
  //       strokeWidth={strokeWidth}
  //       mode="lines"
  //     />
  //   </>
  // );
};
