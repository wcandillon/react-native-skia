import React, { useEffect, useRef } from "react";
import { gpu, SkiaDomView } from "@shopify/react-native-skia";

import { demo3 } from "./demo3";
import { demo2 } from "./demo2";
import { demo1 } from "./demo1/main";

const draw = async (context: GPUCanvasContext) => {
  const adapter = await gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const presentationFormat = "rgba8unorm";
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });
  await demo1(device, context);
  context.present();
};

export const Breathe = () => {
  const ref = useRef<SkiaDomView>(null);
  useEffect(() => {
    setTimeout(() => {
      const ctx = ref.current!.getWGPUContext();

      draw(ctx);
    }, 1000);
  }, []);
  return <SkiaDomView style={{ flex: 1 }} ref={ref} />;
};
