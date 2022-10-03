/*global SkiaApi*/
import { useMemo } from "react";

import { Skia } from "../Skia";
import type { DataSourceParam } from "../types";

import { useTypeface } from "./Typeface";

/**
 * Returns a Skia Font object
 * */
export const useFont = (
  font: DataSourceParam,
  size?: number,
  onError?: (err: Error) => void
) => {
  const typeface = useTypeface(font, onError);
  return useMemo(() => {
    if (typeface && size) {
      return Skia.Font(typeface, size);
    } else if (typeface && !size) {
      return Skia.Font(typeface);
    } else {
      return null;
    }
  }, [size, typeface]);
};
