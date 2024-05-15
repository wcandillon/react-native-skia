#include "WebGPUTriangle.h"

#include "RNSkLog.h"
#include <android/native_window.h>
#include <fbjni/fbjni.h>
#include <jni.h>

#include "dawn/webgpu_cpp.h"

using namespace wgpu;

namespace RNSkia {

void runTriangleDemo(void *window, int width, int height) {
  RNSkia::RNSkLogger::logToConsole("width: %d, height: %d", width, height);
  auto instance = CreateInstance(nullptr);
  if (!instance) {
    RNSkia::RNSkLogger::logToConsole("Failed to create WebGPU instance");
    return;
  }
  SurfaceDescriptorFromAndroidNativeWindow androidSurfaceDesc = {};
  androidSurfaceDesc.window = window;

  // Set up the generic surface descriptor to use the platform-specific one
  SurfaceDescriptor surfaceDesc = {};
  surfaceDesc.nextInChain =
      reinterpret_cast<const ChainedStruct *>(&androidSurfaceDesc);
  Surface surface = instance.CreateSurface(&surfaceDesc);

  RNSkia::RNSkLogger::logToConsole("Requesting adapter...");
  RequestAdapterOptions adapterOpts;

  wgpu::Adapter adapter = nullptr;
  instance.RequestAdapter(
      nullptr,
      [](WGPURequestAdapterStatus, WGPUAdapter cAdapter, const char *message,
         void *userdata) {
        if (message != nullptr) {
          fprintf(stderr, "%s", message);
          return;
        }
        *static_cast<wgpu::Adapter *>(userdata) =
            wgpu::Adapter::Acquire(cAdapter);
      },
      &adapter);

  wgpu::Device device = nullptr;
  adapter.RequestDevice(
      nullptr,
      [](WGPURequestDeviceStatus, WGPUDevice cDevice, const char *message,
         void *userdata) {
        if (message != nullptr) {
          fprintf(stderr, "%s", message);
          return;
        }
        *static_cast<wgpu::Device *>(userdata) = wgpu::Device::Acquire(cDevice);
      },
      &device);

  DeviceDescriptor deviceDesc;
  deviceDesc.label = "My Device";
  // deviceDesc.requiredFeaturesCount = 0;
  deviceDesc.requiredLimits = nullptr;
  deviceDesc.defaultQueue.label = "The default queue";

  // Add an error callback for more debug info
  //          auto h = device.SetUncapturedErrorCallback(
  //              [=](ErrorType type, char const *message, void *userData) {
  //                RNSkia::RNSkLogger::logToConsole("error: %s", message);
  //                RNSkia::RNSkLogger::logToConsole("GOT DEVICE");
  //              },
  //              nullptr);
  Queue queue = device.GetQueue();

  RNSkia::RNSkLogger::logToConsole("Creating swap chain...");
  //  TextureFormat swapChainFormat = surface.GetPreferredFormat(
  //    adapter); // 	TextureFormat swapChainFormat =
  // TextureFormat::BGRA8Unorm;
  SwapChainDescriptor swapChainDesc;
  swapChainDesc.width = width;
  swapChainDesc.height = height;
  swapChainDesc.usage = TextureUsage::RenderAttachment;
  swapChainDesc.format = TextureFormat::RGBA8Unorm;
  swapChainDesc.presentMode = PresentMode::Fifo;
  SwapChain swapChain = device.CreateSwapChain(surface, &swapChainDesc);

  RNSkia::RNSkLogger::logToConsole("Creating shader module.");
  const char *shaderSource = R"(
@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4<f32> {
	var p = vec2f(0.0, 0.0);
	if (in_vertex_index == 0u) {
		p = vec2f(-0.5, -0.5);
	} else if (in_vertex_index == 1u) {
		p = vec2f(0.5, -0.5);
	} else {
		p = vec2f(0.0, 0.5);
	}
	return vec4f(p, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    return vec4f(0.3, 0.6, 1.0, 1.0);
}
)";

  ShaderModuleDescriptor shaderDesc;
  // shaderDesc.hintCount = 0;
  // shaderDesc.hints = nullptr;
  //  Use the extension mechanism to load a WGSL shader source code
  ShaderModuleWGSLDescriptor shaderCodeDesc;
  // Set the chained struct's header
  // Connect the chain
  shaderDesc.nextInChain = &shaderCodeDesc;

  // Setup the actual payload of the shader code descriptor
  shaderCodeDesc.code = shaderSource;

  auto shaderModule = device.CreateShaderModule(&shaderDesc);
  RNSkia::RNSkLogger::logToConsole("Creating rendering pipeline.");
  RenderPipelineDescriptor pipelineDesc;

  // Vertex fetch
  // (We don't use any input buffer so far)
  pipelineDesc.vertex.bufferCount = 0;
  pipelineDesc.vertex.buffers = nullptr;

  // Vertex shader
  pipelineDesc.vertex.module = shaderModule;
  pipelineDesc.vertex.entryPoint = "vs_main";
  pipelineDesc.vertex.constantCount = 0;
  pipelineDesc.vertex.constants = nullptr;

  // Primitive assembly and rasterization
  // Each sequence of 3 vertices is considered as a triangle
  pipelineDesc.primitive.topology = PrimitiveTopology::TriangleList;
  // We'll see later how to specify the order in which vertices should
  // be connected. When not specified, vertices are considered
  // sequentially.
  pipelineDesc.primitive.stripIndexFormat = IndexFormat::Undefined;
  // The face orientation is defined by assuming that when looking
  // from the front of the face, its corner vertices are enumerated
  // in the counter-clockwise (CCW) order.
  pipelineDesc.primitive.frontFace = FrontFace::CCW;
  // But the face orientation does not matter much because we do not
  // cull (i.e. "hide") the faces pointing away from us (which is often
  // used for optimization).
  pipelineDesc.primitive.cullMode = CullMode::None;

  // Fragment shader
  FragmentState fragmentState;
  pipelineDesc.fragment = &fragmentState;
  fragmentState.module = shaderModule;
  fragmentState.entryPoint = "fs_main";
  fragmentState.constantCount = 0;
  fragmentState.constants = nullptr;

  // Configure blend state
  BlendState blendState;
  // Usual alpha blending for the color:
  blendState.color.srcFactor = BlendFactor::SrcAlpha;
  blendState.color.dstFactor = BlendFactor::OneMinusSrcAlpha;
  blendState.color.operation = BlendOperation::Add;
  // We leave the target alpha untouched:
  blendState.alpha.srcFactor = BlendFactor::Zero;
  blendState.alpha.dstFactor = BlendFactor::One;
  blendState.alpha.operation = BlendOperation::Add;

  ColorTargetState colorTarget;
  colorTarget.format = TextureFormat::RGBA8Unorm;
  colorTarget.blend = &blendState;
  colorTarget.writeMask = ColorWriteMask::All; // We could write to only some
                                               // of the color channels.

  // We have only one target because our render pass has only one output
  // color attachment.
  fragmentState.targetCount = 1;
  fragmentState.targets = &colorTarget;

  // Depth and stencil tests are not used here
  pipelineDesc.depthStencil = nullptr;

  // Multi-sampling
  // Samples per pixel
  pipelineDesc.multisample.count = 1;
  // Default value for the mask, meaning "all bits on"
  pipelineDesc.multisample.mask = ~0u;
  // Default value as well (irrelevant for count = 1 anyways)
  pipelineDesc.multisample.alphaToCoverageEnabled = false;

  // Pipeline layout
  pipelineDesc.layout = nullptr;

  RenderPipeline pipeline = device.CreateRenderPipeline(&pipelineDesc);

  //  while (true) {
  // wgpuInstanceProcessEvents(instance);

  TextureView nextTexture = swapChain.GetCurrentTextureView();
  if (!nextTexture) {
    RNSkia::RNSkLogger::logToConsole("Cannot acquire next swap chain texture");
    // return;
  }

  CommandEncoderDescriptor commandEncoderDesc;
  commandEncoderDesc.label = "Command Encoder";
  CommandEncoder encoder = device.CreateCommandEncoder(&commandEncoderDesc);

  RenderPassDescriptor renderPassDesc;

  RenderPassColorAttachment renderPassColorAttachment;
  renderPassColorAttachment.view = nextTexture;
  renderPassColorAttachment.resolveTarget = nullptr;
  renderPassColorAttachment.loadOp = LoadOp::Clear;
  renderPassColorAttachment.storeOp = StoreOp::Store;
  renderPassColorAttachment.depthSlice = UINT32_MAX;
  renderPassColorAttachment.clearValue = Color{0.0, 1.0, 1.0, 1.0};
  renderPassDesc.colorAttachmentCount = 1;
  renderPassDesc.colorAttachments = &renderPassColorAttachment;

  renderPassDesc.depthStencilAttachment = nullptr;
  // renderPassDesc.timestampWriteCount = 0;
  renderPassDesc.timestampWrites = nullptr;
  RenderPassEncoder renderPass = encoder.BeginRenderPass(&renderPassDesc);

  // In its overall outline, drawing a triangle is as simple as this:
  // Select which render pipeline to use
  renderPass.SetPipeline(pipeline);
  // Draw 1 instance of a 3-vertices shape
  renderPass.Draw(3, 1, 0, 0);

  renderPass.End();

  CommandBufferDescriptor cmdBufferDescriptor;
  cmdBufferDescriptor.label = "Command buffer";
  CommandBuffer command = encoder.Finish(&cmdBufferDescriptor);
  std::vector<CommandBuffer> commands;
  commands.push_back(command);
  queue.Submit(commands.size(), commands.data());
  bool done = false;
  queue.OnSubmittedWorkDone(
      [](WGPUQueueWorkDoneStatus status, void *userdata) {
        RNSkia::RNSkLogger::logToConsole("Queue work done");
        auto done = static_cast<bool *>(userdata);
        *done = true;
      },
      &done);
  RNSkia::RNSkLogger::logToConsole("Preprocess events");
  while (!done) {
    instance.ProcessEvents();
  }
  RNSkia::RNSkLogger::logToConsole("Present");
  swapChain.Present();

  // surface.release();
  // glfwDestroyWindow(window);
  // glfwTerminate();
}

} // namespace RNSkia