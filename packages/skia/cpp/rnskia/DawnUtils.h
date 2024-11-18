#pragma once

#include "webgpu/webgpu_cpp.h"

#include "dawn/dawn_proc.h"
#include "dawn/native/DawnNative.h"

#include "include/core/SkColorType.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"

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

inline skgpu::graphite::DawnBackendContext
createDawnBackendContext(dawn::native::Instance *instance) {

  auto useTintIR = false;
  static constexpr const char *kToggles[] = {
      "allow_unsafe_apis",
      "use_user_defined_labels_in_backend",
      "disable_robustness",
      "use_tint_ir",
  };
  wgpu::DawnTogglesDescriptor togglesDesc;
  togglesDesc.enabledToggleCount = std::size(kToggles) - (useTintIR ? 0 : 1);
  togglesDesc.enabledToggles = kToggles;

  wgpu::RequestAdapterOptions options;
#ifdef __APPLE__
  constexpr auto kDefaultBackendType = wgpu::BackendType::Metal;
#elif __ANDROID__
  constexpr auto kDefaultBackendType = wgpu::BackendType::Vulkan;
#endif
  options.backendType = kDefaultBackendType;
  options.nextInChain = &togglesDesc;

  std::vector<dawn::native::Adapter> adapters =
      instance->EnumerateAdapters(&options);
  if (adapters.empty()) {
    throw std::runtime_error("No matching adapter found");
  }

  wgpu::Adapter adapter = adapters[0].Get();

  std::vector<wgpu::FeatureName> features;
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
#ifdef __APPLE__
  if (adapter.HasFeature(wgpu::FeatureName::SharedTextureMemoryIOSurface)) {
    features.push_back(wgpu::FeatureName::SharedTextureMemoryIOSurface);
  }
#else
  if (adapter.HasFeature(
          wgpu::FeatureName::SharedTextureMemoryAHardwareBuffer)) {
    features.push_back(wgpu::FeatureName::SharedTextureMemoryAHardwareBuffer);
  }
#endif

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

  wgpu::Device device = adapter.CreateDevice(&desc);
  SkASSERT(device);

  skgpu::graphite::DawnBackendContext backendContext;
  backendContext.fInstance = wgpu::Instance(instance->Get());
  backendContext.fDevice = device;
  backendContext.fQueue = device.GetQueue();

  return backendContext;
}

} // namespace DawnUtils