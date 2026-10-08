import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  PixelRatio,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import type { SkImage, SkSurface } from "react-native-skia";
import { Canvas, Image, Skia } from "react-native-skia";
import { Text } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import {
  runOnJS,
  runOnUI,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const logMemoryStats = () => {
  "worklet";
  if (
    typeof HermesInternal !== "undefined" &&
    // @ts-expect-error - HermesInternal is available in Hermes runtime
    HermesInternal?.getInstrumentedStats
  ) {
    // // @ts-expect-error - HermesInternal is available in Hermes runtime
    // const stats = HermesInternal.getInstrumentedStats();
    // const externalMB = (stats.js_externalBytes / (1024 * 1024)).toFixed(2);
    // const totalAllocatedMB = (
    //   stats.js_totalAllocatedBytes /
    //   (1024 * 1024)
    // ).toFixed(2);
    // const heapSizeMB = (stats.js_heapSize / (1024 * 1024)).toFixed(2);
    // console.log(
    //   `External: ${externalMB} MB, Total Allocated: ${totalAllocatedMB} MB, Heap Size: ${heapSizeMB} MB`
    // );
  }
};

const drawFrame = (
  surface: SharedValue<SkSurface | null>,
  image: SharedValue<SkImage | null>,
  x: SharedValue<number>,
  pixelRatio: number
) => {
  "worklet";
  logMemoryStats();
  if (!surface.value) {
    Alert.alert("surface is null");
    return false;
  }
  const canvas = surface.value.getCanvas();
  const paint = Skia.Paint();
  paint.setColor(
    Float32Array.from([Math.random(), Math.random(), Math.random(), 1])
  );
  canvas.drawRect(
    {
      x: pixelRatio * x.value,
      y: 0,
      width: pixelRatio * 400,
      height: pixelRatio * 400,
    },
    paint
  );
  surface.value.flush();
  image.value = surface.value.makeImageSnapshot();
  return true;
};

function continueBlink(
  surface: SharedValue<SkSurface | null>,
  image: SharedValue<SkImage | null>,
  x: SharedValue<number>,
  looper: SharedValue<number>,
  blinkCnt: SharedValue<number>,
  isLeft: SharedValue<boolean>,
  pixelRatio: number,
  revert: (d: string) => void,
  shouldContinue: SharedValue<boolean>
) {
  "worklet";
  if (!shouldContinue.value) {
    return;
  }
  blinkCnt.value++;
  looper.value = withTiming(1 - looper.value, { duration: 10 }, () => {
    if (!shouldContinue.value) return;
    if (!drawFrame(surface, image, x, pixelRatio)) return;
    if (blinkCnt.value < 20) {
      continueBlink(
        surface,
        image,
        x,
        looper,
        blinkCnt,
        isLeft,
        pixelRatio,
        revert,
        shouldContinue
      );
    } else {
      if (!shouldContinue.value) return;
      runOnJS(revert)(isLeft.value ? "right" : "left");
      isLeft.value = !isLeft.value;
      blinkCnt.value = 0;
      x.value = withTiming(400 - x.value, { duration: 200 }, () => {
        if (!shouldContinue.value) return;
        continueBlink(
          surface,
          image,
          x,
          looper,
          blinkCnt,
          isLeft,
          pixelRatio,
          revert,
          shouldContinue
        );
      });
    }
  });
}

const startBlink = (
  surface: SharedValue<SkSurface | null>,
  image: SharedValue<SkImage | null>,
  x: SharedValue<number>,
  looper: SharedValue<number>,
  blinkCnt: SharedValue<number>,
  isLeft: SharedValue<boolean>,
  pixelRatio: number,
  revert: (d: string) => void,
  shouldContinue: SharedValue<boolean>
) => {
  "worklet";
  if (!shouldContinue.value) return;
  blinkCnt.value = 0;
  if (drawFrame(surface, image, x, pixelRatio)) {
    continueBlink(
      surface,
      image,
      x,
      looper,
      blinkCnt,
      isLeft,
      pixelRatio,
      revert,
      shouldContinue
    );
  }
};

const startAnimation = (
  surface: SharedValue<SkSurface | null>,
  image: SharedValue<SkImage | null>,
  x: SharedValue<number>,
  looper: SharedValue<number>,
  blinkCnt: SharedValue<number>,
  isLeft: SharedValue<boolean>,
  pixelRatio: number,
  revert: (d: string) => void,
  shouldContinue: SharedValue<boolean>
) => {
  "worklet";
  if (!surface.value) {
    surface.value = Skia.Surface.MakeOffscreen(
      pixelRatio * 800,
      pixelRatio * 400
    );
  }
  startBlink(
    surface,
    image,
    x,
    looper,
    blinkCnt,
    isLeft,
    pixelRatio,
    revert,
    shouldContinue
  );
};

export const StressTest4 = () => {
  console.log("state refreshed");
  const image = useSharedValue<SkImage | null>(null);
  const surface = useSharedValue<SkSurface | null>(null);
  const looper = useSharedValue(0);
  const x = useSharedValue(0);
  const pixelRatio = PixelRatio.get();
  const [direction, setDirection] = useState("left");
  const isLeft = useSharedValue(true);
  const blinkCnt = useSharedValue(0);
  const shouldContinue = useSharedValue(true);

  const imageX = useDerivedValue(() => -x.value);

  const handleStart = () => {
    shouldContinue.value = true;
    runOnUI(startAnimation)(
      surface,
      image,
      x,
      looper,
      blinkCnt,
      isLeft,
      pixelRatio,
      setDirection,
      shouldContinue
    );
  };

  useEffect(() => {
    // Stop animation on unmount
    return () => {
      shouldContinue.value = false;
    };
  }, [shouldContinue]);

  return (
    <SafeAreaView style={styles.container}>
      <Text>Direction: {direction}</Text>
      <Canvas
        style={{
          width: 400,
          height: 400,
          borderColor: "red",
          borderWidth: 1,
        }}
      >
        <Image image={image} width={800} height={400} x={imageX} />
      </Canvas>
      <Button onPress={handleStart} title="Start" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ecf0f1",
    padding: 8,
  },
});
