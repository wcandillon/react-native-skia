import type {
  DataModule,
  SkTextStyle,
  WebGPUCanvasRef,
} from "@shopify/react-native-skia";
import {
  FontWeight,
  Skia,
  TextAlign,
  WebGPUCanvas,
  useFonts,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef } from "react";
import {
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
  Text as RNText,
} from "react-native";

import {
  cubeColorOffset,
  cubePositionOffset,
  cubeVertexArray,
  cubeVertexCount,
  cubeVertexSize,
} from "./cube";
import {
  mat4Identity,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4RotateX,
  mat4RotateY,
  mat4Scale,
  mat4Translate,
  type Vec3,
} from "./matrix";

const cubeWGSL = /* wgsl */ `
struct Uniforms {
  mvp: mat4x4f,
};
@group(0) @binding(0) var<uniform> uni: Uniforms;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vs(@location(0) position: vec4f, @location(1) color: vec4f) -> VsOut {
  var o: VsOut;
  o.pos = uni.mvp * position;
  let n = normalize(position.xyz);
  let l = 0.55 + 0.45 * dot(n, normalize(vec3f(0.4, 0.8, 0.5)));
  o.color = vec4f(color.rgb * l, 1.0);
  return o;
}

@fragment
fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}
`;

const planeWGSL = /* wgsl */ `
struct Uniforms {
  mvp: mat4x4f,
};
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@location(0) position: vec4f, @location(1) uv: vec2f) -> VsOut {
  var o: VsOut;
  o.pos = uni.mvp * position;
  o.uv = uv;
  return o;
}

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
  let c = textureSample(tex, samp, uv);
  // Discard transparent pixels so no depth is written there — cubes behind
  // the text plane can show through the empty space, but the plane occludes
  // them where actual text ink exists.
  if (c.a < 0.05) {
    discard;
  }
  return c;
}
`;

const NUM_CUBES = 5;
const CUBE_RADIUS = 1.5;
const CUBE_SCALE = 0.45;
const CUBE_ORBIT_SPEED = 0.35;
const PLANE_W = 6;
const PLANE_H = 3;
const CAM_RADIUS = 4;
const CAM_Y = 0.6;

const TEX_W = 1024;
const TEX_H = 512;

const fonts: Record<string, DataModule[]> = {
  Roboto: [
    require("../../Tests/assets/Roboto-Medium.ttf"),
    require("../../Tests/assets/Roboto-Regular.ttf"),
  ],
};

const planeVertexStride = 6 * 4; // vec4 pos + vec2 uv
// 6 vertices, 2 triangles. Plane is in the XY plane at z=0, facing +Z.
const planeVertices = new Float32Array([
  -PLANE_W / 2, -PLANE_H / 2, 0, 1, 0, 1,
  PLANE_W / 2, -PLANE_H / 2, 0, 1, 1, 1,
  PLANE_W / 2, PLANE_H / 2, 0, 1, 1, 0,
  -PLANE_W / 2, -PLANE_H / 2, 0, 1, 0, 1,
  PLANE_W / 2, PLANE_H / 2, 0, 1, 1, 0,
  -PLANE_W / 2, PLANE_H / 2, 0, 1, 0, 0,
]);

type CubeInstance = {
  uniformBuffer: GPUBuffer;
  uniformValues: Float32Array;
  bindGroup: GPUBindGroup;
  seed: number;
  angle0: number;
};

function createTextTexture(
  fontMgr: ReturnType<typeof useFonts>
): GPUTexture | null {
  if (!fontMgr) {
    return null;
  }
  const surface = Skia.Surface.MakeOffscreen(TEX_W, TEX_H);
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();

  const titleStyle: SkTextStyle = {
    color: Skia.Color("#ffe7a1"),
    fontFamilies: ["Roboto"],
    fontSize: 80,
    fontStyle: { weight: FontWeight.Medium },
  };
  const subStyle: SkTextStyle = {
    color: Skia.Color("rgba(255, 255, 255, 0.85)"),
    fontFamilies: ["Roboto"],
    fontSize: 40,
  };

  const paragraph = Skia.ParagraphBuilder.Make(
    { textAlign: TextAlign.Center },
    fontMgr
  )
    .pushStyle(titleStyle)
    .addText("Hello React Native Developers 🙋‍♂️\n\n")
    .pop()
    .pushStyle(subStyle)
    .addText("William here presenting from beautiful Kraków.")
    .build();

  const padding = 40;
  paragraph.layout(TEX_W - padding * 2);
  const y = (TEX_H - paragraph.getHeight()) / 2;
  paragraph.paint(canvas, padding, y);

  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  return Skia.Image.MakeTextureFromImage(snapshot);
}

