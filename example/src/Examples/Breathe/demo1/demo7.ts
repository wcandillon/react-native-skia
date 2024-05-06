import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const demo7 = async (device: GPUDevice, context: GPUCanvasContext, textureData: Uint8Array) => {
 
    const swapChainFormat = 'bgra8unorm';

    const vertexShaderModule = device.createShaderModule({
      code: `
      @vertex
        fn main( @location(0) position: vec2f) -> @builtin(position) vec4f {
          return vec4f(position, 0.0, 1.0);
        }
      `,
    });
  
    const fragmentShaderModule = device.createShaderModule({
      code: `
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

      @fragment
      fn main(@location(0) fragUV: vec2f) -> @location(0) vec4f {
        return textureSample(myTexture, mySampler, fragUV);
      }
      `,
    });
  
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'main',
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'main',
        targets: [
          {
            format: swapChainFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  
    const texture = device.createTexture({
      size: {
        width: width,
        height: height,
        depthOrArrayLayers: 1,
      },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
  
    const textureView = texture.createView();
  
  
    device.queue.writeTexture(
      { texture: texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
      textureData.buffer,
      {
        offset: 0,
        bytesPerRow: 4 * width,
        rowsPerImage: height,
      },
      { width, height }
    );
  
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: [0.5, 0.5, 0.5, 1.0],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };
    const sampler = device.createSampler({
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: textureView,
        },
        {
          binding: 1,
          resource: sampler,
        },
      ],
    }));
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();
  
    device.queue.submit([commandEncoder.finish()]);
    context.present();
};