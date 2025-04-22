import { useCallback, useEffect, useMemo } from "react";
import type { SkCanvas, SkSurface } from "@shopify/react-native-skia";
import { Skia, useClock } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  createWorkletRuntime,
  runOnJS,
  runOnRuntime,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

declare global {
  var surface: SkSurface | null;
}

type DrawingCallback = (canvas: SkCanvas, time: number) => void;

export const useDedicatedThread = (
  clock: SharedValue<number>,
  draw: DrawingCallback,
  width: number,
  height: number
) => {
  const runtime = useMemo(() => createWorkletRuntime("runtime1"), []);
  const texture = useSharedValue<unknown | null>(null);
  const setTexture = useCallback(
    (tex: unknown) => {
      texture.value = tex;
    },
    [texture]
  );
  const initTexture = useCallback(
    (time: number) => {
      "worklet";
      console.log("callback to the JS thread");

      const surface = Skia.Surface.MakeOffscreen(width, height);
      if (!surface) {
        return;
      }
      const canvas = surface.getCanvas();
      draw(canvas, time);
      surface.flush();
      const result = surface.getNativeTextureUnstable();
      global.surface = surface;
      runOnJS(setTexture)(result);
    },
    [draw, height, setTexture, width]
  );
  useEffect(() => {
    runOnRuntime(runtime, initTexture)(clock.value);
  }, [clock, draw, initTexture, runtime]);

  const image = useDerivedValue(() => {
    "worklet";
    if (!texture.value || !clock.value) {
      return null;
    }
    return Skia.Image.MakeImageFromNativeTextureUnstable(
      texture.value,
      width,
      height
    );
  });
  const updateTextureOnThread = useCallback(
    (time: number) => {
      "worklet";
      const { surface } = global;
      if (!surface) {
        return;
      }
      const canvas = surface.getCanvas();
      draw(canvas, time);
      surface.flush();
    },
    [draw]
  );
  const updateTexture = useCallback(() => {
    "worklet";
    runOnRuntime(runtime, updateTextureOnThread)(clock.value);
  }, [runtime, updateTextureOnThread, clock]);
  return { image, updateTexture };
};

export const useScheduler = (...threads: { updateTexture: () => void }[]) => {
  useEffect(() => {
    function frame() {
      threads.forEach((thread) => {
        thread.updateTexture();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, threads);
};

export const useDedicatedThreads = (
  callbacks: DrawingCallback[],
  width: number,
  height: number
) => {
  const clock = useClock();
  const threads = new Array(callbacks.length);
  for (let i = 0; i < threads.length; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    threads[i] = useDedicatedThread(clock, callbacks[i], width, height);
  }
  useScheduler(...threads);
  return threads;
};
