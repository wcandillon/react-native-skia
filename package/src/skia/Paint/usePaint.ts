import type { DependencyList } from "react";
import { useMemo } from "react";

import { SkiaPaint } from "./Paint";
import type { SkPaint } from "./Paint";

/**
 * Returns a Skia Paint object
 * */
export const usePaint = (
  initializer?: (paint: SkPaint) => void,
  deps?: DependencyList
) =>
  useMemo(() => {
    const p = SkiaPaint();
    if (initializer) {
      initializer(p);
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
