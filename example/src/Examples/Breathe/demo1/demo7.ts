import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export class Bitmap {
  constructor(public data: Uint8Array, public width: number, public height: number) {}
}

export const demo7 = async (device: GPUDevice, context: GPUCanvasContext, img: Bitmap) => {

  const presentationFormat = 'rgba8unorm';


  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: 'our hardcoded textured quad shaders',
    code: `
    struct OurVertexShaderOutput {
      @builtin(position) position: vec4f,
      @location(0) texcoord: vec2f,
    };

    @vertex fn vs(
      @builtin(vertex_index) vertexIndex : u32
    ) -> OurVertexShaderOutput {
      let pos = array(
        // 1st triangle
        vec2f( 0.0,  0.0),  // center
        vec2f( 1.0,  0.0),  // right, center
        vec2f( 0.0,  1.0),  // center, top

        // 2st triangle
        vec2f( 0.0,  1.0),  // center, top
        vec2f( 1.0,  0.0),  // right, center
        vec2f( 1.0,  1.0),  // right, top
      );

      var vsOutput: OurVertexShaderOutput;
      let xy = pos[vertexIndex];
      vsOutput.position = vec4f(xy, 0.0, 1.0);
      vsOutput.texcoord = xy;
      return vsOutput;
    }

    @group(0) @binding(0) var ourSampler: sampler;
    @group(0) @binding(1) var ourTexture: texture_2d<f32>;

    @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
      return textureSample(ourTexture, ourSampler, fsInput.texcoord);// vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: "vs"
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
      entryPoint: "fs"
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const url =
    'https://webgpufundamentals.org/webgpu/resources/images/f-texture.png';
  const texture = device.createTexture({
    label: url,
    format: 'rgba8unorm',
    size: { width: img.width, height: img.height },
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.writeTexture(
    { texture: texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
    img.data.buffer,
    {
      offset: 0,
      bytesPerRow: 4 * img.width,
      rowsPerImage: img.height,
    },
    { width: img.width, height: img.height }
  );

    const sampler = device.createSampler({
      addressModeU: 0 & 1 ? 'repeat' : 'clamp-to-edge',
      addressModeV: 0 & 2 ? 'repeat' : 'clamp-to-edge',
      magFilter: 0 & 4 ? 'linear' : 'nearest',
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });


  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };


  function render() {

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6); // call our vertex shader 6 times
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
    context.present();
  }

  render();
};