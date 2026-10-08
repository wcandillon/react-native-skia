import React from "react";
import type { SkPath } from "react-native-skia";
import { fitbox, rect, Path, Skia } from "react-native-skia";

export type IconName = "plus" | "search" | "credit-card" | "more" | "cast";

interface IconProps {
  name: IconName;
  size: number;
}

const plus = Skia.PathBuilder.Make()
  .moveTo(12, 5)
  .lineTo(12, 19)
  .moveTo(5, 12)
  .lineTo(19, 12)
  .build();

const search = Skia.PathBuilder.Make()
  .addCircle(11, 11, 8)
  .moveTo(21, 21)
  .lineTo(16.65, 16.65)
  .build();

const more = Skia.PathBuilder.Make()
  .addCircle(12, 12, 1)
  .addCircle(19, 12, 1)
  .addCircle(5, 12, 1)
  .build();

const castBase = Skia.Path.MakeFromSVGString(
  "M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"
)!;
// Small dot line - combine with the SVG path
const cast = Skia.PathBuilder.MakeFromPath(castBase)
  .moveTo(2, 20)
  .lineTo(2.01, 20)
  .build();

const paths: Record<IconName, SkPath> = {
  plus,
  search,
  "credit-card": cast,
  more,
  cast,
};

const src = rect(0, 0, 24, 24);

export const Icon = ({ name, size }: IconProps) => {
  const squareSize = size / Math.sqrt(2);
  const offset = (size - squareSize) / 2;
  const dst = rect(offset, offset, squareSize, squareSize);
  const path = paths[name];
  //const bounds = path.computeTightBounds();
  const transform = fitbox("contain", src, dst);
  return (
    <Path
      transform={[
        { translateX: -size / 2 },
        { translateY: -size / 2 },
        ...transform,
      ]}
      path={path}
      strokeWidth={2}
      color="black"
      style="stroke"
      strokeJoin="round"
      strokeCap="round"
    />
  );
};
