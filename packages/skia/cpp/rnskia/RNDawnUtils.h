#pragma once

#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif

#include <functional>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "webgpu/webgpu_cpp.h"

#include "dawn/native/DawnNative.h"

#include "include/core/SkColorSpace.h"
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

// The color space a view renders in: Display P3 (with the sRGB transfer
// function) where the platform prefers it (a wide gamut display on Apple
// platforms, see RNSkPlatformContext::prefersP3ColorSpace), sRGB otherwise.
// Colors are managed either way: content looks the same in both, Display P3
// only adds the colors sRGB cannot represent.
inline sk_sp<SkColorSpace> viewColorSpace(bool useP3ColorSpace) {
  return useP3ColorSpace ? SkColorSpace::MakeRGB(SkNamedTransferFn::kSRGB,
                                                 SkNamedGamut::kDisplayP3)
                         : SkColorSpace::MakeSRGB();
}

// Usage requested for a window texture when the surface supports it (see
// RNSkWindowSurface::supportedSurfaceUsage), and assumed for a Graphite
// recording made before its window exists: TextureBinding lets a render pass
// reload the existing contents, CopySrc serves copy tasks.
static const wgpu::TextureUsage DefaultTargetUsage =
    wgpu::TextureUsage::RenderAttachment | wgpu::TextureUsage::TextureBinding |
    wgpu::TextureUsage::CopySrc;

// The texture format backing a surface of the given color type; the
// preferred format for color types no surface uses.
inline wgpu::TextureFormat textureFormatForColorType(SkColorType colorType) {
  switch (colorType) {
  case kBGRA_8888_SkColorType:
    return wgpu::TextureFormat::BGRA8Unorm;
  case kRGBA_8888_SkColorType:
    return wgpu::TextureFormat::RGBA8Unorm;
  case kRGBA_F16_SkColorType:
    return wgpu::TextureFormat::RGBA16Float;
  case kRGBA_1010102_SkColorType:
    return wgpu::TextureFormat::RGB10A2Unorm;
  default:
    return PreferredTextureFormat;
  }
}

// The color type Skia samples a texture of the given format with, or none
// when Skia cannot sample the format: multi-planar YUV (the biplanar
// 4:2:0 formats of an NV12 IOSurface, OpaqueYCbCrAndroid), depth/stencil and
// compressed formats.
inline std::optional<SkColorType>
colorTypeForTextureFormat(wgpu::TextureFormat format) {
  switch (format) {
  case wgpu::TextureFormat::RGBA8Unorm:
    return kRGBA_8888_SkColorType;
  case wgpu::TextureFormat::BGRA8Unorm:
    return kBGRA_8888_SkColorType;
  case wgpu::TextureFormat::RGBA16Float:
    return kRGBA_F16_SkColorType;
  case wgpu::TextureFormat::RGB10A2Unorm:
    return kRGBA_1010102_SkColorType;
  case wgpu::TextureFormat::R8Unorm:
    return kGray_8_SkColorType;
  default:
    return std::nullopt;
  }
}

inline const char *backendTypeName(wgpu::BackendType type) {
  switch (type) {
  case wgpu::BackendType::Metal:
    return "Metal";
  case wgpu::BackendType::Vulkan:
    return "Vulkan";
  case wgpu::BackendType::OpenGL:
    return "OpenGL";
  case wgpu::BackendType::OpenGLES:
    return "OpenGLES";
  case wgpu::BackendType::WebGPU:
    return "WebGPU";
  case wgpu::BackendType::Null:
    return "Null";
  default:
    return "Undefined";
  }
}

// Through Dawn's own conversion: a length of wgpu::kStrlen means
// null-terminated, which a std::string built from (data, length) would not
// survive.
inline std::string toString(wgpu::StringView view) {
  return std::string(std::string_view(view));
}

// What an adapter reports about itself, in the terms of GPUAdapterInfo.
struct AdapterDescription {
  std::string backend;
  std::string vendor;
  std::string architecture;
  std::string device;
  std::string description;
};

inline AdapterDescription describeAdapter(const wgpu::Adapter &adapter) {
  wgpu::AdapterInfo info;
  adapter.GetInfo(&info);
  AdapterDescription result;
  result.backend = backendTypeName(info.backendType);
  result.vendor = toString(info.vendor);
  result.architecture = toString(info.architecture);
  result.device = toString(info.device);
  result.description = toString(info.description);
  return result;
}

