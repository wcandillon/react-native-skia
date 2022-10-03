/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Skia, SkRect, Vector } from "../../../skia/types";
import type { RectCtor, RectDef, RRectCtor, RRectDef } from "../../types";

import { processRadius } from "./Radius";

export const isEdge = (pos: Vector, b: SkRect) =>
  pos.x === b.x || pos.y === b.y || pos.x === b.width || pos.y === b.height;

// We have an issue to check property existence on JSI backed instances
const isRRectCtor = (def: RRectDef): def is RRectCtor =>
  (def as any).rect === undefined;
// We have an issue to check property existence on JSI backed instances
const isRectCtor = (def: RectDef): def is RectCtor =>
  (def as any).rect === undefined;

export const processRect = (Skia: Skia, def: RectDef) => {
  if (isRectCtor(def)) {
    return Skia.XYWHRect(def.x, def.y, def.width, def.height);
  } else {
    return def.rect;
  }
};

export const processRRect = (Skia: Skia, def: RRectDef) => {
  if (isRRectCtor(def)) {
    const r = processRadius(Skia, def.r);
    return Skia.RRectXY(
      Skia.XYWHRect(def.x, def.y, def.width, def.height),
      r.x,
      r.y
    );
  } else {
    return def.rect;
  }
};
