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
      const copy = tex.makeNonTextureImage();
      if (copy) {
        currentFrame.value = copy;
        tex.dispose();
      }
      // If copy fails, keep the original frame rather than showing black
    }
  }
};

const setFrame = (video: Video, currentFrame: SharedValue<SkImage | null>) => {
  "worklet";
  const img = video.nextImage();
  if (img) {
    currentFrame.value?.dispose();
    currentFrame.value = img;
    copyFrameOnAndroid(currentFrame);
  }
};

const defaultOptions = {
  looping: true,
  paused: false,
  seek: null,
  volume: 0,
};

const useOption = <T>(value: MaybeAnimated<T>) => {
  "worklet";
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
  const duration = useMemo(() => video?.duration() ?? 0, [video]);
  const framerate = useMemo(
    () => (Platform.OS === "web" ? -1 : (video?.framerate() ?? 0)),
    [video]
  );
  const size = useMemo(() => video?.size() ?? { width: 0, height: 0 }, [video]);
  const rotation = useMemo(() => video?.rotation() ?? 0, [video]);

  // Handle pause/play state changes
  Rea.useAnimatedReaction(
    () => isPaused.value,
    (paused) => {
      if (paused) {
        video?.pause();
      } else {
        video?.play();
      }
    }
  );

  // Handle seek
  Rea.useAnimatedReaction(
    () => seek.value,
    (value) => {
      if (value !== null) {
        video?.seek(value);
        seek.value = null;
      }
    }
  );

  // Handle volume changes
  Rea.useAnimatedReaction(
    () => volume.value,
    (value) => {
      video?.setVolume(value);
    }
  );

  // Handle looping changes
  Rea.useAnimatedReaction(
    () => looping.value,
    (value) => {
      video?.setLooping(value);
    }
  );

  // Frame callback - simplified since native handles frame timing
  Rea.useFrameCallback((_frameInfo: FrameInfo) => {
    "worklet";
    if (!video) {
      return;
    }
    // Update current time from native player
    currentTime.value = video.currentTime();
    // Get the latest frame (native handles timing via CADisplayLink/etc)
    setFrame(video, currentFrame);
  });

  // Apply initial state when video becomes available
  useEffect(() => {
    if (video) {
      video.setLooping(looping.value);
      video.setVolume(volume.value);
      if (isPaused.value) {
        video.pause();
      } else {
        video.play();
      }
    }
    return () => {
      Rea.runOnUI(disposeVideo)(video);
    };
  }, [video, isPaused, looping, volume]);

  return {
    currentFrame,
    currentTime,
    duration,
    framerate,
    rotation,
    size,
  };
};