// Dawn's own SwiftShader test (gpu_info::IsGoogleSwiftshader): Google's
// vendor ID with SwiftShader's device ID. The Android emulator exposes the
// host's SwiftShader through gfxstream, which keeps the IDs and the name, so
// either identifies it.
inline bool isSwiftShader(const wgpu::Adapter &adapter) {
  wgpu::AdapterInfo info;
  adapter.GetInfo(&info);
  constexpr uint32_t kVendorIDGoogle = 0x1AE0;
  constexpr uint32_t kDeviceIDSwiftShader = 0xC0DE;
  return (info.vendorID == kVendorIDGoogle &&
          info.deviceID == kDeviceIDSwiftShader) ||
         toString(info.device).find("SwiftShader") != std::string::npos;
}

// The backend Skia renders with: Metal on Apple, Vulkan on Android.
#ifdef __APPLE__
constexpr auto kPlatformBackendType = wgpu::BackendType::Metal;
#elif __ANDROID__
constexpr auto kPlatformBackendType = wgpu::BackendType::Vulkan;
#endif

// Why no adapter was found, for the error raised to JS: every adapter Dawn
// can see on any backend and at the compatibility feature level, so that the
// message tells a device without Vulkan apart from one whose driver falls
// short of the WebGPU core requirements. On Android it names v2, which renders
// with OpenGL ES on such devices.
inline std::string describeMissingAdapter(dawn::native::Instance *instance) {
  std::string message = "React Native Skia renders with ";
  message += backendTypeName(kPlatformBackendType);
#ifdef __ANDROID__
  message += " (Vulkan 1.1 or later)";
#endif
  message += " and found no GPU adapter meeting the WebGPU core requirements "
             "on this device.";
  wgpu::RequestAdapterOptions options;
  options.featureLevel = wgpu::FeatureLevel::Compatibility;
  auto adapters = instance->EnumerateAdapters(&options);
  if (adapters.empty()) {
    message += " No adapter is available on any backend.";
  } else {
    message += " Adapters found:";
    for (const auto &adapter : adapters) {
      auto info = describeAdapter(adapter.Get());
      message += " [" + info.backend + ": " + info.device;
      if (!info.description.empty()) {
        message += ", " + info.description;
      }
      message += "]";
    }
  }
#ifdef __ANDROID__
  message += " v2 (react-native-skia@2) renders with OpenGL ES on devices "
             "without Vulkan.";
#endif
  return message;
}

