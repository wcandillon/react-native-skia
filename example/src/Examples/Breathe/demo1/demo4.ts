import { mat4, vec3 } from "wgpu-matrix";
import { Dimensions } from "react-native";

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from "./cube";
import { basicVertWGSL, vertexPositionColorWGSL } from "./shaders";

const { width, height } = Dimensions.get("window");

export const demo4 = async (device: GPUDevice, context: GPUCanvasContext) => {
  // Create a vertex buffer from the cube data.
  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: 32, //GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  new Float32Array(
    verticesBuffer.getMappedRange(0, cubeVertexArray.byteLength)
  ).set(cubeVertexArray);
  verticesBuffer.unmap();
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: "float32x4",
            },
            {
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: vertexPositionColorWGSL,
      }),
      entryPoint: "main",
      targets: [
        {
          format: "rgba8unorm",
        },
      ],
    },
    primitive: {
      topology: "triangle-list",

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: "back",
    },

    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
    // depthStencil: {
    //   depthWriteEnabled: true,
    //   depthCompare: "less",
    //   format: "depth24plus",
    // },
  });

  // const depthTexture = device.createTexture({
  //   size: { width, height },
  //   format: "depth24plus",
  //   usage: GPUTextureUsage.RENDER_ATTACHMENT,
  // });

  const matrixSize = 4 * 16; // 4x4 matrix
  const offset = 256; // uniformBindGroup offset must be 256-byte aligned
  const uniformBufferSize = offset + matrixSize;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: offset,
          size: matrixSize,
        }
      },
    ],
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: offset,
          size: matrixSize,
        }
      },
    ],
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: [0.5, 0.5, 0.5, 1.0],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    // depthStencilAttachment: {
    //   view: depthTexture.createView(),

    //   depthClearValue: 1.0,
    //   depthLoadOp: "clear",
    //   depthStoreOp: "store",
    // },
  };

  const aspect = width / height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0
  );

  const modelMatrix1 = mat4.translation(vec3.create(-2, 0, 0));
  const modelMatrix2 = mat4.translation(vec3.create(2, 0, 0));
  const modelViewProjectionMatrix1 = mat4.create() as Float32Array;
  const modelViewProjectionMatrix2 = mat4.create() as Float32Array;
  const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -7));

  const tmpMat41 = mat4.create();
  const tmpMat42 = mat4.create();

  function updateTransformationMatrix() {
    const now = Date.now() / 1000;

    mat4.rotate(
      modelMatrix1,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0),
      1,
      tmpMat41
    );
    mat4.rotate(
      modelMatrix2,
      vec3.fromValues(Math.cos(now), Math.sin(now), 0),
      1,
      tmpMat42
    );

    mat4.multiply(viewMatrix, tmpMat41, modelViewProjectionMatrix1);
    mat4.multiply(
      projectionMatrix,
      modelViewProjectionMatrix1,
      modelViewProjectionMatrix1
    );
    mat4.multiply(viewMatrix, tmpMat42, modelViewProjectionMatrix2);
    mat4.multiply(
      projectionMatrix,
      modelViewProjectionMatrix2,
      modelViewProjectionMatrix2
    );
  }

  async function frame() {
    updateTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjectionMatrix1.buffer,
      modelViewProjectionMatrix1.byteOffset,
      modelViewProjectionMatrix1.byteLength
    );
    device.queue.writeBuffer(
      uniformBuffer,
      offset,
      modelViewProjectionMatrix2.buffer,
      modelViewProjectionMatrix2.byteOffset,
      modelViewProjectionMatrix2.byteLength
    );


    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer,
      0,
      cubeVertexArray.byteLength);

    // Bind the bind group (with the transformation matrix) for
    // each cube, and draw.
    passEncoder.setBindGroup(0, uniformBindGroup1);
    passEncoder.draw(cubeVertexCount);

    passEncoder.setBindGroup(0, uniformBindGroup2);
    passEncoder.draw(cubeVertexCount);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    //await device.queue.onSubmittedWorkDone();
    context.present();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
