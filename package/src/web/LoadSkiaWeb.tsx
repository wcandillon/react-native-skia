// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import type {
  CanvasKit as CanvasKitType,
  CanvasKitInitOptions,
} from "canvaskit-wasm";

declare global {
  var CanvasKit: CanvasKitType;
}

export const LoadSkiaWeb = async (opts?: CanvasKitInitOptions) => {
  if (global.CanvasKit !== undefined) {
    return;
  }
  const CanvasKit = await CanvasKitInit(opts);
  // The CanvasKit API is stored on the global object and used
  // to create the JsiSKApi in the Skia.web.ts file.
  global.CanvasKit = CanvasKit;
};

// We keep this function for backward compatibility
export const LoadSkia = LoadSkiaWeb;
