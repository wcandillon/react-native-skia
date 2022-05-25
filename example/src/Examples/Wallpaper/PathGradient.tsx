import type { SkPath, SkiaReadonlyValue } from "@shopify/react-native-skia";
import {
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
        //const trimmed = path.copy();
        //trimmed.trim(0, progress.current, false);

        return points.reduce<null | [number, number]>((acc, pt) => {
          if (acc && pt) {
            const paint = Skia.Paint();
            paint.setAntiAlias(true);
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(strokeWidth);
            paint.setStrokeCap(StrokeCap.Round);
            paint.setColor(Float32Array.of(0.3, 0.6, 0.7, 1));
            const [x1, y1] = acc;
            const [x2, y2] = pt;
            canvas.drawLine(x1, y1, x2, y2, paint);
          }
          return pt;
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
