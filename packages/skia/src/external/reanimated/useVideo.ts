import type { SharedValue, FrameInfo } from "react-native-reanimated";
import { useEffect, useMemo } from "react";

import type { SkImage, Video } from "../../skia/types";
import { Platform } from "../../Platform";

import Rea from "./ReanimatedProxy";
import { useVideoLoading } from "./useVideoLoading";

type MaybeAnimated<T> = SharedValue<T> | T;

interface PlaybackOptions {
  looping: MaybeAnimated<boolean>;
  paused: MaybeAnimated<boolean>;
  seek: MaybeAnimated<number | null>;
  volume: MaybeAnimated<number>;
}

const copyFrameOnAndroid = (currentFrame: SharedValue<SkImage | null>) => {
  "worklet";
  // on android we need to copy the texture before it's invalidated
  if (Platform.OS === "android") {
    const tex = currentFrame.value;
    if (tex) {
      currentFrame.value = tex.makeNonTextureImage();
      tex.dispose();
    }
  }
};

const setFrame = (video: Video, currentFrame: SharedValue<SkImage | null>) => {
  "worklet";
  const img = video.nextImage();
  if (img) {
    if (currentFrame.value) {
      currentFrame.value.dispose();
    }
    currentFrame.value = img;
    copyFrameOnAndroid(currentFrame);
  }
};

const defaultOptions = {
  looping: true,
  paused: false,
  seek: null,
  currentTime: 0,
  volume: 0,
};

const useOption = <T>(value: MaybeAnimated<T>) => {
  "worklet";
  // TODO: only create defaultValue is needed (via makeMutable)
  const defaultValue = Rea.useSharedValue(
    Rea.isSharedValue(value) ? value.value : value
  );
  return Rea.isSharedValue(value)
    ? (value as SharedValue<T>)
    : (defaultValue as SharedValue<T>);
};

const disposeVideo = (video: Video | null) => {
  "worklet";
  video?.dispose();
};

export const useVideo = (
  source: string | null,
  userOptions?: Partial<PlaybackOptions>
) => {
  const video = useVideoLoading(source);
  const isPaused = useOption(userOptions?.paused ?? defaultOptions.paused);
  const looping = useOption(userOptions?.looping ?? defaultOptions.looping);
  const seek = useOption(userOptions?.seek ?? defaultOptions.seek);
  const volume = useOption(userOptions?.volume ?? defaultOptions.volume);
  const currentFrame = Rea.useSharedValue<null | SkImage>(null);
  const currentTime = Rea.useSharedValue(0);
  const lastTimestamp = Rea.useSharedValue(-1);
  const duration = useMemo(() => video?.duration() ?? 0, [video]);
  const framerate = useMemo(
    () => (Platform.OS === "web" ? -1 : video?.framerate() ?? 0),
    [video]
  );
  const size = useMemo(() => video?.size() ?? { width: 0, height: 0 }, [video]);
  const rotation = useMemo(() => video?.rotation() ?? 0, [video]);
  const frameDuration = 1000 / framerate;
  const currentFrameDuration = Math.floor(frameDuration);
  Rea.useAnimatedReaction(
    () => isPaused.value,
    (paused) => {
      if (paused) {
        video?.pause();
      } else {
        lastTimestamp.value = -1;
        video?.play();
      }
    }
  );
  Rea.useAnimatedReaction(
    () => seek.value,
    (value) => {
      if (value !== null) {
        video?.seek(value);
        currentTime.value = value;
        seek.value = null;
      }
    }
  );
  Rea.useAnimatedReaction(
    () => volume.value,
    (value) => {
      video?.setVolume(value);
    }
  );
  Rea.useFrameCallback((frameInfo: FrameInfo) => {
    "worklet";
    if (!video) {
      return;
    }
    if (isPaused.value) {
      return;
    }
    const currentTimestamp = frameInfo.timestamp;
    if (lastTimestamp.value === -1) {
      lastTimestamp.value = currentTimestamp;
    }
    const delta = currentTimestamp - lastTimestamp.value;

    const isOver = currentTime.value + delta > duration;
    if (isOver && looping.value) {
      seek.value = 0;
      currentTime.value = seek.value;
      lastTimestamp.value = currentTimestamp;
    }
    // On Web the framerate is uknown.
    // This could be optimized by using requestVideoFrameCallback (Chrome only)
    if ((delta >= currentFrameDuration && !isOver) || Platform.OS === "web") {
      setFrame(video, currentFrame);
      currentTime.value += delta;
      lastTimestamp.value = currentTimestamp;
    }
  });

  useEffect(() => {
    return () => {
      // TODO: should video simply be a shared value instead?
      Rea.runOnUI(disposeVideo)(video);
    };
  }, [video]);

  return {
    currentFrame,
    currentTime,
    duration,
    framerate,
    rotation,
    size,
  };
};
