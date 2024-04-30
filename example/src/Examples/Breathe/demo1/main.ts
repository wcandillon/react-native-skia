import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from './cube';

import {basicVertWGSL, vertexPositionColorWGSL} from './shaders';
import { gpu } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

const GPUBufferUsage = {
  None: 0x00000000,
  MapRead: 0x00000001,
  MapWrite: 0x00000002,
  CopyStr: 0x00000004,
  COPY_DST: 0x00000008,
  Index: 0x00000010,
	VERTEX: 0x00000020,
	UNIFORM: 0x00000040,
	Storage: 0x00000080,
	Indirect: 0x00000100,
	QueryResolve: 0x00000200,
	Force32: 0x7FFFFFFF
};

const GPUTextureUsage = {
  RENDER_ATTACHMENT: 0x00000010,
}

const {width, height} = Dimensions.get("window");

export const demo1 = async (context: GPUCanvasContext) => {
  const adapter = await gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const presentationFormat = 'rgba8unorm';
context.configure({
  device,
  format: presentationFormat,
  alphaMode: 'premultiplied',
});

// Create a vertex buffer from the cube data.
const verticesBuffer = device.createBuffer({
  size: cubeVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});

const mappedRange = verticesBuffer.getMappedRange(0, cubeVertexArray.byteLength);
new Float32Array(mappedRange).set(cubeVertexArray);
verticesBuffer.unmap();

const pipeline = device.createRenderPipeline({
  layout: 'auto',
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
            format: 'float32x4',
          },
          {
            // uv
            shaderLocation: 1,
            offset: cubeUVOffset,
            format: 'float32x2',
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
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',

    // Backface culling since the cube is solid piece of geometry.
    // Faces pointing away from the camera will be occluded by faces
    // pointing toward the camera.
    cullMode: 'back',
  },

  // Enable depth testing so that the fragment closest to the camera
  // is rendered in front.
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
});

const depthTexture = device.createTexture({
  size: { width, height },
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});


const uniformBufferSize = 4 * 16; // 4x4 matrix
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  mappedAtCreation: false
});

console.log(pipeline.getBindGroupLayout(0))

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      buffer: uniformBuffer,
    },
  ],
});



const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: context
           .getCurrentTexture()
           .createView(), // Assigned later

      clearValue: [0.5, 0.5, 0.5, 1.0],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: depthTexture.createView(),

    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};

console.log(renderPassDescriptor)

const aspect = width / height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
const modelViewProjectionMatrix = mat4.create();

function getTransformationMatrix() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
  const now = Date.now() / 1000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

   mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

   return modelViewProjectionMatrix as Float32Array;
}

function frame() {
  const transformationMatrix = getTransformationMatrix();
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    transformationMatrix.buffer,
    transformationMatrix.byteOffset,
    transformationMatrix.byteLength
  );
  // renderPassDescriptor.colorAttachments[0].view = context
  //   .getCurrentTexture()
  //   .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.draw(cubeVertexCount);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

};