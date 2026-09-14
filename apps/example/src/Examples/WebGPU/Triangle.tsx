import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas, importDevice } from "react-native-webgpu";
import { Skia } from "@shopify/react-native-skia";

const triangleShader = `
@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f( 0.0,  0.5),
    vec2f(-0.5, -0.5),
    vec2f( 0.5, -0.5)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 0.5, 0.2, 1.0);
}
`;

export function Triangle() {
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    let running = true;
    let frame = 0;

    (async () => {
      // Shared-device interop: adopt Skia's Graphite device so WebGPU work and
      // Skia rendering share one wgpu::Device (zero-copy handoff becomes
      // possible). Falls back to a standalone device when unavailable.
      let device: GPUDevice;
      try {
        device = importDevice(Skia.getNativeDevice());
        console.log(
          "[webgpu-coexistence] rendering with Skia's Graphite device"
        );
      } catch (e) {
        console.log(
          "[webgpu-coexistence] falling back to a standalone device",
          e
        );
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          console.warn("Failed to get GPU adapter");
          return;
        }
        device = await adapter.requestDevice();
      }

      const context = ref.current?.getContext("webgpu");
      if (!context) {
        console.warn("Failed to get WebGPU context");
        return;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device,
        format,
        alphaMode: "opaque",
      });

      const shaderModule = device.createShaderModule({
        code: triangleShader,
      });

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: shaderModule,
          entryPoint: "vs_main",
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });

      console.log("[webgpu-coexistence] pipeline ready, rendering triangle");

      const render = () => {
        if (!running) {
          return;
        }

        const texture = context.getCurrentTexture();
        const renderPassDescriptor: GPURenderPassDescriptor = {
          colorAttachments: [
            {
              view: texture.createView(),
              clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        };

        const commandEncoder = device.createCommandEncoder();
        const passEncoder =
          commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.draw(3);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        context.present();

        frame = requestAnimationFrame(render);
      };

      frame = requestAnimationFrame(render);
    })();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Canvas ref={ref} style={styles.canvas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  canvas: {
    flex: 1,
  },
});
