import { Skia } from "../Skia";
import type { DataSourceParam } from "../types";

import { useRawData } from "./Data";

const animatedImgFactory = Skia.AnimatedImage.MakeFromEncoded.bind(
  Skia.AnimatedImage
);

/**
 * Returns a Skia Animated Image object
 * */
export const useAnimatedImage = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, animatedImgFactory, onError);
