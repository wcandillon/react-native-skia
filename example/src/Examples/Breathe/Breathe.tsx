import React, { useEffect,  useRef } from "react";
import {
  gpu,
  SkiaDomView,
} from "@shopify/react-native-skia";

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
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;

const draw = async (ctx: GPUCanvasContext) => {
  // const adapter = await gpu.requestAdapter();
  // const device = await adapter!.requestDevice();
  // const presentationFormat = gpu.getPreferredCanvasFormat();
  // ctx.configure({
  //   device,
  //   format:  "bgra8unorm"
  // });
  // const pipeline = device.createRenderPipeline({
  //   layout: "auto",
  //   vertex: {
  //     entryPoint: "main",
  //     module: device.createShaderModule({
  //       code: triangleVertWGSL,
  //     }),
  //   },
  //   fragment: {
  //     entryPoint: "main",
  //     module: device.createShaderModule({
  //       code: redFragWGSL,
  //     }),
  //     targets: [
  //       {
  //         format: presentationFormat,
  //       },
  //     ],
  //   },
  //   primitive: {
  //     topology: "triangle-list",
  //   },
  // });
  // const commandEncoder = device.createCommandEncoder();
  // const textureView = ctx.getCurrentTexture().createView();
  // const renderPassDescriptor: GPURenderPassDescriptor = {
  //   colorAttachments: [
  //     {
  //       view: textureView,
  //       clearValue: [0.3, 0.6, 1, 1],
  //       loadOp: 'clear',
  //       storeOp: 'store',
  //     },
  //   ],
  // };


  // const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  // passEncoder.setPipeline(pipeline);
  // passEncoder.draw(3);
  // passEncoder.end();
  // device.queue.submit([commandEncoder.finish()]);
  // ctx.present();
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
