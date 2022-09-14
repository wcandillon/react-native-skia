import type { Skia, Vector } from "../../../skia/types";
import type { Radius } from "../../types";

export const processRadius = (Skia: Skia, radius: Radius): Vector => {
  if (typeof radius === "number") {
    return Skia.Point(radius, radius);
  }
  return radius;
};
