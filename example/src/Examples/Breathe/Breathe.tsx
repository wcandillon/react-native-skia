import React, { useEffect, useRef, useState } from "react";
import { gpu, SkiaDomView, useImage } from "@shopify/react-native-skia";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { demo3 } from "./demo3";
import { demo2 } from "./demo2";
import { demo1 } from "./demo1/main";
import { demo4 } from "./demo1/demo4";
import { demo5 } from "./demo1/demo5";
import { Bitmap, demo7 } from "./demo1/demo7";
import { demo6 } from "./demo6/main";

const sf = 300;
const springConfig = (velocity: number) => {
  "worklet";
  return {
    mass: 1,
    damping: 1,
    stiffness: 100,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
    velocity,
  };
};
//import { demo6 } from "./demo6/main";

const draw = async (
  context: GPUCanvasContext,
  image: Bitmap,
  rotateX: SharedValue<number>,
  rotateY: SharedValue<number>
) => {
  const adapter = await gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const presentationFormat = "rgba8unorm";
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });
  //await demo5(device, context, image);
  await demo7(device, context, image, rotateX, rotateY);
  //context.present();
};

const usePixels = (mod: number) => {
  const image = useImage(mod);
  if (!image) {
    return null;
  }
  return new Bitmap(
    image.readPixels() as Uint8Array,
    image.width(),
    image.height()
  );
};

export const Breathe = () => {
  const image = usePixels(require("./demo6/react.png"));
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const ref = useRef<SkiaDomView>(null);
  const gesture = Gesture.Pan()
    .onChange((event) => {
      rotateY.value += event.changeX / sf;
      rotateX.value -= event.changeY / sf;
    })
    .onEnd(({ velocityX, velocityY }) => {
      rotateX.value = withSpring(0, springConfig(velocityY / sf));
      rotateY.value = withSpring(0, springConfig(velocityX / sf));
    });
  useEffect(() => {
    setTimeout(() => {
      if (image && ref.current) {
        const ctx = ref.current.getWGPUContext();
        draw(ctx, image, rotateX, rotateY);
      }
    }, 1000);
  }, [image]);
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <SkiaDomView style={{ flex: 1 }} ref={ref} />
      </GestureDetector>
    </View>
  );
};
