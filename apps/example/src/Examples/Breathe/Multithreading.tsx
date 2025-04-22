import React from "react";
import { Canvas, Image, useClock } from "@shopify/react-native-skia";
import { Dimensions, View } from "react-native";

import { useDedicatedThread, useScheduler } from "./Thread";

const { width } = Dimensions.get("window");
const size = width / 2;

export const Multithreading = () => {
  const clock = useClock();
  const thread1 = useDedicatedThread(
    clock,
    (canvas) => {
      "worklet";
      canvas.drawColor(Float32Array.of(Math.random(), 0.6, 1, 1));
    },
    size,
    size
  );
  const thread2 = useDedicatedThread(
    clock,
    (canvas) => {
      "worklet";
      canvas.drawColor(Float32Array.of(Math.random(), 0, 1, 1));
    },
    size,
    size
  );
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
