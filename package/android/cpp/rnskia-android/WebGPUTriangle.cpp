#include "WebGPUTriangle.h"

#include <fbjni/fbjni.h>
#include <jni.h>
#include "RNSkLog.h"

#include "webgpu.h"

WGPUInstance instance;
WGPUDevice device;
WGPURenderPipeline pipeline;
void* window;

WGPUSwapChain swapChain;
const uint32_t kWidth = 512;
const uint32_t kHeight = 512;

void SetupSwapChain(WGPUSurface surface) {
  WGPUSwapChainDescriptor scDesc{
      .usage = WGPUTextureUsage_RenderAttachment,
      .format = WGPUTextureFormat_RGBA8Unorm,
      .width = kWidth,
      .height = kHeight,
      .presentMode = WGPUPresentMode_Fifo};
  swapChain = wgpuDeviceCreateSwapChain(device, surface, &scDesc);
}


void GetDevice(void (*callback)(WGPUDevice)) {
  wgpuInstanceRequestAdapter(
      instance,
      nullptr,
      // TODO(https://bugs.chromium.org/p/dawn/issues/detail?id=1892): Use
      // WGPURequestAdapterStatus, WGPUAdapter, and WGPUDevice.
      [](WGPURequestAdapterStatus status, WGPUAdapter adapter,
         const char* message, void* userdata) {
        if (status != WGPURequestAdapterStatus_Success) {
          exit(0);
        }
       // WGPUAdapter adapter = WGPUAdapter::Acquire(cAdapter);
        wgpuAdapterRequestDevice(
            adapter,
            nullptr,
            [](WGPURequestDeviceStatus status, WGPUDevice device,
               const char* message, void* userdata) {
              //WGPUDevice device = WGPUDevice::Acquire(cDevice);
              wgpuDeviceSetUncapturedErrorCallback(device,
                  [](WGPUErrorType type, const char* message, void* userdata) {
                    RNSkia::RNSkLogger::logToConsole("Error: " + std::to_string(type) + " - message: " + message);
                    //std::cout << "Error: " << type << " - message: " << message;
                  },
                  nullptr);
              reinterpret_cast<void (*)(WGPUDevice)>(userdata)(device);
            },
            userdata);
      },
      reinterpret_cast<void*>(callback));
}

const char shaderCode[] = R"(
    @vertex fn vertexMain(@builtin(vertex_index) i : u32) ->
      @builtin(position) vec4f {
        const pos = array(vec2f(0, 1), vec2f(-1, -1), vec2f(1, -1));
        return vec4f(pos[i], 0, 1);
    }
    @fragment fn fragmentMain() -> @location(0) vec4f {
        return vec4f(1, 0, 0, 1);
    }
)";

void CreateRenderPipeline() {
  WGPUShaderModuleWGSLDescriptor wgslDesc{};
  wgslDesc.code = shaderCode;
  wgslDesc.chain.sType = WGPUSType_ShaderModuleWGSLDescriptor; // Ensure this is set correctly.
  wgslDesc.chain.next = nullptr; // Assuming this is the end of the chain.

  WGPUShaderModuleDescriptor shaderModuleDescriptor{};
  shaderModuleDescriptor.nextInChain = reinterpret_cast<const WGPUChainedStruct*>(&wgslDesc);
  WGPUShaderModule shaderModule = wgpuDeviceCreateShaderModule(device, &shaderModuleDescriptor);

  WGPUColorTargetState colorTargetState{
      .format = WGPUTextureFormat_RGBA8Unorm};

  WGPUFragmentState fragmentState{.module = shaderModule,
                                    .targetCount = 1,
                                    .targets = &colorTargetState};

  WGPURenderPipelineDescriptor descriptor{
      .vertex = {.module = shaderModule},
      .fragment = &fragmentState,
      .multisample = {
        .count = 1, // Set to 1 for no multisampling, higher for actual multisampling
      //  .mask = ~0u, // Use all samples
      //  .alphaToCoverageEnabled = false // Typically false unless using alpha-to-coverage as a multisampling technique
      }
  };
  pipeline = wgpuDeviceCreateRenderPipeline(device, &descriptor);
}

void Render() {
  RNSkia::RNSkLogger::logToConsole("Render()");

  WGPURenderPassColorAttachment attachment {
      .view = wgpuSwapChainGetCurrentTextureView(swapChain),
      .loadOp = WGPULoadOp_Clear,
      .clearValue = WGPUColor{0, 0, 0, 1},
      .storeOp = WGPUStoreOp_Store,
  };

  WGPURenderPassDescriptor renderpass{
    .colorAttachmentCount = 1,
    .colorAttachments = &attachment
  };

  WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(device, nullptr);

  WGPURenderPassEncoder pass = wgpuCommandEncoderBeginRenderPass(encoder, &renderpass);

  wgpuRenderPassEncoderSetPipeline(pass, pipeline);
  wgpuRenderPassEncoderDraw(pass, 3, 1, 0, 0);
  wgpuRenderPassEncoderEnd(pass);
  WGPUCommandBuffer commands = wgpuCommandEncoderFinish(encoder, nullptr);

  auto queue = wgpuDeviceGetQueue(device);
  wgpuQueueSubmit(queue, 1, &commands);
}

void InitGraphics(WGPUSurface surface) {
  SetupSwapChain(surface);
  CreateRenderPipeline();
}

void Start() {
    WGPUSurfaceDescriptorFromAndroidNativeWindow androidSurfaceDesc = {};
    androidSurfaceDesc.chain.sType = WGPUSType_SurfaceDescriptorFromAndroidNativeWindow;
    androidSurfaceDesc.window = window;

    // Set up the generic surface descriptor to use the platform-specific one
    WGPUSurfaceDescriptor surfaceDesc = {};
    surfaceDesc.nextInChain = reinterpret_cast<const WGPUChainedStruct*>(&androidSurfaceDesc);
    WGPUSurface s = wgpuInstanceCreateSurface(instance, &surfaceDesc);
    InitGraphics(s);
    Render();
    wgpuSwapChainPresent(swapChain);
    //wgpuInstanceProcessEvents(instance);
}

void runTriangleDemo(void* w, int width, int height) {
    window = w;
    instance = wgpuCreateInstance(nullptr);
    // Instance creation

    GetDevice([](WGPUDevice dev) {
      device = dev;

      Start();
    });

}