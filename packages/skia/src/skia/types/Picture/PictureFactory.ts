import type { SkData } from "../Data";

import type { SkPicture } from "./Picture";

export interface PictureFactory {
  /**
   * Returns an SkPicture which has been serialized previously to the given
   * bytes (see `SkPicture.serialize()`). Throws a `SkiaDecodeError` when they
   * are not a serialized picture.
   * @param bytes
   */
  Make(bytes: Uint8Array | ArrayBuffer | SkData): SkPicture;
  /** Returns a picture that draws nothing. */
  MakeEmpty(): SkPicture;
}
