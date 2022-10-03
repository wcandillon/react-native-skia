import type { FilterMode } from "../Image";
import type { TileMode } from "../ImageFilter";
import type { SkRect } from "../Rect";
import type { SkShader } from "../Shader";
import type { SkMatrix } from "../Matrix";
import type { SkJSIInstance } from "../JsiInstance";

export interface SkPicture extends SkJSIInstance<"Picture"> {
  /**
   *  Returns a new shader that will draw with this picture.
   *
   *  @param tmx  The tiling mode to use when sampling in the x-direction.
   *  @param tmy  The tiling mode to use when sampling in the y-direction.
   *  @param mode How to filter the tiles
   *  @param localMatrix Optional matrix used when sampling
   *  @param tileRect The tile rectangle in picture coordinates: this represents the subset
   *              (or superset) of the picture used when building a tile. It is not
   *              affected by localMatrix and does not imply scaling (only translation
   *              and cropping). If null, the tile rect is considered equal to the picture
   *              bounds.
   */
  makeShader(
    tmx: TileMode,
    tmy: TileMode,
    mode: FilterMode,
    localMatrix?: SkMatrix,
    tileRect?: SkRect
  ): SkShader;

  /**
   * Returns the serialized format of this SkPicture. The format may change at anytime and
   * no promises are made for backwards or forward compatibility.
   */
  serialize(): Uint8Array | null;
}
