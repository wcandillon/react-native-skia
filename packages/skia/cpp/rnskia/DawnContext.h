#pragma once

#include <memory>
#include <mutex>

#include "DawnUtils.h"
#include "DawnWindowContext.h"
#include "ImageProvider.h"

#include "include/core/SkData.h"
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

#ifdef __APPLE__
#include <CoreVideo/CVPixelBuffer.h>
#else
#include <android/hardware_buffer.h>
#include <android/hardware_buffer_jni.h>
#endif

namespace RNSkia {

struct AsyncContext {
  bool fCalled = false;
  std::unique_ptr<const SkSurface::AsyncReadResult> fResult;
};

struct SharedTextureContext {
  wgpu::SharedTextureMemory sharedTextureMemory;
  wgpu::Texture texture;
};

static void
async_callback(void *c,
               std::unique_ptr<const SkImage::AsyncReadResult> result) {
  auto context = static_cast<AsyncContext *>(c);
  context->fResult = std::move(result);
  context->fCalled = true;
}

class DawnContext {
public:
  // TODO: remove
  friend class RNSkApplePlatformContext;

  DawnContext(const DawnContext &) = delete;
  DawnContext &operator=(const DawnContext &) = delete;

  static DawnContext &getInstance() {
    static DawnContext instance;
    return instance;
  }

