// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import type {
  CanvasKit as CanvasKitType,
  CanvasKitInitOptions,
} from "canvaskit-wasm";

declare global {
  var CanvasKit: CanvasKitType;
}

let ckSharedPromise: Promise<CanvasKitType> | undefined;

// The glue (canvaskit.js) and the binary (canvaskit.wasm) are only compatible
// within one canvaskit-wasm release. Paired across releases, the binary can
// still link, but the glue then reads the exports under stale names and the
// embind classes are never registered: CanvasKitInit resolves with an object
// that has none of them, and the first draw throws "PictureRecorder is not a
// constructor" from a worklet, out of reach of any error boundary. Checking a
// couple of classes here surfaces the mismatch at load time instead.
const isUsableCanvasKit = (CanvasKit: unknown): CanvasKit is CanvasKitType =>
  typeof CanvasKit === "object" &&
  CanvasKit !== null &&
  typeof (CanvasKit as CanvasKitType).PictureRecorder === "function" &&
  typeof (CanvasKit as CanvasKitType).Paint === "function";

export const LoadSkiaWeb = async (opts?: CanvasKitInitOptions) => {
  if (global.CanvasKit !== undefined) {
    return;
  }
  ckSharedPromise = ckSharedPromise ?? CanvasKitInit(opts);
  let CanvasKit: unknown;
  try {
    CanvasKit = await ckSharedPromise;
  } catch (error) {
    // Don't cache the rejection: the next call (a retry after a network
    // failure, or a reload of a stale cached binary) gets a fresh attempt
    // instead of the first failure forever.
    ckSharedPromise = undefined;
    throw error;
  }
  if (!isUsableCanvasKit(CanvasKit)) {
    ckSharedPromise = undefined;
    throw new Error(
      "CanvasKit initialized without its bindings: canvaskit.js and canvaskit.wasm are probably from different versions"
    );
  }
  // The CanvasKit API is stored on the global object and used
  // to create the JsiSKApi in the Skia.web.ts file.
  global.CanvasKit = CanvasKit;
};

// We keep this function for backward compatibility
export const LoadSkia = LoadSkiaWeb;
