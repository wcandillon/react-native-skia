import type { SkPicture } from "./Picture";

export interface PictureFactory {
  /**
   * Returns an SkPicture which has been serialized previously to the given bytes.
   * @param bytes
   */
  Make(bytes: Uint8Array | ArrayBuffer | null): SkPicture | null;
}
