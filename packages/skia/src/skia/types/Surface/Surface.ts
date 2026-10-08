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
   * On the Web, and for a CPU surface (`Skia.Surface.Make`), this is a
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
   * Returns the possibly scaled width of the surface.
   */
  width(): number;

  /**
   * Returns the possibly scaled height of the surface.
   */
  height(): number;
}
