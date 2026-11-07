import type {
  SkPicture,
  SkPictureRecorder,
  SkSurface,
} from "../../../../skia/types";

// What the device harness hands an eval'd body as `ctx.workletThread`: the
// example's app-side worklets, which apps/example/src/Tests/workletThread.ts
// types with it.

// When a call started and returned, by Date.now().
export interface CallTimes {
  started: number;
  ended: number;
}

export interface WorkletThread {
  makeRasterSurface(width: number, height: number): Promise<SkSurface>;
  disposeDuring(
    surface: SkSurface,
    delay: number,
    draw: () => void
  ): Promise<{ draw: CallTimes; dispose: CallTimes }>;
  finishRecordingDuring(
    recorder: SkPictureRecorder,
    delay: number,
    draw: () => void
  ): Promise<{ draw: CallTimes; finish: CallTimes; picture: SkPicture }>;
}
