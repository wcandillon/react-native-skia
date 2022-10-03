import type { Skia } from "../../../skia/types";
import type { CircleDef, ScalarCircleDef } from "../../types";

export const isCircleScalarDef = (def: CircleDef): def is ScalarCircleDef =>
  // We have an issue to check property existence on JSI backed instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (def as any).cx !== undefined;

export const processCircle = (Skia: Skia, def: CircleDef) => {
  if (isCircleScalarDef(def)) {
    return { c: Skia.Point(def.cx, def.cy), r: def.r };
  }
  return def;
};
