import React from "react";
import { Canvas, Image } from "@shopify/react-native-skia";
import { Dimensions, View } from "react-native";

import { useDedicatedThreads } from "./Thread";

const { width } = Dimensions.get("window");
const size = width / 2;

export const Multithreading = () => {
  const images = useDedicatedThreads(
    [
      (canvas, time) => {
        "worklet";
        console.log({ time });
        canvas.drawColor(
          Float32Array.of(Math.random(), Math.random(), Math.random(), 1)
        );
      },
      (canvas, time) => {
        "worklet";
        console.log({ time });
        canvas.drawColor(
          Float32Array.of(Math.random(), Math.random(), Math.random(), 1)
        );
      },
    ],
    size,
    size
  );
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }}>
        <Image image={images[0].image} x={0} y={0} width={size} height={size} />
        <Image
          image={images[1].image}
          x={size}
          y={0}
          width={size}
          height={size}
        />
      </Canvas>
    </View>
  );
};
