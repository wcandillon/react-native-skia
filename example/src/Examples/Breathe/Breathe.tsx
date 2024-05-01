import React, { useEffect,  useRef } from "react";
import {
  gpu,
  SkiaDomView,
} from "@shopify/react-native-skia";
import { demo1 } from "./demo1/main";

const draw = async (ctx: GPUCanvasContext) => {
  await demo1(ctx);
  ctx.present();
};

export const Breathe = () => {
  const ref = useRef<SkiaDomView>(null);
  useEffect(() => {
    setTimeout(() => {
      const ctx = ref.current!.getWGPUContext();
      draw(ctx);
    }, 1000);
  }, []);
  return (
    <SkiaDomView style={{ flex: 1 }} ref={ref} />
  );
};
