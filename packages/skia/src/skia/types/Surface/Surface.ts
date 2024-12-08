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

  /**
   * Returns the backend texture of the surface.
   * The returned object can be used to create a Skia Image object.
   * The returned object is backend specific and should be used with caution.
   * It is the caller's responsibility to ensure that the texture is not used after the surface is deleted
   * or draw operations are performed on the surface.
   * The returned object may be null if the surface does not have a backend texture.
   *
   * @return backend texture of the surface or null
   */
  getNativeTextureUnstable(): unknown;

  /** Returns Image capturing Surface contents. Subsequent drawing to
     Surface contents are not captured.

      @param bounds A rectangle specifying the subset of the surface that
   is of interest.
      @return  Image initialized with Surface contents

      example: https://fiddle.skia.org/c/@Surface_makeImageSnapshot
  */
  makeImageSnapshot(bounds?: SkRect): SkImage;

  /**
   * Make sure any queued draws are sent to the screen or the GPU.
   */
  flush(): void;

  /**
   * Returns the possibly scaled width of the surface.
   */
  width(): number;

  /**
   * Returns the possibly scaled height of the surface.
   */
  height(): number;
}
