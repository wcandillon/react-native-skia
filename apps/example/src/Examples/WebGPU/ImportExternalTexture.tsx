import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeBuffer } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas, importDevice } from "react-native-webgpu";

// Demonstrates GPUDevice.importExternalTexture with a self-contained source: a
// platform native buffer (CVPixelBufferRef on iOS, AHardwareBuffer on Android)
// CPU-filled with a procedural test pattern via Skia.NativeBuffer.MakeTestBuffer
// — no camera or video decode involved. Each frame we import the buffer as a
// GPUExternalTexture and sample it. A GPUExternalTexture expires once the queue
// work that used it is submitted, so we re-import one every frame.
const TEXTURE_SIZE = 512;

const SHADER = /* wgsl */ `
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

// Per-axis scale applied to UVs around the center so the canvas samples a
// sub-rectangle of the texture matching the canvas aspect ratio ('cover' fit).
struct Uniforms { uvScale: vec2f };

@group(0) @binding(0) var srcTex: texture_external;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VsOut {
  // Full-screen triangle.
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -3.0),
    vec2f(-1.0,  1.0),
    vec2f( 3.0,  1.0),
  );
  var uvs = array<vec2f, 3>(
    vec2f(0.0, 2.0),
    vec2f(0.0, 0.0),
    vec2f(2.0, 0.0),
  );
  var out: VsOut;
  out.position = vec4f(positions[vid], 0.0, 1.0);
  out.uv = uvs[vid];
  return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4f {
  let uv = vec2f(0.5) + (in.uv - vec2f(0.5)) * u.uvScale;
  // External textures must be sampled with textureSampleBaseClampToEdge.
  let color = textureSampleBaseClampToEdge(srcTex, srcSampler, uv);
  return vec4f(color.rgb, 1.0);
}
`;

export function ImportExternalTexture() {
  const canvasRef = useRef<CanvasRef>(null);
  const animationRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (!canvasRef.current) {
        return;
      }
      const ctx = canvasRef.current.getContext("webgpu");
      if (!ctx) {
        return;
      }

      const device = importDevice(Skia.getNativeDevice());
      const canvas = ctx.canvas as unknown as { width: number; height: number };
      const format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "premultiplied" });

      const module = device.createShaderModule({ code: SHADER });
      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs_main" },
        fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
        primitive: { topology: "triangle-list" },
      });
      const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
      });
      // vec2<f32> padded to the 16-byte uniform alignment.
      const uniformBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // 'cover' fit: scale UVs around their center so the longer axis of the
      // texture is cropped to match the canvas aspect ratio.
      const computeUvScale = (texW: number, texH: number): [number, number] => {
        if (!canvas.width || !canvas.height) {
          return [1, 1];
        }
        const canvasAR = canvas.width / canvas.height;
        const texAR = texW / texH;
        return texAR > canvasAR ? [canvasAR / texAR, 1] : [1, texAR / canvasAR];
      };

      // A single static test-pattern buffer reused every frame.
      const nativeBuffer: NativeBuffer = Skia.NativeBuffer.MakeTestBuffer(
        TEXTURE_SIZE,
        TEXTURE_SIZE
      );
      // Wrap the platform buffer (CVPixelBuffer / AHardwareBuffer pointer) in
      // a react-native-webgpu VideoFrame so it can feed importExternalTexture.
      const videoFrame = RNWebGPU.createVideoFrameFromNativeBuffer(
        nativeBuffer as bigint
      );
      let uniformsWritten = false;

      const render = () => {
        if (cancelled) {
          return;
        }

        if (!uniformsWritten) {
          const [sx, sy] = computeUvScale(TEXTURE_SIZE, TEXTURE_SIZE);
          device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([sx, sy])
          );
          uniformsWritten = true;
        }

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: ctx.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });

        // Re-import the buffer each tick (external textures expire after submit).
        let externalTexture: GPUExternalTexture | null = null;
        try {
          externalTexture = device.importExternalTexture({
            source: videoFrame as unknown as VideoFrame,
            label: "test-pattern",
          });
        } catch (e) {
          console.warn("[ImportExternalTexture] import failed:", e);
        }
        if (externalTexture) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: externalTexture },
              { binding: 1, resource: sampler },
              { binding: 2, resource: { buffer: uniformBuffer } },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        // End the access window now that the sampling work is submitted.
        externalTexture?.destroy();
        ctx.present();
        animationRef.current = requestAnimationFrame(render);
      };
      animationRef.current = requestAnimationFrame(render);

      cleanupRef.current = () => {
        cancelAnimationFrame(animationRef.current);
        Skia.NativeBuffer.Release(nativeBuffer);
        uniformBuffer.destroy();
      };
    };

    init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Canvas ref={canvasRef} style={styles.canvas} />
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
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  submessage: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
