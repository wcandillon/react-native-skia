#pragma once

#include <memory>

#include "webgpu/webgpu_cpp.h"

#include "dawn/dawn_proc.h"
#include "dawn/native/DawnNative.h"

#include "DawnWindowContext.h"

#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Context.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "include/gpu/graphite/dawn/DawnTypes.h"
#include "include/gpu/graphite/dawn/DawnUtils.h"

#include "src/gpu/graphite/ContextOptionsPriv.h"

namespace RNSkia {

class DawnContext {
public:
  std::unique_ptr<dawn::native::Instance> instance;
  std::unique_ptr<skgpu::graphite::Context> fGraphiteContext;
  std::unique_ptr<skgpu::graphite::Recorder> fGraphiteRecorder;

  // Delete copy constructor and assignment operator
  DawnContext(const DawnContext &) = delete;
  DawnContext &operator=(const DawnContext &) = delete;

  // Get instance for current thread
  static DawnContext &getInstance() {
    static thread_local DawnContext instance;
    return instance;
  }

  sk_sp<SkImage> MakeImageFromBuffer(void *buffer) {
    // TODO: implement
    return nullptr;
  }

  // Create offscreen surface
  sk_sp<SkSurface> MakeOffscreen(int width, int height) {
    // Create SkImageInfo for offscreen surface
    // TODO: RGBA on Android here
    SkImageInfo imageInfo = SkImageInfo::Make(
        width, height, kBGRA_8888_SkColorType, kPremul_SkAlphaType);

    // Create an offscreen	 SkSurface
    sk_sp<SkSurface> skSurface =
        SkSurfaces::RenderTarget(fGraphiteRecorder.get(), imageInfo);

    if (!skSurface) {
      throw std::runtime_error("Failed to create offscreen Skia surface.");
    }

    return skSurface;
  }

  // Create onscreen surface with window
  std::unique_ptr<WindowContext> MakeWindow(void *window, int width,
                                            int height) {
    // 1. Create Surface
    wgpu::SurfaceDescriptor surfaceDescriptor;
#ifdef __APPLE__
    wgpu::SurfaceDescriptorFromMetalLayer metalSurfaceDesc;
    metalSurfaceDesc.layer = window;
    surfaceDescriptor.nextInChain = &metalSurfaceDesc;
#elif __ANDROID__
    wgpu::SurfaceDescriptorFromAndroidNativeWindow androidSurfaceDesc;
    androidSurfaceDesc.window = window;
    surfaceDescriptor.nextInChain = &androidSurfaceDesc;
#endif
    auto surface =
        wgpu::Instance(instance->Get()).CreateSurface(&surfaceDescriptor);
    return std::make_unique<DawnWindowContext>(
        fGraphiteContext.get(), fGraphiteRecorder.get(), backendContext.fDevice,
        surface, width, height);
  }

  void tick() { backendContext.fTick(backendContext.fInstance); }

private:
  skgpu::graphite::DawnBackendContext backendContext;

