import type { SkData } from "../Data";

import type { SkAnimatedImage } from "./AnimatedImage";

export interface AnimatedImageFactory {
  /**
   * Decodes the given bytes into an animated image. Returns null if the bytes were invalid.
   * The passed in bytes will be copied into the WASM heap, so the caller can dispose of them.
   *
   * The returned AnimatedImage will be "pointing to" the first frame, i.e. currentFrameDuration
   * and makeImageAtCurrentFrame will be referring to the first frame.
   * @param encoded
   */
  MakeFromEncoded: (encoded: SkData) => SkAnimatedImage | null;
}
