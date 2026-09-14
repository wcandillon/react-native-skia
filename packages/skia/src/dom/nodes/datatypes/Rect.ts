/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Skia, SkRect, SkRRect, Vector } from "../../../skia/types";
import type { RectCtor, RectDef, RRectCtor, RRectDef } from "../../types";

import { processRadius } from "./Radius";

export const isEdge = (pos: Vector, b: SkRect) => {
  "worklet";
  const right = b.x + b.width;
  const bottom = b.y + b.height;
  const withinX = pos.x >= b.x && pos.x <= right;
  const withinY = pos.y >= b.y && pos.y <= bottom;
  return (
    (withinY && (pos.x === b.x || pos.x === right)) ||
    (withinX && (pos.y === b.y || pos.y === bottom))
  );
};

// We have an issue to check property existence on JSI backed instances
const isRRectCtor = (def: RRectDef): def is RRectCtor => {
  "worklet";
  return (def as any).rect === undefined;
};
// We have an issue to check property existence on JSI backed instances
const isRectCtor = (def: RectDef): def is RectCtor => {
  "worklet";
  return (def as any).rect === undefined;
};

export const processRect = (Skia: Skia, def: RectDef) => {
  "worklet";
  if (isRectCtor(def)) {
    return Skia.XYWHRect(def.x ?? 0, def.y ?? 0, def.width, def.height);
  } else {
    return def.rect;
  }
};

export const processRRect = (Skia: Skia, def: RRectDef) => {
  "worklet";
  if (isRRectCtor(def)) {
    const r = processRadius(Skia, def.r ?? 0);
    return Skia.RRectXY(
      Skia.XYWHRect(def.x ?? 0, def.y ?? 0, def.width, def.height),
      r.x,
      r.y
    );
  } else {
    return def.rect;
  }
};

export const inflate = (
  Skia: Skia,
  box: SkRRect,
  dx: number,
  dy: number,
  tx = 0,
  ty = 0
) => {
  "worklet";
  return Skia.RRectXY(
    Skia.XYWHRect(
      box.rect.x - dx + tx,
      box.rect.y - dy + ty,
      box.rect.width + 2 * dx,
      box.rect.height + 2 * dy
    ),
    box.rx + dx,
    box.ry + dy
  );
};

export const deflate = (
  Skia: Skia,
  box: SkRRect,
  dx: number,
  dy: number,
  tx = 0,
  ty = 0
) => {
  "worklet";
  return inflate(Skia, box, -dx, -dy, tx, ty);
};
