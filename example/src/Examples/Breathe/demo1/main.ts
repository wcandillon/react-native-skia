import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from './cube';

import {basicVertWGSL, vertexPositionColorWGSL} from './shaders';
import { Dimensions } from 'react-native';

const {width, height} = Dimensions.get("window");

// async function readGPUBuffer(device: GPUDevice, buffer: GPUBuffer, byteLength: number) {
//   const readBuffer = device.createBuffer({
//     size: byteLength,
//     usage: 9,//GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
//     mappedAtCreation: false
//   });
//   if (!readBuffer) {
//     console.error("Failed to create vertex buffer");
//   }

//   const commandEncoder = device.createCommandEncoder();
//   commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, byteLength);
//   const gpuCommands = commandEncoder.finish();
//   device.queue.submit([gpuCommands]);
//   console.log("Start reading buffer");
//   const b = readBuffer.getMappedRange(0, byteLength);
//   console.log(new Float32Array(b));
//   //await readBuffer.mapAsync(1, 0, cubeVertexArray.byteLength);//GPUMapMode.READ
//   console.log("End reading buffer");

//   //const copyArrayBuffer = readBuffer.getMappedRange();
//   readBuffer.unmap();
// }

export const demo1 = async (device: GPUDevice, context: GPUCanvasContext) => {


// Create a vertex buffer from the cube data.
const verticesBuffer = device.createBuffer({
  size: cubeVertexArray.byteLength,
  usage: 32,//GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});

if (!verticesBuffer) {
  console.error("Failed to create vertex buffer");
}
const mappedRange = verticesBuffer.getMappedRange(0, cubeVertexArray.byteLength);

const result = new Float32Array(mappedRange);
result.set(cubeVertexArray);

verticesBuffer.unmap();
//await readGPUBuffer(device, verticesBuffer, cubeVertexArray.byteLength);
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
        format: 'rgba8unorm',
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
  usage: 16,//GPUTextureUsage.RENDER_ATTACHMENT,
});


const uniformBufferSize = 4 * 16; // 4x4 matrix
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: 72,// GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  mappedAtCreation: false
});

if (!uniformBuffer) {
  console.error("Failed to create uniform buffer");

}

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      buffer: uniformBuffer,
    },
  ],
});

if (!uniformBindGroup) {
  console.error("Failed to create uniform bind group");
}



const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined,

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
  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.draw(cubeVertexCount);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  //readGPUBuffer(device, verticesBuffer, cubeVertexArray.byteLength);

  console.log("RENDER");
  //context.present();
 // requestAnimationFrame(frame);
}
frame();

};