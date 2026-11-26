import type { Skia } from "../../../skia/types";
import { isPath } from "../../../skia/types";
import type { PathDef } from "../../types";

export const processPath = (Skia: Skia, rawPath: PathDef) => {
  "worklet";
  // An invalid SVG path string throws a SkiaDecodeError.
  return typeof rawPath === "string"
    ? Skia.Path.MakeFromSVGString(rawPath)
    : rawPath;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isPathDef = (def: any): def is PathDef => {
  "worklet";
  return typeof def === "string" || isPath(def);
};