  DawnContext() {
    auto useTintIR = true;
    static constexpr const char *kToggles[] = {
        "allow_unsafe_apis", // Needed for dual-source blending.
        "use_user_defined_labels_in_backend",
        // Robustness impacts performance and is always disabled when running
        // Graphite in Chrome, so this keeps Skia's tests operating closer to
        // real-use behavior.
        "disable_robustness",
        // Must be last to correctly respond to `useTintIR` parameter.
        "use_tint_ir",
    };
    wgpu::DawnTogglesDescriptor togglesDesc;
    togglesDesc.enabledToggleCount = std::size(kToggles) - (useTintIR ? 0 : 1);
    togglesDesc.enabledToggles = kToggles;

    {
      DawnProcTable backendProcs = dawn::native::GetProcs();
      dawnProcSetProcs(&backendProcs);
      WGPUInstanceDescriptor desc{};
      // need for WaitAny with timeout > 0
      desc.features.timedWaitAnyEnable = true;
      instance = std::make_unique<dawn::native::Instance>(&desc);
    }

    dawn::native::Adapter matchedAdaptor;

    wgpu::RequestAdapterOptions options;
    options.compatibilityMode = true;
#ifdef __APPLE__
    constexpr auto kDefaultBackendType = wgpu::BackendType::Metal;
#elif __ANDROID__
    constexpr auto kDefaultBackendType = wgpu::BackendType::Vulkan;
#endif
    //    options.compatibilityMode = backend == wgpu::BackendType::OpenGL ||
    //                                backend == wgpu::BackendType::OpenGLES;
    options.backendType = kDefaultBackendType;
    options.nextInChain = &togglesDesc;
    std::vector<dawn::native::Adapter> adapters =
        instance->EnumerateAdapters(&options);
    // TODO: throw instead
    SkASSERT(!adapters.empty());
    // Sort adapters by adapterType(DiscreteGPU, IntegratedGPU, CPU) and
    // backendType(WebGPU, D3D11, D3D12, Metal, Vulkan, OpenGL, OpenGLES).
    // TODO: is Vulkan not available or is Vulkan Software adapter we may want
    // to switch to OpenGL with compability mode true
    std::sort(adapters.begin(), adapters.end(),
              [](dawn::native::Adapter a, dawn::native::Adapter b) {
                wgpu::AdapterInfo infoA;
                wgpu::AdapterInfo infoB;
                a.GetInfo(&infoA);
                b.GetInfo(&infoB);
                return std::tuple(infoA.adapterType, infoA.backendType) <
                       std::tuple(infoB.adapterType, infoB.backendType);
              });

    for (const auto &adapter : adapters) {
      wgpu::AdapterInfo props;
      adapter.GetInfo(&props);
      if (kDefaultBackendType == props.backendType) {
        matchedAdaptor = adapter;
        break;
      }
    }

    if (!matchedAdaptor) {
      throw std::runtime_error("No matching adapter found");
    }

#if LOG_ADAPTER
    wgpu::AdapterInfo info;
    // sAdapter.GetInfo(&info);
    // SkDebugf("GPU: %s\nDriver: %s\n", info.device, info.description);
#endif

    std::vector<wgpu::FeatureName> features;
    wgpu::Adapter adapter = matchedAdaptor.Get();
    if (adapter.HasFeature(wgpu::FeatureName::MSAARenderToSingleSampled)) {
      features.push_back(wgpu::FeatureName::MSAARenderToSingleSampled);
    }
    if (adapter.HasFeature(wgpu::FeatureName::TransientAttachments)) {
      features.push_back(wgpu::FeatureName::TransientAttachments);
    }
    if (adapter.HasFeature(wgpu::FeatureName::Unorm16TextureFormats)) {
      features.push_back(wgpu::FeatureName::Unorm16TextureFormats);
    }
    if (adapter.HasFeature(wgpu::FeatureName::DualSourceBlending)) {
      features.push_back(wgpu::FeatureName::DualSourceBlending);
    }
    if (adapter.HasFeature(wgpu::FeatureName::FramebufferFetch)) {
      features.push_back(wgpu::FeatureName::FramebufferFetch);
    }
    if (adapter.HasFeature(wgpu::FeatureName::BufferMapExtendedUsages)) {
      features.push_back(wgpu::FeatureName::BufferMapExtendedUsages);
    }
    if (adapter.HasFeature(wgpu::FeatureName::TextureCompressionETC2)) {
      features.push_back(wgpu::FeatureName::TextureCompressionETC2);
    }
    if (adapter.HasFeature(wgpu::FeatureName::TextureCompressionBC)) {
      features.push_back(wgpu::FeatureName::TextureCompressionBC);
    }
    if (adapter.HasFeature(wgpu::FeatureName::R8UnormStorage)) {
      features.push_back(wgpu::FeatureName::R8UnormStorage);
    }
    if (adapter.HasFeature(wgpu::FeatureName::DawnLoadResolveTexture)) {
      features.push_back(wgpu::FeatureName::DawnLoadResolveTexture);
    }
    if (adapter.HasFeature(wgpu::FeatureName::DawnPartialLoadResolveTexture)) {
      features.push_back(wgpu::FeatureName::DawnPartialLoadResolveTexture);
    }

    wgpu::DeviceDescriptor desc;
    desc.requiredFeatureCount = features.size();
    desc.requiredFeatures = features.data();
    desc.nextInChain = &togglesDesc;
    desc.SetDeviceLostCallback(
        wgpu::CallbackMode::AllowSpontaneous,
        [](const wgpu::Device &, wgpu::DeviceLostReason reason,
           const char *message) {
          if (reason != wgpu::DeviceLostReason::Destroyed) {
            SK_ABORT("Device lost: %s\n", message);
          }
        });
    desc.SetUncapturedErrorCallback(
        [](const wgpu::Device &, wgpu::ErrorType, const char *message) {
          SkDebugf("Device error: %s\n", message);
        });

    wgpu::Device device =
        wgpu::Device::Acquire(matchedAdaptor.CreateDevice(&desc));
    SkASSERT(device);

    backendContext.fInstance = wgpu::Instance(instance->Get());
    backendContext.fDevice = device;
    backendContext.fQueue = device.GetQueue();
    skgpu::graphite::ContextOptions ctxOptions;
    // skgpu::graphite::ContextOptionsPriv contextOptionsPriv;
    // ctxOptions.fOptionsPriv = &contextOptionsPriv;
    // ctxOptions.fOptionsPriv->fStoreContextRefInRecorder = true;
    fGraphiteContext =
        skgpu::graphite::ContextFactory::MakeDawn(backendContext, ctxOptions);
    if (!fGraphiteContext) {
      throw std::runtime_error("Failed to create graphite context");
    }
    skgpu::graphite::RecorderOptions recorderOptions;
    fGraphiteRecorder = fGraphiteContext->makeRecorder(recorderOptions);
    if (!fGraphiteRecorder) {
      throw std::runtime_error("Failed to create graphite context");
    }
  }
};

} // namespace RNSkia
