import type { SkImage } from "@shopify/react-native-skia";
import {
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  Text,
  rrect,
  rect,
  useFont,
  vec,
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

const NUM_CUBES = 36;

type Instance = {
  uniformBuffer: GPUBuffer;
  uniformValues: Float32Array;
  bindGroup: GPUBindGroup;
  seed: number;
  basePos: Vec3;
};

export function BlurredSheet() {
  const { width, height } = useWindowDimensions();
  const [image, setImage] = useState<SkImage | null>(null);
  const frameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const pd = PixelRatio.get();
  const canvasWidth = Math.floor(width * pd);
  const canvasHeight = Math.floor(height * pd);

  const sheetHeight = Math.min(320, height * 0.45);
  const sheetTop = height - sheetHeight - 24;
  const sheetRect = rrect(rect(16, sheetTop, width - 32, sheetHeight), 28, 28);
  const albumRect = rrect(rect(32, sheetTop + 28, 88, 88), 16, 16);
  const progressBg = rrect(rect(32, sheetTop + 156, width - 64, 6), 3, 3);

  const titleFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    20
  );
  const subtitleFont = useFont(
    require("../../Tests/assets/Roboto-Regular.ttf"),
    14
  );
  const timeFont = useFont(
    require("../../Tests/assets/Roboto-Regular.ttf"),
    11
  );

  const playIcon = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-9, -12);
    p.lineTo(13, 0);
    p.lineTo(-9, 12);
    p.close();
    return p;
  }, []);
  const prevIcon = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(6, -10);
    p.lineTo(-6, 0);
    p.lineTo(6, 10);
    p.close();
    p.moveTo(-8, -10);
    p.lineTo(-8, 10);
    p.lineTo(-11, 10);
    p.lineTo(-11, -10);
    p.close();
    return p;
  }, []);
  const nextIcon = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, -10);
    p.lineTo(6, 0);
    p.lineTo(-6, 10);
    p.close();
    p.moveTo(8, -10);
    p.lineTo(8, 10);
    p.lineTo(11, 10);
    p.lineTo(11, -10);
    p.close();
    return p;
  }, []);

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
      const r = 5 + (i % 4) * 2.4;
      const basePos: Vec3 = [
        Math.cos(a) * r,
        Math.sin(a * 1.3) * 3,
        Math.sin(a) * r,
      ];
      instances.push({
        uniformBuffer,
        uniformValues,
        bindGroup,
        seed: i * 0.97,
        basePos,
      });
    }

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
          clearValue: [0.04, 0.06, 0.1, 1],
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
      (60 * Math.PI) / 180,
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
        [
          Math.cos(t * 0.15) * 18,
          6 + Math.sin(t * 0.2) * 2,
          Math.sin(t * 0.15) * 18,
        ] as Vec3,
        [0, 0, 0] as Vec3,
        [0, 1, 0] as Vec3
      );
      const viewProjection = mat4Multiply(projection, view);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPass);
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, verticesBuffer);

      for (const inst of instances) {
        const world = mat4Identity();
        mat4Translate(
          world,
          [
            inst.basePos[0],
            inst.basePos[1] + Math.sin(t * 0.7 + inst.seed) * 1.5,
            inst.basePos[2],
          ] as Vec3,
          world
        );
        mat4RotateY(world, t * 0.5 + inst.seed, world);
        mat4RotateX(world, t * 0.4 + inst.seed * 0.5, world);
        mat4Multiply(viewProjection, world, inst.uniformValues);
        device.queue.writeBuffer(
          inst.uniformBuffer,
          0,
          inst.uniformValues as unknown as BufferSource
        );
        pass.setBindGroup(0, inst.bindGroup);
        pass.draw(cubeVertexCount);
      }

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

  const progress = ((Date.now() / 1000) % 180) / 180;
  const playheadX = 32 + (width - 64) * progress;
  const elapsed = formatTime(progress * 180);
  const total = formatTime(180);

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {image && (
          <SkiaImage
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        )}

        {/* Frosted sheet — a clipped, blurred copy of the WebGPU image,
            tinted dark. Equivalent visual to a backdrop blur, but the blur
            is applied to the image directly so we don't need the destination
            surface texture to have TextureBinding usage. */}
        {image && (
          <Group clip={sheetRect}>
            <SkiaImage
              image={image}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            >
              <Blur blur={24} mode="clamp" />
            </SkiaImage>
            <Fill color="rgba(18, 18, 26, 0.55)" />
          </Group>
        )}

        {/* Sheet handle */}
        <RoundedRect
          x={width / 2 - 20}
          y={sheetTop + 10}
          width={40}
          height={4}
          r={2}
          color="rgba(255,255,255,0.45)"
        />

        {/* Album art */}
        <Group>
          <RoundedRect rect={albumRect}>
            <LinearGradient
              start={vec(32, sheetTop + 28)}
              end={vec(120, sheetTop + 116)}
              colors={["#ff6a88", "#ff99ac", "#ffc3a0"]}
            />
          </RoundedRect>
          <Circle
            cx={76}
            cy={sheetTop + 72}
            r={14}
            color="rgba(255,255,255,0.85)"
          />
          <Circle cx={76} cy={sheetTop + 72} r={4} color="#1a1a22" />
        </Group>

        {/* Title + artist */}
        {titleFont && (
          <Text
            x={140}
            y={sheetTop + 60}
            text="Graphite Lights"
            font={titleFont}
            color="white"
          />
        )}
        {subtitleFont && (
          <Text
            x={140}
            y={sheetTop + 84}
            text="Skia x WebGPU"
            font={subtitleFont}
            color="rgba(255,255,255,0.7)"
          />
        )}

        {/* Progress bar */}
        <RoundedRect rect={progressBg} color="rgba(255,255,255,0.18)" />
        <RoundedRect
          x={32}
          y={sheetTop + 156}
          width={(width - 64) * progress}
          height={6}
          r={3}
          color="white"
        />
        <Circle cx={playheadX} cy={sheetTop + 159} r={7} color="white" />

        {/* Time labels */}
        {timeFont && (
          <Text
            x={32}
            y={sheetTop + 184}
            text={elapsed}
            font={timeFont}
            color="rgba(255,255,255,0.6)"
          />
        )}
        {timeFont && (
          <Text
            x={width - 64}
            y={sheetTop + 184}
            text={total}
            font={timeFont}
            color="rgba(255,255,255,0.6)"
          />
        )}

        {/* Controls row */}
        <Group
          transform={[
            { translateX: width / 2 },
            { translateY: sheetTop + 230 },
          ]}
        >
          <Group transform={[{ translateX: -80 }]}>
            <Path path={prevIcon} color="white" />
          </Group>
          <Circle cx={0} cy={0} r={28} color="white" />
          <Path path={playIcon} color="#0a0a14" />
          <Group transform={[{ translateX: 80 }]}>
            <Path path={nextIcon} color="white" />
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
