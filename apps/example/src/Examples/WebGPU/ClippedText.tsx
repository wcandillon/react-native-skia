import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  Group,
  Image as SkiaImage,
  Path,
  Skia,
  processTransform3d,
  useFont,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  mat4Translate,
  type Vec3,
} from "./matrix";

const sceneWGSL = /* wgsl */ `
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

const NUM_CUBES = 32;
const START_SCALE = 10;
const ANIM_DELAY_MS = 5000;
const ANIM_DURATION_MS = 2500;
const TEXT_OFFSET_Y = -64;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Instance = {
  uniformBuffer: GPUBuffer;
  uniformValues: Float32Array;
  bindGroup: GPUBindGroup;
  seed: number;
  basePos: Vec3;
};

export function ClippedText() {
  const { width, height } = useWindowDimensions();
  const [image, setImage] = useState<SkImage | null>(null);
  const frameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const animStartRef = useRef<number | null>(null);

  const pd = PixelRatio.get();
  const canvasWidth = Math.floor(width * pd);
  const canvasHeight = Math.floor(height * pd);

  const bigFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    Math.min(width * 0.45, 220)
  );
  const subFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    Math.min(width * 0.18, 80)
  );

  const clipData = useMemo(() => {
    if (!bigFont || !subFont) {
      return null;
    }
    const title = "SKIA";
    const sub = "GRAPHITE";
    const tb = bigFont.measureText(title);
    const sb = subFont.measureText(sub);
    const tMetrics = bigFont.getMetrics();
    const sMetrics = subFont.getMetrics();
    const lineGap = 12;

    // Build both paths around the origin: title baseline at y=0, horizontally
    // centered on x=0. The subtitle baseline sits below the title using font
    // metrics (title descent + gap + |sub ascent|).
    const p1 = Skia.Path.MakeFromText(title, -tb.width / 2, 0, bigFont);
    const subBaseline =
      tMetrics.descent + lineGap + -sMetrics.ascent;
    const p2 = Skia.Path.MakeFromText(
      sub,
      -sb.width / 2,
      subBaseline,
      subFont
    );
    if (!p1 || !p2) {
      return null;
    }
    p1.addPath(p2);

    // Translate the combined path so its tight bounds are centered on the
    // screen — proper vertical centering of the actual ink, not metric guesses.
    const bounds = p1.computeTightBounds();
    const tx = width / 2 - (bounds.x + bounds.width / 2);
    const ty =
      height / 2 - (bounds.y + bounds.height / 2) + TEXT_OFFSET_Y;
    p1.transform(
      processTransform3d([
        { translateX: tx },
        { translateY: ty },
      ])
    );

    // Pivot at the center of the "I" glyph of SKIA (3rd letter — a thin
    // vertical stem). The point is reliably inside ink, so at high zoom the
    // scaled mask covers the screen instead of opening onto a gap.
    const ids = bigFont.getGlyphIDs(title);
    const widths = bigFont.getGlyphWidths(ids);
    const iCenterXLocal =
      -tb.width / 2 + widths[0] + widths[1] + widths[2] / 2;
    const iCenterYLocal = (tMetrics.ascent + tMetrics.descent) / 2;
    const pivotX = iCenterXLocal + tx;
    const pivotY = iCenterYLocal + ty;

    return { path: p1, pivotX, pivotY };
  }, [bigFont, subFont, width, height]);

  const clip = clipData?.path ?? null;
  const pivotX = clipData?.pivotX ?? width / 2;
  const pivotY = clipData?.pivotY ?? height / 2;

  useEffect(() => {
    if (typeof RNWebGPU === "undefined") {
      return;
    }
    const device = Skia.getDevice();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const depthFormat = "depth24plus";

    const verticesBuffer = device.createBuffer({
      size: cubeVertexArray.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
    verticesBuffer.unmap();

    const module = device.createShaderModule({ code: sceneWGSL });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
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
        module,
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

    const instances: Instance[] = [];
    for (let i = 0; i < NUM_CUBES; i++) {
      const uniformValues = new Float32Array(16);
      const uniformBuffer = device.createBuffer({
        size: uniformValues.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });
      const a = (i / NUM_CUBES) * Math.PI * 2;
      const r = 4 + (i % 5) * 1.8;
      const basePos: Vec3 = [
        Math.cos(a * 1.7) * r,
        Math.sin(a * 2.1) * 3.5,
        Math.sin(a * 1.7) * r,
      ];
      instances.push({
        uniformBuffer,
        uniformValues,
        bindGroup,
        seed: i * 1.13,
        basePos,
      });
    }

    // Pre-record the cube draw calls into a render bundle.
    const bundleEncoder = device.createRenderBundleEncoder({
      colorFormats: [presentationFormat],
      depthStencilFormat: depthFormat,
    });
    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setVertexBuffer(0, verticesBuffer);
    for (const inst of instances) {
      bundleEncoder.setBindGroup(0, inst.bindGroup);
      bundleEncoder.draw(cubeVertexCount);
    }
    const renderBundle = bundleEncoder.finish();

    const texture = device.createTexture({
      size: [canvasWidth, canvasHeight, 1],
      format: presentationFormat,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const depthTexture = device.createTexture({
      size: [canvasWidth, canvasHeight],
      format: depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPass: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: [0.05, 0.07, 0.12, 1],
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
    };

    const projection = mat4Perspective(
      (55 * Math.PI) / 180,
      canvasWidth / canvasHeight,
      0.1,
      200
    );

    let running = true;

    const render = () => {
      if (!running) {
        return;
      }
      const t = Date.now() / 1000;

      const view = mat4LookAt(
        [Math.cos(t * 0.2) * 14, 4, Math.sin(t * 0.2) * 14] as Vec3,
        [0, 0, 0] as Vec3,
        [0, 1, 0] as Vec3
      );
      const viewProjection = mat4Multiply(projection, view);

      for (const inst of instances) {
        const world = mat4Identity();
        mat4Translate(
          world,
          [
            inst.basePos[0],
            inst.basePos[1] + Math.sin(t * 0.9 + inst.seed) * 1.2,
            inst.basePos[2],
          ] as Vec3,
          world
        );
        mat4RotateY(world, t * 0.6 + inst.seed, world);
        mat4RotateX(world, t * 0.4 + inst.seed * 0.7, world);
        mat4Multiply(viewProjection, world, inst.uniformValues);
        device.queue.writeBuffer(
          inst.uniformBuffer,
          0,
          inst.uniformValues as unknown as BufferSource
        );
      }

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPass);
      pass.executeBundles([renderBundle]);
      pass.end();
      device.queue.submit([encoder.finish()]);

      setImage(Skia.Image.MakeImageFromTexture(texture));
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);

    cleanupRef.current = () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      texture.destroy();
      depthTexture.destroy();
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [canvasWidth, canvasHeight]);

  if (typeof RNWebGPU === "undefined") {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <RNText style={styles.message}>
            WebGPU Canvas requires SK_GRAPHITE to be enabled.
          </RNText>
        </View>
      </View>
    );
  }

  // Start the intro animation as soon as we have both the text path and the
  // first rendered scene frame to reveal.
  if (clip && image && animStartRef.current === null) {
    animStartRef.current = Date.now();
  }
  const elapsed =
    animStartRef.current !== null ? Date.now() - animStartRef.current : 0;
  const animT = Math.min(
    Math.max(elapsed - ANIM_DELAY_MS, 0) / ANIM_DURATION_MS,
    1
  );
  const scale = START_SCALE + (1 - START_SCALE) * easeOutCubic(animT);

  let scaledClip = null;
  if (clip) {
    scaledClip = clip.copy();
    scaledClip.transform(
      processTransform3d([
        { translateX: pivotX },
        { translateY: pivotY },
        { scale },
        { translateX: -pivotX },
        { translateY: -pivotY },
      ])
    );
  }

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color="white" />
        {scaledClip && image && (
          <Group clip={scaledClip}>
            <SkiaImage
              image={image}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          </Group>
        )}
        {scaledClip && (
          <Path
            path={scaledClip}
            style="stroke"
            strokeWidth={1.5}
            color="rgba(0,0,0,0.4)"
          />
        )}
      </Canvas>
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
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