  sk_sp<SkImage> MakeRasterImage(sk_sp<SkImage> image) {
    if (!image->isTextureBacked()) {
      return image;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    AsyncContext asyncContext;
    fGraphiteContext->asyncRescaleAndReadPixels(
        image.get(), image->imageInfo(), image->imageInfo().bounds(),
        SkImage::RescaleGamma::kSrc, SkImage::RescaleMode::kNearest,
        async_callback, &asyncContext);
    fGraphiteContext->submit();
    while (!asyncContext.fCalled) {
      tick();
      fGraphiteContext->checkAsyncWorkCompletion();
    }
    auto bytesPerRow = asyncContext.fResult->rowBytes(0);
    auto bufferSize = bytesPerRow * image->imageInfo().height();
    auto data = SkData::MakeWithProc(
        asyncContext.fResult->data(0), bufferSize,
        [](const void *ptr, void *context) {
          auto *result =
              reinterpret_cast<const SkSurface::AsyncReadResult *>(context);
          delete result;
        },
        reinterpret_cast<void *>(const_cast<SkSurface::AsyncReadResult *>(
            asyncContext.fResult.release())));
    auto rasterImage =
        SkImages::RasterFromData(image->imageInfo(), data, bytesPerRow);
    return rasterImage;
  }

  void submitRecording(
      skgpu::graphite::Recording *recording,
      skgpu::graphite::SyncToCpu syncToCpu = skgpu::graphite::SyncToCpu::kNo) {
    std::lock_guard<std::mutex> lock(_mutex);
    skgpu::graphite::InsertRecordingInfo info;
    info.fRecording = recording;
    fGraphiteContext->insertRecording(info);
    fGraphiteContext->submit(syncToCpu);
  }

  sk_sp<SkImage> MakeImageFromBuffer(void *buffer) {
#ifdef __APPLE__
    wgpu::SharedTextureMemoryIOSurfaceDescriptor platformDesc;
    auto ioSurface = CVPixelBufferGetIOSurface((CVPixelBufferRef)buffer);
    platformDesc.ioSurface = ioSurface;
    int width = static_cast<int>(IOSurfaceGetWidth(ioSurface));
    int height = static_cast<int>(IOSurfaceGetHeight(ioSurface));
#else
    wgpu::SharedTextureMemoryAHardwareBufferDescriptor platformDesc;
    auto ahb = (AHardwareBuffer *)buffer;
    platformDesc.handle = ahb;
    platformDesc.useExternalFormat = true;
    AHardwareBuffer_Desc adesc;
    AHardwareBuffer_describe(ahb, &adesc);
    int width = adesc.width;
    int height = adesc.height;
#endif

    wgpu::SharedTextureMemoryDescriptor desc = {};
    desc.nextInChain = &platformDesc;
    wgpu::SharedTextureMemory memory =
        backendContext.fDevice.ImportSharedTextureMemory(&desc);

    wgpu::TextureDescriptor textureDesc;
    textureDesc.format = DawnUtils::PreferredTextureFormat;
    textureDesc.dimension = wgpu::TextureDimension::e2D;
    textureDesc.usage =
        wgpu::TextureUsage::TextureBinding | wgpu::TextureUsage::CopySrc;
    textureDesc.size = {static_cast<uint32_t>(width),
                        static_cast<uint32_t>(height), 1};

    wgpu::Texture texture = memory.CreateTexture(&textureDesc);

    wgpu::SharedTextureMemoryBeginAccessDescriptor beginAccessDesc;
    beginAccessDesc.initialized = true;
    beginAccessDesc.fenceCount = 0;
    bool success = memory.BeginAccess(texture, &beginAccessDesc);

    if (success) {
      skgpu::graphite::BackendTexture betFromView =
          skgpu::graphite::BackendTextures::MakeDawn(texture.Get());
      auto result = SkImages::WrapTexture(
          getRecorder(), betFromView, DawnUtils::PreferedColorType,
          kPremul_SkAlphaType, nullptr,
          [](void *context) {
            auto ctx = static_cast<SharedTextureContext *>(context);
            wgpu::SharedTextureMemoryEndAccessState endState = {};
            ctx->sharedTextureMemory.EndAccess(ctx->texture, &endState);
            delete ctx;
          },
          new SharedTextureContext{memory, texture});
      return result;
    }
    if (!success) {
      return nullptr;
    }
    return nullptr;
  }

  // Create offscreen surface
  sk_sp<SkSurface> MakeOffscreen(int width, int height) {
    SkImageInfo info = SkImageInfo::Make(
        width, height, DawnUtils::PreferedColorType, kPremul_SkAlphaType);
    sk_sp<SkSurface> surface = SkSurfaces::RenderTarget(getRecorder(), info);

    if (!surface) {
      throw std::runtime_error("Failed to create offscreen Skia surface.");
    }

    return surface;
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
#else
    wgpu::SurfaceDescriptorFromAndroidNativeWindow androidSurfaceDesc;
    androidSurfaceDesc.window = window;
    surfaceDescriptor.nextInChain = &androidSurfaceDesc;
#endif
    auto surface =
        wgpu::Instance(instance->Get()).CreateSurface(&surfaceDescriptor);
    return std::make_unique<DawnWindowContext>(
        getRecorder(), backendContext.fDevice, surface, width, height);
  }

private:
  std::unique_ptr<dawn::native::Instance> instance;
  std::unique_ptr<skgpu::graphite::Context> fGraphiteContext;
  skgpu::graphite::DawnBackendContext backendContext;
  std::mutex _mutex;

  DawnContext() {
    DawnProcTable backendProcs = dawn::native::GetProcs();
    dawnProcSetProcs(&backendProcs);
    WGPUInstanceDescriptor desc{};
    desc.features.timedWaitAnyEnable = true;
    instance = std::make_unique<dawn::native::Instance>(&desc);

    backendContext = DawnUtils::createDawnBackendContext(instance.get());

    skgpu::graphite::ContextOptions ctxOptions;
    skgpu::graphite::ContextOptionsPriv contextOptionsPriv;
    ctxOptions.fOptionsPriv = &contextOptionsPriv;
    ctxOptions.fOptionsPriv->fStoreContextRefInRecorder = true;
    fGraphiteContext =
        skgpu::graphite::ContextFactory::MakeDawn(backendContext, ctxOptions);

    if (!fGraphiteContext) {
      throw std::runtime_error("Failed to create graphite context");
    }
  }

  void tick() { backendContext.fTick(backendContext.fInstance); }

  skgpu::graphite::Recorder *getRecorder() {
    static thread_local skgpu::graphite::RecorderOptions recorderOptions;
    if (!recorderOptions.fImageProvider) {
      auto imageProvider = ImageProvider::Make();
      recorderOptions.fImageProvider = imageProvider;
    }
    static thread_local auto recorder =
        fGraphiteContext->makeRecorder(recorderOptions);
    if (!recorder) {
      throw std::runtime_error("Failed to create graphite context");
    }
    return recorder.get();
  }
};

} // namespace RNSkia
