import type { SkCanvas, SkShader } from "../../skia/types";

/**
 * Experimental, for the recorder benchmark (apps/docs/docs/_recorder-
 * benchmark.md): the allocation free drawing path the benchmark compares
 * the native recorder against. The native side is
 * cpp/api/experimental/JsiSkExperimental.h. Not part of the public API.
 */

/**
 * Drawing operations encoded as opcodes and float operands in native memory
 * (see cpp/api/experimental/CommandBuffer.h), written through the
 * Float32Array that wraps `getBuffer()` and replayed by the render thread.
 */
export interface ExperimentalCommandBuffer {
  /**
   * An ArrayBuffer over the native memory, for the calling runtime: call it
   * on the runtime that writes, a worklet included. react-native-worklets
   * copies an ArrayBuffer it serializes, so the ArrayBuffer itself must not
   * be captured by a worklet; this object can be, it is a native object.
   */
  getBuffer(): ArrayBuffer;
  /**
   * Publishes the first `count` floats as the commands to replay and asks
   * the view the buffer is the content of for a frame.
   */
  commit(count: number): void;
  getCapacity(): number;
  /** The address of the native memory, the same from every runtime. */
  getDataAddress(): number;
  /** A float read by native code. */
  readFloat(index: number): number;
  /** Replays the committed commands on a canvas, on the calling thread. */
  replay(canvas: SkCanvas): void;
  dispose(): void;
}

export interface ExperimentalApi {
  createPaint(): number;
  registerShader(shader: SkShader): number;
  setColor(paint: number, argb: number): void;
  setAlpha(paint: number, alpha: number): void;
  setStrokeWidth(paint: number, width: number): void;
  /** 0 fills, 1 strokes. */
  setStyle(paint: number, style: number): void;
  /** A shader handle from registerShader(), or -1 for none. */
  setShader(paint: number, shader: number): void;
  /** The canvas the scalar calls below draw on, for the calling thread. */
  bindCanvas(canvas: SkCanvas): void;
  unbindCanvas(): void;
  save(): void;
  restore(): void;
  /** The affine matrix [a c e; b d f; 0 0 1], as canvas 2D's transform(). */
  concat(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void;
  clipRect(left: number, top: number, right: number, bottom: number): void;
  clear(argb: number): void;
  drawCircle(cx: number, cy: number, r: number, paint: number): void;
  drawRect(
    left: number,
    top: number,
    right: number,
    bottom: number,
    paint: number
  ): void;
  makeCommandBuffer(capacity: number): ExperimentalCommandBuffer;
  /**
   * Makes the buffer the content of a view: interpreted on the deferred
   * canvas of its target on every frame, or through a picture made again
   * when the buffer is committed. False when the view has not registered.
   */
  setViewContent(
    nativeId: number,
    buffer: ExperimentalCommandBuffer,
    asPicture: boolean
  ): boolean;
  clearViewContent(nativeId: number): boolean;
}

declare global {
  var __RNSkiaExperimental: ExperimentalApi | undefined;
}

/** The opcodes of a command buffer, see cpp/api/experimental/CommandBuffer.h. */
export const CommandOp = {
  End: 0,
  Save: 1,
  Restore: 2,
  /** a b c d e f */
  Concat: 3,
  /** left top right bottom */
  ClipRect: 4,
  /** cx cy r paint */
  DrawCircle: 5,
  /** left top right bottom paint */
  DrawRect: 6,
  /** paint alpha */
  SetAlpha: 7,
  /** paint r g b a */
  SetColor: 8,
  /** paint */
  DrawPaint: 9,
} as const;

export const getExperimentalApi = () => {
  const api = globalThis.__RNSkiaExperimental;
  if (api === undefined) {
    throw new Error(
      "__RNSkiaExperimental is not installed: rebuild the app with this " +
        "version of react-native-skia (native only)."
    );
  }
  return api;
};