export function TextPlane() {
  const { width, height } = useWindowDimensions();
  const canvasRef = useRef<WebGPUCanvasRef>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Text rendered by Skia once via ParagraphBuilder, baked into a GPU texture
  // that WebGPU samples from in the plane fragment shader. ParagraphBuilder
  // handles word wrap, line layout, and emoji fallback through the system
  // font manager.
  const customFontMgr = useFonts(fonts);

  useEffect(() => {
    if (typeof RNWebGPU === "undefined") {
      return;
    }
    if (!customFontMgr) {
      return;
    }
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (cancelled || !canvasRef.current) {
        return;
      }
      const context = canvasRef.current.getContext("webgpu");
      if (!context) {
        return;
      }
      const device = Skia.getDevice();
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      const depthFormat: GPUTextureFormat = "depth24plus";

      // Swap chain defaults to CSS-pixel size, which is ~1/3 the native
      // resolution of the display. Scale it up by PixelRatio so the WebGPU
      // render is device-pixel-sharp instead of being upscaled by Skia.
      const surfaceCanvas = context.canvas as {
        width: number;
        height: number;
        clientWidth: number;
        clientHeight: number;
      };
      const dpr = PixelRatio.get();
      surfaceCanvas.width = Math.floor(surfaceCanvas.clientWidth * dpr);
      surfaceCanvas.height = Math.floor(surfaceCanvas.clientHeight * dpr);

      context.configure({
        device,
        format: presentationFormat,
        alphaMode: "opaque",
      });

      // ---------- Skia → GPUTexture ----------
      const textTexture = createTextTexture(customFontMgr);
      if (!textTexture) {
        return;
      }

      // ---------- Cube pipeline ----------
      const cubeModule = device.createShaderModule({ code: cubeWGSL });
      const cubePipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: cubeModule,
          entryPoint: "vs",
          buffers: [
            {
              arrayStride: cubeVertexSize,
              attributes: [
                {
                  shaderLocation: 0,
                  offset: cubePositionOffset,
                  format: "float32x4",
                },
                {
                  shaderLocation: 1,
                  offset: cubeColorOffset,
                  format: "float32x4",
                },
              ],
            },
          ],
        },
        fragment: {
          module: cubeModule,
          entryPoint: "fs",
          targets: [{ format: presentationFormat }],
        },
        primitive: { topology: "triangle-list", cullMode: "back" },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less",
          format: depthFormat,
        },
      });

      const cubeVertexBuffer = device.createBuffer({
        size: cubeVertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Float32Array(cubeVertexBuffer.getMappedRange()).set(cubeVertexArray);
      cubeVertexBuffer.unmap();

      const cubes: CubeInstance[] = [];
      for (let i = 0; i < NUM_CUBES; i++) {
        const uniformValues = new Float32Array(16);
        const uniformBuffer = device.createBuffer({
          size: uniformValues.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const bindGroup = device.createBindGroup({
          layout: cubePipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });
        cubes.push({
          uniformBuffer,
          uniformValues,
          bindGroup,
          seed: i * 1.27,
          angle0: (i / NUM_CUBES) * Math.PI * 2,
        });
      }

      // ---------- Plane pipeline ----------
      const planeModule = device.createShaderModule({ code: planeWGSL });
      const planePipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: planeModule,
          entryPoint: "vs",
          buffers: [
            {
              arrayStride: planeVertexStride,
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x4" },
                { shaderLocation: 1, offset: 16, format: "float32x2" },
              ],
            },
          ],
        },
        fragment: {
          module: planeModule,
          entryPoint: "fs",
          targets: [{ format: presentationFormat }],
        },
        primitive: { topology: "triangle-list", cullMode: "none" },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less",
          format: depthFormat,
        },
      });

      const planeVertexBuffer = device.createBuffer({
        size: planeVertices.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Float32Array(planeVertexBuffer.getMappedRange()).set(planeVertices);
      planeVertexBuffer.unmap();

      const planeUniformBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
      });

      const planeBindGroup = device.createBindGroup({
        layout: planePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: planeUniformBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: textTexture.createView() },
        ],
      });

      // ---------- Depth texture (sized for the canvas) ----------
      const canvas = context.canvas as { width: number; height: number };
      const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: depthFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const projection = mat4Perspective(
        (55 * Math.PI) / 180,
        canvas.width / canvas.height,
        0.1,
        200
      );
      const planeUniform = new Float32Array(16);

      let running = true;

      const render = () => {
        if (!running) {
          return;
        }
        const t = Date.now() / 1000;

        // Camera orbits slightly to add motion.
        const view = mat4LookAt(
          [
            Math.cos(t * 0.18) * CAM_RADIUS,
            CAM_Y + Math.sin(t * 0.3) * 0.4,
            Math.sin(t * 0.18) * CAM_RADIUS,
          ] as Vec3,
          [0, 0, 0] as Vec3,
          [0, 1, 0] as Vec3
        );
        const viewProjection = mat4Multiply(projection, view);

        // Cubes orbit around the Y axis so they sweep through the text plane
        // from in front to behind each lap. The depth buffer resolves who
        // wins per-pixel.
        for (const c of cubes) {
          const angle = c.angle0 + t * CUBE_ORBIT_SPEED;
          const x = Math.cos(angle) * CUBE_RADIUS;
          const z = Math.sin(angle) * CUBE_RADIUS;
          const y = Math.sin(t * 0.8 + c.seed) * 0.9;
          const world = mat4Identity();
          mat4Translate(world, [x, y, z] as Vec3, world);
          mat4RotateY(world, t * 0.7 + c.seed, world);
          mat4RotateX(world, t * 0.5 + c.seed * 0.7, world);
          mat4Scale(
            world,
            [CUBE_SCALE, CUBE_SCALE, CUBE_SCALE] as Vec3,
            world
          );
          mat4Multiply(viewProjection, world, c.uniformValues);
          device.queue.writeBuffer(
            c.uniformBuffer,
            0,
            c.uniformValues as unknown as BufferSource
          );
        }

        // Plane uniform — model is identity (plane sits at origin facing +Z).
        for (let i = 0; i < 16; i++) {
          planeUniform[i] = viewProjection[i];
        }
        device.queue.writeBuffer(
          planeUniformBuffer,
          0,
          planeUniform as unknown as BufferSource
        );

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: [0.04, 0.05, 0.09, 1],
              loadOp: "clear",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        });

        // Cubes
        pass.setPipeline(cubePipeline);
        pass.setVertexBuffer(0, cubeVertexBuffer);
        for (const c of cubes) {
          pass.setBindGroup(0, c.bindGroup);
          pass.draw(cubeVertexCount);
        }

        // Plane on top (depth-test resolves what wins per-pixel)
        pass.setPipeline(planePipeline);
        pass.setVertexBuffer(0, planeVertexBuffer);
        pass.setBindGroup(0, planeBindGroup);
        pass.draw(6);

        pass.end();
        device.queue.submit([encoder.finish()]);
        context.present();

        rafRef = requestAnimationFrame(render);
      };

      let rafRef = requestAnimationFrame(render);

      cleanupRef.current = () => {
        running = false;
        cancelAnimationFrame(rafRef);
        depthTexture.destroy();
      };
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [customFontMgr, width, height]);

  if (typeof RNWebGPU === "undefined") {
    return (
      <View style={styles.messageContainer}>
        <RNText style={styles.message}>
          WebGPU Canvas requires SK_GRAPHITE to be enabled.
        </RNText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebGPUCanvas ref={canvasRef} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a1a",
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
