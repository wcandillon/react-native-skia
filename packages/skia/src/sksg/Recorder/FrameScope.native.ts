import type { Skia } from "../../skia/types";

import type { FrameScope } from "./FrameScope";

/**
 * No-op on native. The JSI wrappers report the size of the native objects
 * they hold to the garbage collector (setExternalMemoryPressure), so the GC
 * is aware of the real cost of the objects the renderer creates and reclaims
 * them on its own. The tracking scope is only needed on Web, where CanvasKit
 * objects live in WASM memory the GC cannot see (see FrameScope.ts).
 */
export const createFrameScope = (Skia: Skia): FrameScope => {
  "worklet";
  return {
    Skia,
    track: <T>(value: T): T => value,
    dispose: () => {
      // nothing to dispose: no objects are tracked on native
    },
  };
};
