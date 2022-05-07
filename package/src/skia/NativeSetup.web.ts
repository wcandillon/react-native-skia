// Setup CanvasKit for use in the browser.
import type { CanvasKit } from "canvaskit-wasm";
import CanvasKitInit from "canvaskit-wasm";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const canvasKitPromise: Promise<CanvasKit> = CanvasKitInit({
  locateFile: (file: string): string => {
    return `https://unpkg.com/canvaskit-wasm@0.33.0/bin/${file}`;
  },
});

export const canvasKit: { current: CanvasKit | undefined } = {
  current: undefined,
};

const setupCanvasKit = () =>
  canvasKitPromise.then((ck: CanvasKit) => {
    console.log("CanvasKit loaded successfully.");
    canvasKit.current = ck;
  });

setupCanvasKit();
