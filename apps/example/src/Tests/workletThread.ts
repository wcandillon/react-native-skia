import type {
  SkPicture,
  SkPictureRecorder,
  SkSurface,
} from "react-native-skia";
import { Skia } from "react-native-skia";
import type {
  CallTimes,
  WorkletThread,
} from "react-native-skia/src/renderer/__tests__/e2e/setup/WorkletThread";
import type { WorkletRuntime } from "react-native-worklets";
import {
  createSynchronizable,
  createWorkletRuntime,
  runOnRuntime,
  scheduleOnRN,
} from "react-native-worklets";

// Test-harness helpers that use a Skia object on a worklet runtime, on a
// thread of its own, while the JS thread draws with it (see packages/skia
// Surfaces.spec.tsx and Picture.spec.tsx). They live in app code, not in an
// eval'd test body: the "worklet" directive only works when the babel
// worklets plugin compiles it into the app bundle.

// Not the serializer helpers' runtime, which must stay one nothing was made
// on.
let runtime: WorkletRuntime | null = null;
const getRuntime = () => {
  if (runtime === null) {
    runtime = createWorkletRuntime({ name: "SkiaWorkletThreadRuntime" });
  }
  return runtime;
};

// How long either side waits for the other before the case fails.
const handOverLimit = 10000;

const waitUntil = (time: number) => {
  "worklet";
  while (Date.now() < time) {
    // The JS thread draws meanwhile.
  }
};

const waitForDraw = (drawing: { getBlocking(): boolean }) => {
  "worklet";
  const limit = Date.now() + handOverLimit;
  while (!drawing.getBlocking()) {
    if (Date.now() > limit) {
      throw new Error("the JS thread never started its draw");
    }
  }
};

// Runs `draw` on the JS thread once the worklet's job is waiting for it, so
// that the job's `delay` counts from the start of the draw however late the
// worklet's thread picked the job up.
const drawWhenWaiting = (
  waiting: { getBlocking(): boolean },
  drawing: { setBlocking(value: boolean): void },
  draw: () => void
): CallTimes => {
  const limit = Date.now() + handOverLimit;
  while (!waiting.getBlocking()) {
    if (Date.now() > limit) {
      throw new Error("the worklet runtime never picked up its job");
    }
  }
  drawing.setBlocking(true);
  const started = Date.now();
  draw();
  return { started, ended: Date.now() };
};

export const workletThread: WorkletThread = {
  // A raster surface made on the worklet's thread, which destroys it in
  // dispose() there.
  makeRasterSurface: (width: number, height: number): Promise<SkSurface> =>
    new Promise((resolve, reject) => {
      const done = (surface: SkSurface) => resolve(surface);
      const fail = (message: string) => reject(new Error(message));
      runOnRuntime(
        getRuntime(),
        (surfaceWidth: number, surfaceHeight: number) => {
          "worklet";
          try {
            scheduleOnRN(
              done,
              Skia.Surface.MakeRaster(surfaceWidth, surfaceHeight)!
            );
          } catch (error) {
            scheduleOnRN(fail, String(error));
          }
        }
      )(width, height);
    }),

  // Disposes `surface` on the worklet's thread `delay` ms into `draw`, which
  // runs on the JS thread.
  disposeDuring: (
    surface: SkSurface,
    delay: number,
    draw: () => void
  ): Promise<{ draw: CallTimes; dispose: CallTimes }> =>
    new Promise((resolve, reject) => {
      const waiting = createSynchronizable(false);
      const drawing = createSynchronizable(false);
      let drawTimes: CallTimes | null = null;
      const done = (dispose: CallTimes) =>
        resolve({ draw: drawTimes!, dispose });
      const fail = (message: string) => reject(new Error(message));
      runOnRuntime(getRuntime(), (target: SkSurface, wait: number) => {
        "worklet";
        try {
          waiting.setBlocking(true);
          waitForDraw(drawing);
          waitUntil(Date.now() + wait);
          const started = Date.now();
          target.dispose();
          scheduleOnRN(done, { started, ended: Date.now() });
        } catch (error) {
          scheduleOnRN(fail, String(error));
        }
      })(surface, delay);
      drawTimes = drawWhenWaiting(waiting, drawing, draw);
    }),

  // Finishes the recording of `recorder` on the worklet's thread `delay` ms
  // into `draw`, which runs on the JS thread.
  finishRecordingDuring: (
    recorder: SkPictureRecorder,
    delay: number,
    draw: () => void
  ): Promise<{ draw: CallTimes; finish: CallTimes; picture: SkPicture }> =>
    new Promise((resolve, reject) => {
      const waiting = createSynchronizable(false);
      const drawing = createSynchronizable(false);
      let drawTimes: CallTimes | null = null;
      const done = (finish: CallTimes, picture: SkPicture) =>
        resolve({ draw: drawTimes!, finish, picture });
      const fail = (message: string) => reject(new Error(message));
      runOnRuntime(getRuntime(), (target: SkPictureRecorder, wait: number) => {
        "worklet";
        try {
          waiting.setBlocking(true);
          waitForDraw(drawing);
          waitUntil(Date.now() + wait);
          const started = Date.now();
          const picture = target.finishRecordingAsPicture();
          scheduleOnRN(done, { started, ended: Date.now() }, picture);
        } catch (error) {
          scheduleOnRN(fail, String(error));
        }
      })(recorder, delay);
      drawTimes = drawWhenWaiting(waiting, drawing, draw);
    }),
};
