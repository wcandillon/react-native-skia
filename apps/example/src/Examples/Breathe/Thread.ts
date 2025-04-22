import { useCallback, useEffect, useMemo } from "react";
import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import {
  createWorkletRuntime,
  runOnJS,
  runOnRuntime,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

export const useDedicatedThread = (
  clock: SharedValue<number>,
  draw: (canvas: SkCanvas, time: number) => void,
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
  const initTexture = useCallback(() => {
    "worklet";
    console.log("callback to the JS thread");

    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) {
      return;
    }
    const canvas = surface.getCanvas();
    draw(canvas, clock.value);
    surface.flush();
    const result = surface.getNativeTextureUnstable();
    global.surface = surface;
    runOnJS(setTexture)(result);
  }, [clock.value, draw, height, setTexture, width]);
  useEffect(() => {
    runOnRuntime(runtime, initTexture)();
  }, [draw, initTexture, runtime]);

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
  const updateTextureOnThread = useCallback(() => {
    "worklet";
    const { surface } = global;
    if (!surface) {
      return;
    }
    const canvas = surface.getCanvas();
    draw(canvas, clock.value);
    surface.flush();
  }, [clock, draw]);
  const updateTexture = useCallback(() => {
    "worklet";
    runOnRuntime(runtime, updateTextureOnThread)();
  }, [updateTextureOnThread, runtime]);
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
