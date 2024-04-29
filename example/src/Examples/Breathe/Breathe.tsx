import React, { useEffect,  useRef } from "react";
import {
  gpu,
  SkiaDomView,
} from "@shopify/react-native-skia";
import { demo1 } from "./demo1/main";

const triangleVertWGSL = `@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5)
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}
`;

const redFragWGSL = `@fragment
fn main() -> @location(0) vec4f {
  return vec4(0.3, 0.6, 1.0, 1.0);
}`;

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
