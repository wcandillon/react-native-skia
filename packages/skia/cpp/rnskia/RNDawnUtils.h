#pragma once

#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif

#include "webgpu/webgpu_cpp.h"

#include "dawn/native/DawnNative.h"

#include "include/core/SkColorType.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "utils/RNSkLog.h"

namespace DawnUtils {

#ifdef __APPLE__
static const SkColorType PreferedColorType = kBGRA_8888_SkColorType;
static const wgpu::TextureFormat PreferredTextureFormat =
    wgpu::TextureFormat::BGRA8Unorm;
#else
static const SkColorType PreferedColorType = kRGBA_8888_SkColorType;
static const wgpu::TextureFormat PreferredTextureFormat =
    wgpu::TextureFormat::RGBA8Unorm;
#endif

// On-screen format used when the view requests high bit depth. The values
// stay sRGB-encoded (SDR), only with more precision than 8 bits per channel;
// this is about banding, not HDR.
// - Apple: 16-bit float, displayed through the extended sRGB layer colorspace
//   so colors match the 8-bit path exactly.
// - Android: 10-bit unorm. SurfaceFlinger quantizes SDR float16 layers during
//   composition, but RGBA_1010102 buffers keep their precision through
//   composition, including direct scanout on 10-bit panels.
#ifdef __APPLE__
static const SkColorType HighBitDepthColorType = kRGBA_F16_SkColorType;
static const wgpu::TextureFormat HighBitDepthTextureFormat =
    wgpu::TextureFormat::RGBA16Float;
#else
static const SkColorType HighBitDepthColorType = kRGBA_1010102_SkColorType;
static const wgpu::TextureFormat HighBitDepthTextureFormat =
    wgpu::TextureFormat::RGB10A2Unorm;
#endif

// Find the best matching GPU adapter for the current platform.
// Sorts by adapter type (DiscreteGPU > IntegratedGPU > CPU) and selects the
// first adapter matching the platform backend (Metal on Apple, Vulkan on
// Android).
inline dawn::native::Adapter
getMatchedAdapter(dawn::native::Instance *instance) {
#ifdef __APPLE__
  constexpr auto kDefaultBackendType = wgpu::BackendType::Metal;
#elif __ANDROID__
  constexpr auto kDefaultBackendType = wgpu::BackendType::Vulkan;
#endif

  wgpu::RequestAdapterOptions options;
  options.backendType = kDefaultBackendType;
  options.featureLevel = wgpu::FeatureLevel::Core;

  std::vector<dawn::native::Adapter> adapters =
      instance->EnumerateAdapters(&options);
  if (adapters.empty()) {
    throw std::runtime_error("No matching adapter found");
  }

  std::sort(adapters.begin(), adapters.end(),
            [](dawn::native::Adapter a, dawn::native::Adapter b) {
              wgpu::Adapter wgpuA = a.Get();
              wgpu::Adapter wgpuB = b.Get();
              wgpu::AdapterInfo infoA;
              wgpu::AdapterInfo infoB;
              wgpuA.GetInfo(&infoA);
              wgpuB.GetInfo(&infoB);
              return std::tuple(infoA.adapterType, infoA.backendType) <
                     std::tuple(infoB.adapterType, infoB.backendType);
            });

  for (const auto &adapter : adapters) {
    wgpu::Adapter wgpuAdapter = adapter.Get();
    wgpu::AdapterInfo props;
    wgpuAdapter.GetInfo(&props);
    if (kDefaultBackendType == props.backendType) {
      return adapter;
    }
  }

  throw std::runtime_error("No matching adapter found");
}

// Create a Dawn device from the given adapter with the requested features.
// Features not supported by the adapter are silently skipped.
// Set fatalOnDeviceLost=true for primary rendering devices (SK_ABORT on loss),
// false for secondary/compute devices (log only).
inline wgpu::Device
requestDevice(dawn::native::Adapter &nativeAdapter,
              const std::vector<wgpu::FeatureName> &requestedFeatures,
              bool fatalOnDeviceLost = true) {
  wgpu::Adapter adapter = nativeAdapter.Get();

  // Filter to only features the adapter supports
  std::vector<wgpu::FeatureName> features;
  for (auto feature : requestedFeatures) {
    if (adapter.HasFeature(feature)) {
      features.push_back(feature);
    }
  }

  static constexpr const char *kToggles[] = {
#if !defined(SK_DEBUG)
      "skip_validation",
#endif
      "disable_lazy_clear_for_mapped_at_creation_buffer",
      "allow_unsafe_apis",
      "use_user_defined_labels_in_backend",
      "disable_robustness",
  };
  wgpu::DawnTogglesDescriptor togglesDesc;
  togglesDesc.enabledToggleCount = std::size(kToggles);
  togglesDesc.enabledToggles = kToggles;
#if defined(TARGET_OS_SIMULATOR) && TARGET_OS_SIMULATOR
  // The iOS Simulator only advertises MTLFeatureSet_iOS_GPUFamily2, so Dawn
  // defaults disable_base_instance/disable_base_vertex on and then rejects
  // every draw with a non-zero firstInstance or baseVertex, which Graphite
  // emits routinely. The simulator forwards Metal calls to the host GPU,
  // which does support base vertex/instance drawing, so force the toggles
  // off. Device builds are unaffected: Graphite-capable iPhones and iPads
  // are all GPUFamily3+. (Same override as react-native-webgpu; see
  // https://issues.chromium.org/issues/42241591.)
  static constexpr const char *kDisabledToggles[] = {"disable_base_instance",
                                                     "disable_base_vertex"};
  togglesDesc.disabledToggleCount = std::size(kDisabledToggles);
  togglesDesc.disabledToggles = kDisabledToggles;
#endif

  wgpu::DeviceDescriptor desc;
  desc.requiredFeatureCount = features.size();
  desc.requiredFeatures = features.data();
  desc.nextInChain = &togglesDesc;

  if (fatalOnDeviceLost) {
    desc.SetDeviceLostCallback(
        wgpu::CallbackMode::AllowSpontaneous,
        [](const wgpu::Device &, wgpu::DeviceLostReason reason,
           wgpu::StringView message) {
          if (reason != wgpu::DeviceLostReason::Destroyed) {
            SK_ABORT("Device lost: %.*s\n", static_cast<int>(message.length),
                     message.data);
          }
        });
    desc.SetUncapturedErrorCallback(
        [](const wgpu::Device &, wgpu::ErrorType, wgpu::StringView message) {
          SkDebugf("Device error: %.*s\n", static_cast<int>(message.length),
                   message.data);
        });
  } else {
    desc.SetDeviceLostCallback(
        wgpu::CallbackMode::AllowSpontaneous,
        [](const wgpu::Device &, wgpu::DeviceLostReason reason,
           wgpu::StringView message) {
          if (reason != wgpu::DeviceLostReason::Destroyed) {
            RNSkia::RNSkLogger::logToConsole("Device lost: %.*s",
                                             static_cast<int>(message.length),
                                             message.data);
          }
        });
    desc.SetUncapturedErrorCallback([](const wgpu::Device &, wgpu::ErrorType,
                                       wgpu::StringView message) {
      RNSkia::RNSkLogger::logToConsole(
          "Device error: %.*s", static_cast<int>(message.length), message.data);
    });
  }

  return wgpu::Device::Acquire(nativeAdapter.CreateDevice(&desc));
}

inline skgpu::graphite::DawnBackendContext
createDawnBackendContext(dawn::native::Instance *instance) {

  auto matchedAdapter = getMatchedAdapter(instance);
  wgpu::Adapter adapter = matchedAdapter.Get();

  // Log selected adapter info
  wgpu::AdapterInfo adapterInfo;
  adapter.GetInfo(&adapterInfo);
  std::string deviceName =
      adapterInfo.device.data
          ? std::string(adapterInfo.device.data, adapterInfo.device.length)
          : "Unknown";
  std::string description = adapterInfo.description.data
                                ? std::string(adapterInfo.description.data,
                                              adapterInfo.description.length)
                                : "Unknown";

  std::string backendName;
  switch (adapterInfo.backendType) {
  case wgpu::BackendType::Metal:
    backendName = "Metal";
    break;
  case wgpu::BackendType::Vulkan:
    backendName = "Vulkan";
    break;
  case wgpu::BackendType::OpenGL:
    backendName = "OpenGL";
    break;
  case wgpu::BackendType::OpenGLES:
    backendName = "OpenGLES";
    break;
  case wgpu::BackendType::WebGPU:
    backendName = "WebGPU";
    break;
  case wgpu::BackendType::Null:
    backendName = "Null";
    break;
  default:
    backendName = "Undefined (" +
                  std::to_string(static_cast<int>(adapterInfo.backendType)) +
                  ")";
    break;
  }

  RNSkia::RNSkLogger::logToConsole(
      "Selected Dawn adapter - Backend: %s, Device: %s, Description: %s",
      backendName.c_str(), deviceName.c_str(), description.c_str());

  // Primary device features — request everything Skia/Graphite can use
  std::vector<wgpu::FeatureName> features = {
      wgpu::FeatureName::MSAARenderToSingleSampled,
      wgpu::FeatureName::TransientAttachments,
      wgpu::FeatureName::Unorm16TextureFormats,
      wgpu::FeatureName::DualSourceBlending,
      wgpu::FeatureName::FramebufferFetch,
      wgpu::FeatureName::BufferMapExtendedUsages,
      wgpu::FeatureName::TextureCompressionETC2,
      wgpu::FeatureName::TextureCompressionBC,
      wgpu::FeatureName::BGRA8UnormStorage,
      wgpu::FeatureName::DawnLoadResolveTexture,
      wgpu::FeatureName::DawnPartialLoadResolveTexture,
      wgpu::FeatureName::TimestampQuery,
      wgpu::FeatureName::DawnTexelCopyBufferRowAlignment,
      wgpu::FeatureName::ImplicitDeviceSynchronization,
#ifdef __APPLE__
      wgpu::FeatureName::SharedTextureMemoryIOSurface,
      // Required to call SharedTextureMemory::EndAccess on Metal (it exports a
      // MTLSharedEvent fence). importExternalTexture /
      // importSharedTextureMemory end the access window after submit; without
      // this EndAccess errors with "Required feature
      // (SharedFenceMTLSharedEvent) is missing". Safe here because we always
      // queue.submit() before EndAccess (the secondary device omits it on
      // purpose; its camera path doesn't commit first).
      wgpu::FeatureName::SharedFenceMTLSharedEvent,
      wgpu::FeatureName::DawnMultiPlanarFormats,
      wgpu::FeatureName::MultiPlanarFormatP010,
      wgpu::FeatureName::MultiPlanarFormatP210,
      wgpu::FeatureName::MultiPlanarFormatExtendedUsages,
#else
      wgpu::FeatureName::SharedTextureMemoryAHardwareBuffer,
      // Vulkan equivalent of the above: EndAccess exports a sync-fd fence.
      wgpu::FeatureName::SharedFenceSyncFD,
      wgpu::FeatureName::SharedFenceVkSemaphoreOpaqueFD,
#endif
  };

  wgpu::Device device = requestDevice(matchedAdapter, features, true);
  SkASSERT(device);

  skgpu::graphite::DawnBackendContext backendContext;
  backendContext.fInstance = wgpu::Instance(instance->Get());
  backendContext.fDevice = device;
  backendContext.fQueue = device.GetQueue();

  return backendContext;
}

} // namespace DawnUtils