// Find the best matching GPU adapter for the current platform.
// Sorts by adapter type (DiscreteGPU > IntegratedGPU > CPU) and selects the
// first adapter matching the platform backend (Metal on Apple, Vulkan on
// Android). Throws std::runtime_error, with a message describing the
// device, when there is none.
inline dawn::native::Adapter
getMatchedAdapter(dawn::native::Instance *instance) {
  constexpr auto kDefaultBackendType = kPlatformBackendType;

  wgpu::RequestAdapterOptions options;
  options.backendType = kDefaultBackendType;
  options.featureLevel = wgpu::FeatureLevel::Core;

  std::vector<dawn::native::Adapter> adapters =
      instance->EnumerateAdapters(&options);
  if (adapters.empty()) {
    throw std::runtime_error(describeMissingAdapter(instance));
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

  throw std::runtime_error(describeMissingAdapter(instance));
}

// Where requestDevice() reports what becomes of the device. A loss after
// creation (a driver reset, the GPU out of memory, a device-level error)
// goes to onLost with Dawn's reason and message, on whichever thread Dawn
// detects it: possibly inside a call on the device itself, on the calling
// thread. A creation failure leaves Dawn's message in creationFailure, for
// the caller of requestDevice(): that callback runs inside CreateDevice, on
// the calling thread. The listener must outlive the device.
struct DeviceLostListener {
  std::function<void(wgpu::DeviceLostReason reason, const std::string &message)>
      onLost;
  std::string creationFailure;
};

// The name WebGPU gives a loss reason (GPUDeviceLostReason, lower case).
inline const char *deviceLostReasonName(wgpu::DeviceLostReason reason) {
  switch (reason) {
  case wgpu::DeviceLostReason::Destroyed:
    return "destroyed";
  case wgpu::DeviceLostReason::FailedCreation:
    return "failed-creation";
  case wgpu::DeviceLostReason::CallbackCancelled:
    return "callback-cancelled";
  default:
    return "unknown";
  }
}

// Create a Dawn device from the given adapter with the requested features.
// Features not supported by the adapter are silently skipped. The device's
// loss is reported to `listener` (see DeviceLostListener), or only logged
// without one (a secondary device). Neither takes the process down: a lost
// device fails its later operations, which the callers handle.
//
// A release build skips Dawn's validation on the device, unless `validate`
// asks for it: the device that replaces a lost one is validated, so that a
// texture or buffer made on the lost device and used again is refused with
// an error rather than reaching the driver (see DawnContext).
inline wgpu::Device
requestDevice(dawn::native::Adapter &nativeAdapter,
              const std::vector<wgpu::FeatureName> &requestedFeatures,
              DeviceLostListener *listener, bool validate = false) {
  wgpu::Adapter adapter = nativeAdapter.Get();

  // Filter to only features the adapter supports.
  // Dawn's Vulkan backend accepts at most one shared-fence feature per device
  // (SyncFD, VkSemaphoreOpaqueFD or VkSemaphoreZirconHandle) and fails device
  // creation otherwise. Some drivers (Samsung Xclipse, the Android emulator)
  // advertise several, so keep only the first supported one in request order.
  std::vector<wgpu::FeatureName> features;
  bool hasVulkanSharedFence = false;
  for (auto feature : requestedFeatures) {
    if (!adapter.HasFeature(feature)) {
      continue;
    }
    const bool isVulkanSharedFence =
        feature == wgpu::FeatureName::SharedFenceSyncFD ||
        feature == wgpu::FeatureName::SharedFenceVkSemaphoreOpaqueFD ||
        feature == wgpu::FeatureName::SharedFenceVkSemaphoreZirconHandle;
    if (isVulkanSharedFence) {
      if (hasVulkanSharedFence) {
        continue;
      }
      hasVulkanSharedFence = true;
    }
    features.push_back(feature);
  }

  std::vector<const char *> toggles = {
      "disable_lazy_clear_for_mapped_at_creation_buffer",
      "allow_unsafe_apis",
#if !defined(__ANDROID__)
      // Not on Android: with robustness disabled, Qualcomm's shader compiler
      // (libllvm-qgl, CreateQGLCProgram) segfaults inside
      // vkCreateGraphicsPipelines while Dawn builds some Graphite render
      // pipelines (Adreno 740, driver 3df4c357f0). It is not yet known whether
      // the driver or the SPIR-V Tint emits without robustness is at fault.
      // Robustness only adds bounds checks to shader buffer and texture
      // accesses; Chrome ships WebGPU with it on.
      "disable_robustness",
#endif
  };
#if defined(NDEBUG)
  if (!validate) {
    toggles.push_back("skip_validation");
  }
#else
  (void)validate;
#endif
#ifdef __ANDROID__
  // Dawn checks an imported AHardwareBuffer's allocation size against the
  // VkImage it binds to, and the Android emulator's SwiftShader driver reports
  // that size as 0 for every buffer. The first import (react-native-webgpu's
  // view snapshots draw into an imported AHardwareBuffer on Android 13+) then
  // fails as an internal error, which Dawn turns into a device loss: nothing
  // renders for the rest of the process. Dawn itself skips the check on the
  // Samsung, Qualcomm and Huawei drivers that misreport the size; do the same
  // for SwiftShader. Real devices keep the check.
  if (isSwiftShader(adapter)) {
    toggles.push_back("ignore_imported_ahardwarebuffer_vulkan_image_size");
  }
#endif
  wgpu::DawnTogglesDescriptor togglesDesc;
  togglesDesc.enabledToggleCount = toggles.size();
  togglesDesc.enabledToggles = toggles.data();
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

  // Destroyed is the context tearing the device down on purpose, and
  // CallbackCancelled the instance going away: neither is a loss.
  desc.SetDeviceLostCallback(
      wgpu::CallbackMode::AllowSpontaneous,
      [](const wgpu::Device &, wgpu::DeviceLostReason reason,
         wgpu::StringView message, DeviceLostListener *listener) {
        switch (reason) {
        case wgpu::DeviceLostReason::Destroyed:
        case wgpu::DeviceLostReason::CallbackCancelled:
          return;
        case wgpu::DeviceLostReason::FailedCreation:
          if (listener != nullptr) {
            listener->creationFailure = toString(message);
          }
          return;
        default:
          if (listener != nullptr && listener->onLost) {
            listener->onLost(reason, toString(message));
          } else {
            RNSkia::RNSkLogger::logToConsole("Device lost: " +
                                             toString(message));
          }
          return;
        }
      },
      listener);
  desc.SetUncapturedErrorCallback(
      [](const wgpu::Device &, wgpu::ErrorType, wgpu::StringView message) {
        RNSkia::RNSkLogger::logToConsole("Device error: " + toString(message));
      });

  return wgpu::Device::Acquire(nativeAdapter.CreateDevice(&desc));
}

// `listener` is told of the primary device's loss (see DeviceLostListener)
// and must outlive the device. `validate` is passed on to requestDevice().
inline skgpu::graphite::DawnBackendContext
createDawnBackendContext(dawn::native::Instance *instance,
                         DeviceLostListener *listener, bool validate = false) {

  auto matchedAdapter = getMatchedAdapter(instance);
  wgpu::Adapter adapter = matchedAdapter.Get();

  // Log selected adapter info
  auto adapterInfo = describeAdapter(adapter);
  RNSkia::RNSkLogger::logToConsole(
      "Selected Dawn adapter - Backend: %s, Device: %s, Description: %s",
      adapterInfo.backend.c_str(), adapterInfo.device.c_str(),
      adapterInfo.description.c_str());

  // Primary device features — request everything Skia/Graphite can use
  std::vector<wgpu::FeatureName> features = {
#if !defined(__ANDROID__)
      // Not on Android: Dawn creates its Vulkan swapchain images without
      // VK_IMAGE_CREATE_MULTISAMPLED_RENDER_TO_SINGLE_SAMPLED_BIT_EXT, so every
      // MSAA pass Graphite draws onto the window with this feature violates
      // VUID-VkFramebufferCreateInfo-samples-06881 (confirmed with the
      // validation layers on a Pixel 8). Mali tolerates it; Adreno crashes in
      // vkCreateFramebuffer (#4158). Without the feature Graphite renders
      // through a transient MSAA attachment and resolves, the same path as on
      // GPUs without the extension. Re-enable once Dawn creates swapchains
      // with the flag or reports which textures cannot take an implicit
      // sample count: https://issues.chromium.org/issues/571594984
      wgpu::FeatureName::MSAARenderToSingleSampled,
#endif
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
      // Only one of these is enabled (see requestDevice). SyncFD comes first
      // because AHardwareBuffer interop is sync-fd based; OpaqueFD is a
      // fallback for drivers that do not advertise sync-fd semaphores.
      wgpu::FeatureName::SharedFenceSyncFD,
      wgpu::FeatureName::SharedFenceVkSemaphoreOpaqueFD,
      // Video and camera frames are YUV AHardwareBuffers. Dawn imports them
      // as OpaqueYCbCrAndroid textures, a format it only accepts on a device
      // with one of its two YCbCr features, and react-native-webgpu samples
      // them as external textures (importExternalTexture,
      // copyExternalImageToTexture), which needs this one in particular.
      // Without it, importing a frame on the shared device fails with
      // "Unsupported texture format TextureFormat::OpaqueYCbCrAndroid".
      // Experimental in Dawn, hence the allow_unsafe_apis instance toggle.
      wgpu::FeatureName::OpaqueYCbCrAndroidForExternalTexture,
#endif
  };

  wgpu::Device device =
      requestDevice(matchedAdapter, features, listener, validate);
  if (!device) {
    std::string error =
        "React Native Skia could not create a GPU device on the " +
        adapterInfo.backend + " adapter " + adapterInfo.device + " (" +
        adapterInfo.description + ").";
    if (listener != nullptr && !listener->creationFailure.empty()) {
      error += " Reason: " + listener->creationFailure;
    }
    throw std::runtime_error(error);
  }

  skgpu::graphite::DawnBackendContext backendContext;
  backendContext.fInstance = wgpu::Instance(instance->Get());
  backendContext.fDevice = device;
  backendContext.fQueue = device.GetQueue();

  return backendContext;
}

} // namespace DawnUtils
