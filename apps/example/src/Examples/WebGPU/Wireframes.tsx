import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  ColorMatrix,
  Fill,
  fitbox,
  Group,
  Image,
  processTransform3d,
  rect,
  Skia,
  StrokeCap,
  StrokeJoin,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import {
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import { importDevice } from "react-native-webgpu";

import { useLoop } from "../../components/Animations";

import { solidColorLitWGSL, wireframeWGSL } from "./Shaders";
import { modelData } from "./models";
import { randColor, randElement } from "./utils";
import {
  mat4Identity,
  mat4Perspective,
  mat4LookAt,
  mat4Multiply,
  mat4Translate,
  mat4RotateX,
  mat4RotateY,
  mat3FromMat4,
  type Vec3,
} from "./matrix";

const path = `M13.625 247.761C13.625 247.761 51.835 206.121 84.205 168.761C140.835 103.421 202.785 27.1114 150.135 14.3314C131.005 9.68142 116.355 29.3314 107.255 44.7814C69.695 108.371 58.025 213.781 57.535 302.021C67.745 271.281 104.425 190.301 140.175 192.531C181.465 195.101 145.255 257.021 154.525 283.841C168.845 321.631 208.215 292.281 229.975 276.901C265.915 251.481 288.975 230.671 288.975 199.901C288.975 161.001 235.285 173.471 223.295 204.591C213.925 228.891 214.295 265.341 229.295 283.591C247.485 305.731 287.665 309.381 312.175 287.911C336.995 266.161 354.655 234.011 368.675 212.481C403.915 158.321 464.355 85.6014 449.055 29.4814C446.975 21.8514 440.355 16.0214 432.455 15.7114C393.615 14.2014 381.835 98.6314 375.345 128.761C368.775 159.281 345.165 260.761 373.105 292.511C404.425 328.031 446.285 261.851 464.655 231.121C468.655 224.761 472.585 217.881 476.075 212.521C511.325 158.361 571.765 85.6414 556.455 29.5214C554.385 21.8914 547.765 16.0614 539.865 15.7514C501.025 14.2414 489.245 98.6714 482.755 128.801C476.175 159.321 452.575 260.801 480.515 292.551C511.825 328.071 562.395 264.981 572.635 232.311C587.335 185.371 620.935 171.031 660.905 179.741M660.905 179.741C615.995 166.111 580.855 199.121 572.635 232.611C566.805 256.381 573.515 281.611 599.245 295.221C668.535 331.861 742.795 211.141 660.905 179.741ZM660.905 179.741C643.665 181.341 636.145 204.221 643.285 227.231C654.285 263.421 704.285 267.721 733.075 255.451
M157.106 467.4361C100.586 405.9961 40.3464 452.3261 53.8164 504.126 58.5664 522.416 72.5264 541.386 99.0764 556.536 135.776 577.466 151.526 601.766 152.896 623.906 156.046 674.516 84.0766 713.836 15.4766 675.856M181.863 623.906C281.033 492.7064 281.973 422.0564 260.633 415.8464 245.903 412.0664 220.993 437.5164 209.863 494.8464 197.383 561.006 192.533 598.546 181.863 688.436M181.863 688.437C197.443 645.157 206.353 608.227 237.313 583.437 246.452 576.033 257.682 571.678 269.423 570.987 320.573 568.287 313.033 639.577 233.813 623.887M233.816 623.907C267.416 630.207 263.136 651.517 272.616 675.807 273.978 679.394 276.312 682.532 279.356 684.867 299.356 699.867 335.357 670.097 346.227 650.697 363.077 626.117 376.107 598.397 389.227 571.967M407.166 529.337C416.311 529.337 423.726 521.923 423.726 512.777 423.726 503.631 416.311 496.2168 407.166 496.2168 398.02 496.2168 390.605 503.631 390.605 512.777 390.605 521.923 398.02 529.337 407.166 529.337ZM389.245 571.966C375.985 605.246 367.461 630.676 363.675 648.256 360.405 675.026 367.105 687.116 378.185 689.736 402.565 695.496 448.095 655.376 454.995 624.736 468.235 565.876 554.045 544.036 573.835 613.136M573.836 613.117C554.046 544.017 468.076 565.857 454.996 624.717 451.236 649.157 458.716 666.817 471.536 677.447 478.487 683.111 486.774 686.898 495.606 688.447 509.998 690.977 524.823 688.659 537.756 681.857 538.556 681.437 539.356 680.997 540.156 680.537 548.308 675.751 555.248 669.153 560.44 661.254 565.632 653.355 568.936 644.368 570.096 634.987 572.956 612.677 579.906 588.137 584.456 571.567M584.454 571.557C577.224 597.907 563.964 643.227 570.634 669.637 572.147 675.772 575.986 681.08 581.339 684.438 586.692 687.797 593.141 688.944 599.324 687.637 617.254 683.737 635.644 665.637 646.954 647.817`;
const logo = Skia.Path.MakeFromSVGString(path)!;
const bounds = logo.computeTightBounds();

function createBufferWithData(
  device: GPUDevice,
  data: Float32Array | Uint32Array,
  usage: GPUBufferUsageFlags
) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
  });
  device.queue.writeBuffer(buffer, 0, data as unknown as BufferSource);
  return buffer;
}

