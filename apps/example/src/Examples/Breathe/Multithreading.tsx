import React, { useCallback, useEffect, useMemo } from "react";
import type { SkCanvas, SkImage } from "@shopify/react-native-skia";
import {
  AlphaType,
  Canvas,
  ColorType,
  Fill,
  Image,
  Skia,
  useClock,
} from "@shopify/react-native-skia";
import { Dimensions, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  createWorkletRuntime,
  runOnJS,
  runOnRuntime,
  runOnUI,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const size = width / 2;

const useDedicatedThread = (
  clock: SharedValue<number>,
  draw: (canvas: SkCanvas, time: number) => void
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

    const surface = Skia.Surface.MakeOffscreen(size, size);
    if (!surface) {
      return;
    }
    const canvas = surface.getCanvas();
    draw(canvas, clock.value);
    surface.flush();
    const result = surface.getNativeTextureUnstable();
    global.surface = surface;
    runOnJS(setTexture)(result);
  }, [clock.value, draw, setTexture]);
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
      size,
      size
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

const useScheduler = (...threads: { updateTexture: () => void }[]) => {
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

export const Multithreading = () => {
  const clock = useClock();
  const thread1 = useDedicatedThread(clock, (canvas) => {
    "worklet";
    canvas.drawColor(Float32Array.of(Math.random(), 0.6, 1, 1));
  });
  const thread2 = useDedicatedThread(clock, (canvas) => {
    "worklet";
    canvas.drawColor(Float32Array.of(Math.random(), 0, 1, 1));
  });
  useScheduler(thread1, thread2);
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }}>
        <Image image={thread1.image} x={0} y={0} width={size} height={size} />
        <Image
          image={thread2.image}
          x={size}
          y={0}
          width={size}
          height={size}
        />
      </Canvas>
    </View>
  );
};
