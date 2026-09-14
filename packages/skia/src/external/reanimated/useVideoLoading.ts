import { useCallback, useEffect, useState } from "react";
import type { WorkletRuntime } from "react-native-reanimated";

import type { Video } from "../../skia/types";
import { Skia } from "../../skia";

import Rea from "./ReanimatedProxy";

// Created lazily: accessing the proxy at module scope would require
// react-native-reanimated as soon as the package is imported, and would spawn
// the runtime even for apps that never load a video.
let runtime: WorkletRuntime | undefined;
const getRuntime = () => {
  if (runtime === undefined) {
    runtime = Rea.createWorkletRuntime("video-metadata-runtime");
  }
  return runtime;
};

type VideoSource = string | null;

export const useVideoLoading = (source: VideoSource) => {
  const { runOnJS } = Rea;
  const [video, setVideo] = useState<Video | null>(null);
  const cb = useCallback(
    (src: string) => {
      "worklet";
      const vid = Skia.Video(src) as Video;
      runOnJS(setVideo)(vid);
    },
    [runOnJS]
  );
  useEffect(() => {
    if (source) {
      Rea.runOnRuntime(getRuntime(), cb)(source);
    }
  }, [cb, source]);
  return video;
};