type Model = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexFormat: GPUIndexFormat;
  vertexCount: number;
};

const settings = {
  barycentricCoordinatesBased: false,
  thickness: 2,
  alphaThreshold: 0.5,
  animate: true,
  lines: true,
  depthBias: 1,
  depthBiasSlopeScale: 0.5,
  models: true,
};

function createVertexAndIndexBuffer(
  device: GPUDevice,
  { vertices, indices }: { vertices: Float32Array; indices: Uint32Array }
): Model {
  const vertexBuffer = createBufferWithData(
    device,
    vertices,
    GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  );
  const indexBuffer = createBufferWithData(
    device,
    indices,
    GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  );
  return {
    vertexBuffer,
    indexBuffer,
    indexFormat: "uint32",
    vertexCount: indices.length,
  };
}

type ObjectInfo = {
  worldViewProjectionMatrixValue: Float32Array;
  worldMatrixValue: Float32Array;
  uniformValues: BufferSource;
  uniformBuffer: GPUBuffer;
  lineUniformValues: BufferSource;
  lineUniformBuffer: GPUBuffer;
  litBindGroup: GPUBindGroup;
  wireframeBindGroups: GPUBindGroup[];
  model: Model;
};

// // prettier-ignore
// const identityMatrix = [
//   1, 0, 0, 0, 0,
//   0, 1, 0, 0, 0,
//   0, 0, 1, 0, 0,
//   0, 0, 0, 1, 0,
// ];

// // prettier-ignore
// const grayscaleMatrix = [
//   0.2126, 0.7152, 0.0722, 0, 0,
//   0.2126, 0.7152, 0.0722, 0, 0,
//   0.2126, 0.7152, 0.0722, 0, 0,
//   0,      0,      0,      1, 0,
// ];

