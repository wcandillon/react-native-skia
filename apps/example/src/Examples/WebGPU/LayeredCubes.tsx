import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  Image as SkiaImage,
  LinearGradient,
  Skia,
  Text,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
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

type Instance = {
  uniformBuffer: GPUBuffer;
  uniformValues: Float32Array;
  bindGroup: GPUBindGroup;
  seed: number;
  basePos: Vec3;
  scale: number;
};

type Layer = {
  texture: GPUTexture;
  depthTexture: GPUTexture;
  renderPass: GPURenderPassDescriptor;
  instances: Instance[];
  bundle: GPURenderBundle;
};

export function LayeredCubes() {
  const { width, height } = useWindowDimensions();
  const [back, setBack] = useState<SkImage | null>(null);
  const [front, setFront] = useState<SkImage | null>(null);
  const frameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const pd = PixelRatio.get();
  const canvasWidth = Math.floor(width * pd);
  const canvasHeight = Math.floor(height * pd);

  const titleFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    Math.min(width * 0.13, 64)
  );
  const subFont = useFont(
    require("../../Tests/assets/Roboto-Medium.ttf"),
    Math.min(width * 0.055, 22)
  );

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

    const makeInstances = (
      count: number,
      radius: number,
      scale: number,
      yOffset: number
    ): Instance[] => {
      const out: Instance[] = [];
      for (let i = 0; i < count; i++) {
        const uniformValues = new Float32Array(16);
        const uniformBuffer = device.createBuffer({
          size: uniformValues.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });
        const a = (i / count) * Math.PI * 2;
        out.push({
          uniformBuffer,
          uniformValues,
          bindGroup,
          seed: i * 1.27,
          scale,
          basePos: [
            Math.cos(a) * radius,
            yOffset,
            Math.sin(a) * radius,
          ] as Vec3,
        });
      }
      return out;
    };

    const makeLayer = (instances: Instance[], clearValue: GPUColor): Layer => {
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
            clearValue,
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
      const bundle = bundleEncoder.finish();
      return { texture, depthTexture, renderPass, instances, bundle };
    };

    const backLayer = makeLayer(
      makeInstances(10, 7, 0.9, 0),
      [0.04, 0.05, 0.09, 1]
    );
    const frontLayer = makeLayer(makeInstances(4, 4.5, 1.4, 0), [0, 0, 0, 0]);

    const projection = mat4Perspective(
      (55 * Math.PI) / 180,
      canvasWidth / canvasHeight,
      0.1,
      200
    );

    let running = true;

    const renderLayer = (
      encoder: GPUCommandEncoder,
      layer: Layer,
      t: number,
      camRadius: number,
      camY: number,
      angularOffset: number
    ) => {
      const view = mat4LookAt(
        [
          Math.cos(t * 0.18 + angularOffset) * camRadius,
          camY,
          Math.sin(t * 0.18 + angularOffset) * camRadius,
        ] as Vec3,
        [0, 0, 0] as Vec3,
        [0, 1, 0] as Vec3
      );
      const viewProjection = mat4Multiply(projection, view);

      for (const inst of layer.instances) {
        const world = mat4Identity();
        mat4Translate(
          world,
          [
            inst.basePos[0],
            inst.basePos[1] + Math.sin(t * 0.8 + inst.seed) * 1.2,
            inst.basePos[2],
          ] as Vec3,
          world
        );
        mat4RotateY(world, t * 0.7 + inst.seed, world);
        mat4RotateX(world, t * 0.5 + inst.seed * 0.7, world);
        mat4Scale(world, [inst.scale, inst.scale, inst.scale] as Vec3, world);
        mat4Multiply(viewProjection, world, inst.uniformValues);
        device.queue.writeBuffer(
          inst.uniformBuffer,
          0,
          inst.uniformValues as unknown as BufferSource
        );
      }

      const pass = encoder.beginRenderPass(layer.renderPass);
      pass.executeBundles([layer.bundle]);
      pass.end();
    };

    const render = () => {
      if (!running) {
        return;
      }
      const t = Date.now() / 1000;

      const encoder = device.createCommandEncoder();
      renderLayer(encoder, backLayer, t, 16, 5, 0);
      renderLayer(encoder, frontLayer, t, 11, 0, Math.PI / 3);
      device.queue.submit([encoder.finish()]);

      setBack(Skia.Image.MakeImageFromTexture(backLayer.texture));
      setFront(Skia.Image.MakeImageFromTexture(frontLayer.texture));
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);

    cleanupRef.current = () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      backLayer.texture.destroy();
      backLayer.depthTexture.destroy();
      frontLayer.texture.destroy();
      frontLayer.depthTexture.destroy();
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

  const title = "SKIA";
  const sub = "WebGPU x Skia, layered";
  const titleW = titleFont ? titleFont.measureText(title).width : 0;
  const subW = subFont ? subFont.measureText(sub).width : 0;

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color="#06070d" />

        {/* Back cubes (opaque) */}
        {back && (
          <SkiaImage
            image={back}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        )}

        {/* Skia text sandwiched between the two WebGPU layers */}
        {titleFont && (
          <Text
            x={(width - titleW) / 2}
            y={height / 2}
            text={title}
            font={titleFont}
            color="white"
          >
            <LinearGradient
              start={vec(0, height / 2 - 60)}
              end={vec(width, height / 2 + 20)}
              colors={["#ffd166", "#ef476f", "#7b5cff"]}
            />
          </Text>
        )}
        {subFont && (
          <Text
            x={(width - subW) / 2}
            y={height / 2 + 36}
            text={sub}
            font={subFont}
            color="rgba(255,255,255,0.75)"
          />
        )}

        {/* Front cubes (transparent background, drawn on top of text) */}
        {front && (
          <SkiaImage
            image={front}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
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
