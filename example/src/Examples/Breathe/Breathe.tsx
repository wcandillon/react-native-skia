import React, { useEffect, useRef } from "react";
import { gpu, SkiaDomView, useImage } from "@shopify/react-native-skia";

import { demo3 } from "./demo3";
import { demo2 } from "./demo2";
import { demo1 } from "./demo1/main";
import { demo4 } from "./demo1/demo4";
import { demo5 } from "./demo1/demo5";
//import { demo6 } from "./demo6/main";

const draw = async (context: GPUCanvasContext, image: Uint8Array) => {
  console.log({image: image.subarray(0, 100)});
  const adapter = await gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const presentationFormat = "rgba8unorm";
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });
  await demo5(device, context);
  //context.present();
};

export const Breathe = () => {
  const image = useImage(require("./demo6/webgpu.png"));
  const ref = useRef<SkiaDomView>(null);
  useEffect(() => {
    setTimeout(() => {
      if (image && ref.current) {
        const ctx = ref.current.getWGPUContext();
        const buffer = image.readPixels()!.buffer;
        draw(ctx, new Uint8Array(buffer));
      }
    }, 1000);
  }, [image]);
  return <SkiaDomView style={{ flex: 1 }} ref={ref} />;
};
