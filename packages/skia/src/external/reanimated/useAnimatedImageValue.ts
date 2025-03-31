import type { FrameInfo, SharedValue } from "react-native-reanimated";

import { useAnimatedImage } from "../../skia/core/AnimatedImage";
import type { DataSourceParam, SkImage } from "../../skia/types";

import Rea from "./ReanimatedProxy";

const DEFAULT_FRAME_DURATION = 60;

export const useAnimatedImageValue = (
  source: DataSourceParam,
  paused?: SharedValue<boolean>
) => {
  const defaultPaused = Rea.useSharedValue(false);
  const isPaused = paused ?? defaultPaused;
  const currentFrame = Rea.useSharedValue<null | SkImage>(null);
  const lastTimestamp = Rea.useSharedValue(-1);
  const animatedImage = useAnimatedImage(source, (err) => {
    console.error(err);
    throw new Error(`Could not load animated image - got '${err.message}'`);
  });
  const frameDuration =
    animatedImage?.currentFrameDuration() || DEFAULT_FRAME_DURATION;

  Rea.useFrameCallback((frameInfo: FrameInfo) => {
    if (!animatedImage) {
      currentFrame.value = null;
      return;
    }
    if (isPaused.value && lastTimestamp.value !== -1) {
      return;
    }
    const { timestamp } = frameInfo;
    const elapsed = timestamp - lastTimestamp.value;

    // Check if it's time to switch frames based on GIF frame duration
    if (elapsed < frameDuration) {
      return;
    }

    // Update the current frame
    animatedImage.decodeNextFrame();
    const oldFrame = currentFrame.value;
    currentFrame.value = animatedImage.getCurrentFrame();
    if (oldFrame) {
      oldFrame.dispose();
    }

    // Update the last timestamp
    lastTimestamp.value = timestamp;
  });
  return currentFrame;
};
