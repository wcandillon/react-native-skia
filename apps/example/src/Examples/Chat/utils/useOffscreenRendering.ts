import {
  type SkCanvas,
  type SkImage,
  type SkSurface,
  Skia,
  rect,
} from "@shopify/react-native-skia";
import { useCallback, useEffect, useMemo } from "react";
import { PixelRatio } from "react-native";
import {
  type SharedValue,
  runOnUI,
  useSharedValue,
} from "react-native-reanimated";

import { WINDOW_HEIGHT, WINDOW_WIDTH } from "../constants";

const { MakeOffscreen } = Skia.Surface;
const ratio = PixelRatio.get();

interface OffscreenCanvasState {
  isSetup: boolean;
  canvas?: SkCanvas;
  surface?: SkSurface;
}

const bounds = rect(0, 0, WINDOW_WIDTH * ratio, WINDOW_HEIGHT * ratio);

export function useOffscreenCanvas(
  callback: (
    ctx: SkCanvas,
    state: {
      forceRerender: boolean;
    }
  ) => boolean,
  {
    width = WINDOW_WIDTH,
    height = WINDOW_HEIGHT,
    scale = ratio,
  }: {
    debugLabel?: string;
    width?: number;
    height?: number;
    scale?: number;
  } = {}
): [SharedValue<SkImage | null>, () => void] {
  const texture = useSharedValue<SkImage | null>(null);
  const running = useSharedValue(true);
  const surfaceParams = useMemo(
    () => ({
      width: Math.floor(width * scale),
      height: Math.floor(height * scale),
      scale,
    }),
    [scale, height, width]
  );

  const uiState = useMemo<OffscreenCanvasState>(
    () => ({
      isSetup: false,
    }),
    []
  );

  const renderLoop = useCallback(() => {
    "worklet";

    const state = uiState;
    if (!state.isSetup) {
      const surface = MakeOffscreen(surfaceParams.width, surfaceParams.height);
      if (!surface) {
        return;
      }

      const canvas = surface.getCanvas();
      canvas.scale(surfaceParams.scale, surfaceParams.scale);

      state.isSetup = true;
      uiState.canvas = canvas;
      uiState.surface = surface;
    }

    const { surface, canvas } = state;

    const shouldUpdate = callback(canvas!, {
      forceRerender: false,
    });

    if (shouldUpdate) {
      // dispose the previous texture so we don't leak memory
      const previousTexture = texture.value;
      texture.value = surface!.makeImageSnapshot(bounds);
      previousTexture?.dispose();
    }
  }, [uiState, callback, surfaceParams, texture]);

  const stopOffscreenRendering = useCallback(() => {
    "worklet";

    running.value = false;

    texture.value?.dispose();
    texture.value = null;

    if (uiState.isSetup) {
      uiState.surface?.dispose();
    }
  }, [running, texture, uiState]);

  useEffect(() => {
    runOnUI(() => {
      "worklet";

      const frame = () => {
        "worklet";
        if (!running.value) {
          return;
        }

        renderLoop();

        global.requestAnimationFrame(frame);
      };

      frame();
    })();

    return () => {
      runOnUI(stopOffscreenRendering)();
    };
  }, [renderLoop, texture, stopOffscreenRendering, running]);

  return [texture, stopOffscreenRendering];
}
