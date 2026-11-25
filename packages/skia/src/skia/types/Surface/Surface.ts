import type { SkImage } from "../Image";
import type { SkCanvas } from "../Canvas";
import type { SkJSIInstance } from "../JsiInstance";
import type { SkRect } from "../Rect";

export interface SkSurface extends SkJSIInstance<"Surface"> {
  /** Returns Canvas that draws into the surface. Subsequent calls return the
     same Canvas. Canvas returned is managed and owned by Surface, and is
     deleted when Surface is deleted.

      @return  drawing Canvas for Surface

      example: https://fiddle.skia.org/c/@Surface_getCanvas
  */
  getCanvas(): SkCanvas;

  /** Returns Image capturing Surface contents. Subsequent drawing to
     Surface contents are not captured.

      @param bounds A rectangle specifying the subset of the surface that
   is of interest.
      @param outputImage An image to update in place instead of returning a
   new one. It keeps its previous content when the snapshot cannot be
   created (e.g. `bounds` is outside of the surface).
      @return  Image initialized with Surface contents

      example: https://fiddle.skia.org/c/@Surface_makeImageSnapshot
  */
  makeImageSnapshot(bounds?: SkRect, outputImage?: SkImage): SkImage;

  /**
   * Returns an image sharing the texture of the surface, without a copy: a
   * canvas drawing it shows what the surface holds by the time the drawing
   * reaches the GPU. Call `flush()` on the surface after drawing into it and
   * before the frame that samples the image, and never draw the image onto
   * its own surface (use a second surface for a feedback loop).
   * `makeImageSnapshot()` makes a copy instead.
   *
   * On the Web, and for a CPU surface (`Skia.Surface.MakeRaster`), this is a
   * snapshot taken at call time.
   */
  asImage(): SkImage;

  /**
   * Make sure any queued draws are sent to the screen or the GPU.
   * @param sync - When true, block until the GPU has finished executing the
   * submitted work. Use this before a consumer on a different command queue
   * reads the texture this surface draws into (see
   * `Skia.Surface.MakeFromGPUTexture`). Defaults to false.
   */
  flush(sync?: boolean): void;

  /**
   * `flush()` as a promise: resolves once the GPU has run the draws, without
   * blocking the thread, and rejects when they were lost (`flush()` only
   * logs it). Await it before handing the texture this surface draws into
   * to a consumer that needs the draws in it: a video encoder, another
   * command queue (see `Skia.Surface.MakeFromGPUTexture`).
   *
   * The draws of all the GPU surfaces of a thread are recorded together and
   * submitted by the first call that needs them, so the promise covers the
   * draws pending on the thread, and an error may come from the draws of
   * another surface.
   *
   * It rejects when Graphite cannot record, insert or submit the draws, when
   * the GPU fails to run them, and when the GPU device of the surface is
   * lost, before the call or before the work is done (see `Skia.gpu.lost`).
   * This departs from `GPUQueue.onSubmittedWorkDone()` in WebGPU, which
   * resolves in these cases. While the app is in the background the GPU
   * work is held, and so is the promise (see `Skia.gpu.foreground`).
   *
   * A CPU surface (`Skia.Surface.MakeRaster`) resolves right away, as does
   * the Web.
   */
  flushAsync(): Promise<void>;

  /**
   * Returns the possibly scaled width of the surface.
   */
  width(): number;

  /**
   * Returns the possibly scaled height of the surface.
   */
  height(): number;
}