export function Wireframes() {
  const { width, height } = useWindowDimensions();
  const [image, setImage] = useState<SkImage | null>(null);
  const renderRef = useRef<((ts: number) => void) | null>(null);
  const frameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const progress = useLoop({ duration: 3000 });

  // const colorMatrix = useDerivedValue(() => {
  //   return identityMatrix.map((identity, i) =>
  //     mix(progress.value, identity, grayscaleMatrix[i])
  //   );
  // });

  const pd = PixelRatio.get();
  const canvasWidth = Math.floor(width * pd);
  const canvasHeight = Math.floor(height * pd);
  const clip = useDerivedValue(() => {
    const transform = fitbox(
      "contain",
      bounds,
      rect(20, 20, width - 40, height - 40)
    );
    const transformed = logo.transform(processTransform3d(transform));
    const trimmed = Skia.Path.Trim(transformed, 0, progress.value, false);
    if (!trimmed) {
      return transformed;
    }
    const stroked = Skia.Path.Stroke(trimmed, {
      width: 20,
      join: StrokeJoin.Round,
      cap: StrokeCap.Round,
    });
    return stroked ?? trimmed;
  });
  //rect(0, 0, 300, (300 * bounds.height) / bounds.width);

  useEffect(() => {
    const device = importDevice(Skia.getNativeDevice());
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const depthFormat = "depth24plus";

    const models = Object.values(modelData).map((data) =>
      createVertexAndIndexBuffer(device, data)
    );

    const litModule = device.createShaderModule({
      code: solidColorLitWGSL,
    });

    const wireframeModule = device.createShaderModule({
      code: wireframeWGSL,
    });

    const litBindGroupLayout = device.createBindGroupLayout({
      label: "lit bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    const litPipeline = device.createRenderPipeline({
      label: "lit pipeline",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [litBindGroupLayout],
      }),
      vertex: {
        module: litModule,
        buffers: [
          {
            arrayStride: 6 * 4, // position, normal
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                // normal
                shaderLocation: 1,
                offset: 3 * 4,
                format: "float32x3",
              },
            ],
          },
        ],
      },
      fragment: {
        module: litModule,
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        cullMode: "back",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        depthBias: settings.depthBias,
        depthBiasSlopeScale: settings.depthBiasSlopeScale,
        format: depthFormat,
      },
    });

    const wireframePipeline = device.createRenderPipeline({
      label: "wireframe pipeline",
      layout: "auto",
      vertex: {
        module: wireframeModule,
        entryPoint: "vsIndexedU32",
      },
      fragment: {
        module: wireframeModule,
        entryPoint: "fs",
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        topology: "line-list",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less-equal",
        format: depthFormat,
      },
    });

    const barycentricCoordinatesBasedWireframePipeline =
      device.createRenderPipeline({
        label: "barycentric coordinates based wireframe pipeline",
        layout: "auto",
        vertex: {
          module: wireframeModule,
          entryPoint: "vsIndexedU32BarycentricCoordinateBasedLines",
        },
        fragment: {
          module: wireframeModule,
          entryPoint: "fsBarycentricCoordinateBasedLines",
          targets: [
            {
              format: presentationFormat,
              blend: {
                color: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                },
                alpha: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                },
              },
            },
          ],
        },
        primitive: {
          topology: "triangle-list",
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less-equal",
          format: depthFormat,
        },
      });

    const objectInfos: ObjectInfo[] = [];

    const numObjects = 150;
    for (let i = 0; i < numObjects; ++i) {
      const uniformValues = new Float32Array(16 + 16 + 4);
      const uniformBuffer = device.createBuffer({
        size: uniformValues.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const kWorldViewProjectionMatrixOffset = 0;
      const kWorldMatrixOffset = 16;
      const kColorOffset = 32;
      const worldViewProjectionMatrixValue = uniformValues.subarray(
        kWorldViewProjectionMatrixOffset,
        kWorldViewProjectionMatrixOffset + 16
      );
      const worldMatrixValue = uniformValues.subarray(
        kWorldMatrixOffset,
        kWorldMatrixOffset + 15
      );
      const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
      colorValue.set(randColor());

      const model = randElement(models);

      const litBindGroup = device.createBindGroup({
        layout: litBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      const lineUniformValues = new Float32Array(3 + 1);
      const lineUniformValuesAsU32 = new Uint32Array(lineUniformValues.buffer);
      const lineUniformBuffer = device.createBuffer({
        size: lineUniformValues.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      lineUniformValuesAsU32[0] = 6; // array stride for positions

      const wireframeBindGroup = device.createBindGroup({
        layout: wireframePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: model.vertexBuffer } },
          { binding: 2, resource: { buffer: model.indexBuffer } },
          { binding: 3, resource: { buffer: lineUniformBuffer } },
        ],
      });

      const barycentricCoordinatesBasedWireframeBindGroup =
        device.createBindGroup({
          layout:
            barycentricCoordinatesBasedWireframePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: model.vertexBuffer } },
            { binding: 2, resource: { buffer: model.indexBuffer } },
            { binding: 3, resource: { buffer: lineUniformBuffer } },
          ],
        });

      objectInfos.push({
        worldViewProjectionMatrixValue,
        worldMatrixValue,
        uniformValues,
        uniformBuffer,
        lineUniformValues,
        lineUniformBuffer,
        litBindGroup,
        wireframeBindGroups: [
          wireframeBindGroup,
          barycentricCoordinatesBasedWireframeBindGroup,
        ],
        model,
      });
    }

    // Update line uniforms
    objectInfos.forEach(({ lineUniformBuffer, lineUniformValues }) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      lineUniformValues[1] = settings.thickness;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      lineUniformValues[2] = settings.alphaThreshold;
      device.queue.writeBuffer(lineUniformBuffer, 0, lineUniformValues);
    });

    // Create render target texture
    const texture = device.createTexture({
      size: [canvasWidth, canvasHeight, 1],
      format: presentationFormat,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Create depth texture
    const depthTexture = device.createTexture({
      size: [canvasWidth, canvasHeight],
      format: depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "wireframe render pass",
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    let time = 0.0;

    const render = (ts: number) => {
      if (settings.animate) {
        time = ts * 0.001;
      }

      const fov = (60 * Math.PI) / 180;
      const aspect = canvasWidth / canvasHeight;
      const projection = mat4Perspective(fov, aspect, 0.1, 1000);

      const view = mat4LookAt(
        [-300, 0, 300] as Vec3,
        [0, 0, 0] as Vec3,
        [0, 1, 0] as Vec3
      );

      const viewProjection = mat4Multiply(projection, view);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(litPipeline);

      objectInfos.forEach(
        (
          {
            uniformBuffer,
            uniformValues,
            worldViewProjectionMatrixValue,
            worldMatrixValue,
            litBindGroup,
            model: { vertexBuffer, indexBuffer, indexFormat, vertexCount },
          },
          i
        ) => {
          const world = mat4Identity();
          mat4Translate(
            world,
            [0, 0, Math.sin(i * 3.721 + time * 0.1) * 200] as Vec3,
            world
          );
          mat4RotateX(world, i * 4.567, world);
          mat4RotateY(world, i * 2.967, world);
          mat4Translate(
            world,
            [0, 0, Math.sin(i * 9.721 + time * 0.1) * 200] as Vec3,
            world
          );
          mat4RotateX(world, time * 0.53 + i, world);

          mat4Multiply(viewProjection, world, worldViewProjectionMatrixValue);
          mat3FromMat4(world, worldMatrixValue);

          device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

          if (settings.models) {
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setIndexBuffer(indexBuffer, indexFormat);
            pass.setBindGroup(0, litBindGroup);
            pass.drawIndexed(vertexCount);
          }
        }
      );

      if (settings.lines) {
        const [bindGroupNdx, countMult, pipeline] =
          settings.barycentricCoordinatesBased
            ? [1, 1, barycentricCoordinatesBasedWireframePipeline]
            : [0, 2, wireframePipeline];
        pass.setPipeline(pipeline);
        objectInfos.forEach(
          ({ wireframeBindGroups, model: { vertexCount } }) => {
            pass.setBindGroup(0, wireframeBindGroups[bindGroupNdx]);
            pass.draw(vertexCount * countMult);
          }
        );
      }

      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);

      // Convert texture to SkImage
      const skImage = Skia.Image.MakeImageFromNativeTexture(
        texture.nativePointer
      );
      setImage(skImage);
    };

    renderRef.current = render;

    // Animation loop
    let running = true;
    const animate = (ts: number) => {
      if (!running) {
        return;
      }
      render(ts);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

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

  return (
    <View style={style.container}>
      <Canvas style={{ flex: 1 }}>
        {image && (
          <Image
            image={image}
            x={0}
            y={0}
            height={height}
            width={width}
            fit="cover"
          ></Image>
        )}
        <Group clip={clip}>
          {image && (
            <Image
              image={image}
              x={0}
              y={0}
              height={height}
              width={width}
              fit="cover"
            >
              <ColorMatrix
                matrix={[
                  -1, 0, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, 0, 1, 0,
                ]}
              />
            </Image>
          )}
          <Fill color="rgba(255, 255, 255, 0.4)" />
        </Group>
        {/* <Path
          path={clip}
          color="rgba(0,0,0,0.5)"
          strokeCap="round"
          strokeJoin="round"
          style="stroke"
          strokeWidth={20}
        /> */}
        {/* <BackdropBlur blur={4} clip={clip}>
          <Fill color="rgba(0, 0, 0, 0.2)" />
        </BackdropBlur>
*/}
      </Canvas>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});
