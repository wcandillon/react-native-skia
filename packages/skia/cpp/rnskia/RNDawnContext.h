#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <memory>
#include <mutex>
#include <thread>
#include <utility>
#include <vector>

#if defined(__APPLE__)
#include <pthread.h>
#elif defined(__ANDROID__)
#include <pthread.h>
#endif

#include "RNDawnUtils.h"
#include "RNImageProvider.h"
#include "utils/RNSkLog.h"

#include "include/core/SkColorSpace.h"
#include "include/core/SkData.h"
#include "include/gpu/graphite/BackendTexture.h"
#include "include/gpu/graphite/Context.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/Image.h"
#include "include/gpu/graphite/Recorder.h"
#include "include/gpu/graphite/Recording.h"
#include "include/gpu/graphite/Surface.h"
#include "include/gpu/graphite/dawn/DawnBackendContext.h"
#include "include/gpu/graphite/dawn/DawnTypes.h"
#include "include/gpu/graphite/dawn/DawnUtils.h"

#include "src/gpu/graphite/ContextOptionsPriv.h"

namespace RNSkia {

/** The pixels read back from a Graphite image; nullptr when the read failed. */
using ReadResult = std::unique_ptr<const SkImage::AsyncReadResult>;

class DawnContext {
public:
  DawnContext(const DawnContext &) = delete;
  DawnContext &operator=(const DawnContext &) = delete;

  static DawnContext &getInstance() {
    // Never destroyed: the readback poller is a detached thread using the
    // context, which the process takes down at exit instead of a static
    // destructor tearing the context down under it.
    static auto *instance = new DawnContext();
    return *instance;
  }

  // Readbacks ----------------------------------------------------------------
  //
  // Graphite reads pixels back asynchronously: the request goes to the GPU
  // with the next submit and the result is delivered by the context once the
  // GPU is done, from checkAsyncWorkCompletion() or from any later submit. A
  // thread of its own polls the context while readbacks are pending, so a
  // caller never has to wait inside the context lock (which would hold up
  // the frames of every view meanwhile).

  /**
   Reads `srcRect` of a Graphite image back into CPU memory, in the color
   type and color space of the image. The callback runs on whichever thread
   completes the GPU work, inside the context lock: it must not use the
   context nor a JS runtime (hand the result to the right thread instead). It
   is called exactly once, with nullptr when the read failed.
   */
  void readPixels(const sk_sp<SkImage> &image, const SkIRect &srcRect,
                  std::function<void(ReadResult)> callback) {
    struct Request {
      std::function<void(ReadResult)> callback;
    };
    auto *request = new Request{std::move(callback)};
    auto info = image->imageInfo().makeDimensions(srcRect.size());
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _pendingReadbacks.fetch_add(1, std::memory_order_acq_rel);
      fGraphiteContext->asyncRescaleAndReadPixels(
          image.get(), info, srcRect, SkImage::RescaleGamma::kSrc,
          SkImage::RescaleMode::kNearest,
          [](void *context, ReadResult result) {
            auto *request = static_cast<Request *>(context);
            getInstance()._pendingReadbacks.fetch_sub(
                1, std::memory_order_acq_rel);
            request->callback(std::move(result));
            delete request;
          },
          request);
      fGraphiteContext->submit();
    }
    wakeReadbackPoller();
  }

  /**
   Same as readPixels(), waiting for the result. The wait happens outside the
   context lock; the calling thread blocks for a GPU round trip.
   */
  ReadResult readPixelsSync(const sk_sp<SkImage> &image,
                            const SkIRect &srcRect) {
    struct Wait {
      std::mutex mutex;
      std::condition_variable condition;
      bool done = false;
      ReadResult result;
    };
    auto wait = std::make_shared<Wait>();
    readPixels(image, srcRect, [wait](ReadResult result) {
      {
        std::lock_guard<std::mutex> lock(wait->mutex);
        wait->result = std::move(result);
        wait->done = true;
      }
      wait->condition.notify_one();
    });
    std::unique_lock<std::mutex> lock(wait->mutex);
    wait->condition.wait(lock, [&wait]() { return wait->done; });
    return std::move(wait->result);
  }

  /**
   A raster image over the pixels of a read result (nullptr for a failed
   read). `info` describes the pixels: the image's, for the size that was
   read.
   */
  static sk_sp<SkImage> MakeRasterImage(const SkImageInfo &info,
                                        ReadResult result) {
    if (result == nullptr) {
      return nullptr;
    }
    auto rowBytes = result->rowBytes(0);
    auto size = rowBytes * static_cast<size_t>(info.height());
    auto *raw = result.release();
    auto data = SkData::MakeWithProc(
        raw->data(0), size,
        [](const void *, void *context) {
          delete static_cast<const SkImage::AsyncReadResult *>(context);
        },
        const_cast<SkImage::AsyncReadResult *>(raw));
    return SkImages::RasterFromData(info, std::move(data), rowBytes);
  }

  /**
   A CPU copy of a Graphite image, read back synchronously; the image itself
   when it is not texture-backed.
   */
  sk_sp<SkImage> MakeRasterImage(const sk_sp<SkImage> &image) {
    if (!image->isTextureBacked()) {
      return image;
    }
    return MakeRasterImage(image->imageInfo(),
                           readPixelsSync(image, image->bounds()));
  }

  /**
   A Graphite image of `image`: uploaded on an upload recorder of this thread
   and submitted, so that any recorder can draw it once this returns. The image
   itself when it already is one (with mipmaps when asked for). An encoded
   image is decoded on the calling thread first. nullptr when the upload
   failed.
   */
  sk_sp<SkImage> MakeTextureImage(const sk_sp<SkImage> &image, bool mipmapped) {
    if (image->isTextureBacked() && (!mipmapped || image->hasMipmaps())) {
      return image;
    }
    // A recorder of its own: snapping the recorder of this thread would also
    // submit what the offscreen surfaces of this thread recorded so far.
    static thread_local auto uploadRecorder = makeRecorder();
    auto *recorder = uploadRecorder.get();
    auto texture =
        SkImages::TextureFromImage(recorder, image.get(), {mipmapped});
    if (texture == nullptr) {
      return nullptr;
    }
    if (auto recording = recorder->snap()) {
      submitRecording(recording.get());
    }
    return texture;
  }

  // A recorder of its own for a client that records on one thread and replays
  // on another (SkiaGraphiteView): unlike getRecorder() it is not tied to the
  // calling thread. Creating a recorder is a Context operation, hence the lock.
  std::unique_ptr<skgpu::graphite::Recorder>
  makeRecorder(bool requireOrderedRecordings = false) {
    std::lock_guard<std::mutex> lock(_mutex);
    skgpu::graphite::RecorderOptions options;
    options.fImageProvider = ImageProvider::Make();
    options.fRequireOrderedRecordings = requireOrderedRecordings;
    return fGraphiteContext->makeRecorder(options);
  }

  // Replays the recordings, in order, onto the target surface (a deferred
  // canvas target) and submits them as one batch. Returns false if any of
  // them was rejected; the others are still submitted.
  bool
  insertRecordings(const std::vector<skgpu::graphite::Recording *> &recordings,
                   SkSurface *targetSurface) {
    std::lock_guard<std::mutex> lock(_mutex);
    bool success = true;
    for (auto *recording : recordings) {
      skgpu::graphite::InsertRecordingInfo info;
      info.fRecording = recording;
      info.fTargetSurface = targetSurface;
      auto status = fGraphiteContext->insertRecording(info);
      // InsertStatus converts to true on success.
      if (!static_cast<bool>(status)) {
        RNSkLogger::logToConsole(
            "Graphite rejected a recording (InsertStatus %d): %s",
            static_cast<int>(
                static_cast<skgpu::graphite::InsertStatus::V>(status)),
            status.message().c_str());
        success = false;
      }
    }
    fGraphiteContext->submit();
    return success;
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

  // Create offscreen surface
  sk_sp<SkSurface> MakeOffscreen(int width, int height,
                                 bool useP3ColorSpace = false) {
    sk_sp<SkColorSpace> colorSpace =
        useP3ColorSpace ? SkColorSpace::MakeRGB(SkNamedTransferFn::kSRGB,
                                                SkNamedGamut::kDisplayP3)
                        : nullptr;
    SkImageInfo info =
        SkImageInfo::Make(width, height, DawnUtils::PreferedColorType,
                          kPremul_SkAlphaType, colorSpace);
    sk_sp<SkSurface> surface = SkSurfaces::RenderTarget(getRecorder(), info);

    if (!surface) {
      throw std::runtime_error("Failed to create offscreen Skia surface.");
    }

    return surface;
  }

  // Get the wgpu::Instance for WebGPU bindings
  wgpu::Instance getWGPUInstance() { return wgpu::Instance(instance->Get()); }

  // Get the wgpu::Device for WebGPU bindings
  wgpu::Device getWGPUDevice() { return backendContext.fDevice; }

  // Create a secondary Dawn device from the same adapter.
  // Has its own command queue and does NOT enable
  // ImplicitDeviceSynchronization, so it won't contend with the primary
  // rendering device's mutex. Safe for concurrent GPU work (e.g. ML inference)
  // alongside Skia rendering.
  wgpu::Device createSecondaryDevice() {
    auto adapter = DawnUtils::getMatchedAdapter(instance.get());

    std::vector<wgpu::FeatureName> features = {
        wgpu::FeatureName::BufferMapExtendedUsages,
#ifdef __APPLE__
        wgpu::FeatureName::SharedTextureMemoryIOSurface,
        wgpu::FeatureName::DawnMultiPlanarFormats,
    // Note: SharedFenceMTLSharedEvent intentionally NOT enabled — it causes
    // EndAccess to encode fence signals that crash with "uncommitted encoder".
    // IOSurface data is already written by the camera before we read it.
#endif
    };

    return DawnUtils::requestDevice(adapter, features, false);
  }

  // Create an SkImage from a WebGPU texture
  // The texture must have TextureBinding usage
  sk_sp<SkImage> MakeImageFromTexture(wgpu::Texture texture, int width,
                                      int height, wgpu::TextureFormat format) {
    if (!texture) {
      return nullptr;
    }

    // Map the WebGPU format to a Skia color type; fall back to the preferred
    // color type for formats Skia does not sample.
    SkColorType colorType =
        DawnUtils::colorTypeForTextureFormat(format).value_or(
            DawnUtils::PreferedColorType);

    skgpu::graphite::BackendTexture backendTexture =
        skgpu::graphite::BackendTextures::MakeDawn(texture.Get());

    // Wrap the texture - we use a release proc that adds a reference to the
    // texture to prevent it from being destroyed while the SkImage is alive
    struct TextureRef {
      wgpu::Texture texture;
    };
    auto textureRef = new TextureRef{texture};

    return SkImages::WrapTexture(
        getRecorder(), backendTexture, colorType, kPremul_SkAlphaType, nullptr,
        [](void *context) {
          auto ref = static_cast<TextureRef *>(context);
          delete ref;
        },
        textureRef);
  }

  // Create an SkSurface that draws straight into a WebGPU texture (zero-copy).
  // The texture must have RenderAttachment usage; give it TextureBinding too
  // to sample it from WebGPU (e.g. as a three.js texture) after each flush.
  // The surface retains the texture for its lifetime.
  sk_sp<SkSurface> MakeSurfaceFromTexture(wgpu::Texture texture) {
    if (!texture) {
      return nullptr;
    }
    if (!(texture.GetUsage() & wgpu::TextureUsage::RenderAttachment)) {
      throw std::runtime_error(
          "MakeSurfaceFromTexture: the texture needs RenderAttachment usage");
    }

    skgpu::graphite::BackendTexture backendTexture =
        skgpu::graphite::BackendTextures::MakeDawn(texture.Get());

    struct TextureRef {
      wgpu::Texture texture;
    };
    auto textureRef = new TextureRef{texture};

    // The color type is derived from the texture format.
    return SkSurfaces::WrapBackendTexture(
        getRecorder(), backendTexture,
        nullptr, // colorspace
        nullptr, // surfaceProps
        [](void *context) {
          auto ref = static_cast<TextureRef *>(context);
          delete ref;
        },
        textureRef);
  }

  // Create a WebGPU texture from an SkImage
  // Returns a texture with CopySrc and TextureBinding usage
  wgpu::Texture MakeTextureFromImage(sk_sp<SkImage> image) {
    if (!image) {
      return nullptr;
    }

    int width = image->width();
    int height = image->height();

    // Create a texture with the appropriate format
    wgpu::TextureDescriptor textureDesc;
    textureDesc.label = "SkImage Texture";
    textureDesc.size = {static_cast<uint32_t>(width),
                        static_cast<uint32_t>(height), 1};
    textureDesc.format = DawnUtils::PreferredTextureFormat;
    textureDesc.usage = wgpu::TextureUsage::CopyDst |
                        wgpu::TextureUsage::CopySrc |
                        wgpu::TextureUsage::TextureBinding |
                        wgpu::TextureUsage::RenderAttachment;
    textureDesc.dimension = wgpu::TextureDimension::e2D;
    textureDesc.mipLevelCount = 1;
    textureDesc.sampleCount = 1;

    wgpu::Texture texture = backendContext.fDevice.CreateTexture(&textureDesc);
    if (!texture) {
      return nullptr;
    }

    // Create a surface backed by this texture
    skgpu::graphite::BackendTexture backendTexture =
        skgpu::graphite::BackendTextures::MakeDawn(texture.Get());

    sk_sp<SkSurface> surface = SkSurfaces::WrapBackendTexture(
        getRecorder(), backendTexture, DawnUtils::PreferedColorType,
        nullptr,  // colorspace
        nullptr); // surfaceProps

    if (!surface) {
      return nullptr;
    }

    // Draw the image onto the surface
    SkCanvas *canvas = surface->getCanvas();
    canvas->drawImage(image, 0, 0);

    // Flush the surface to ensure the image is rendered
    auto recording = getRecorder()->snap();
    if (recording) {
      submitRecording(recording.get(), skgpu::graphite::SyncToCpu::kYes);
    }

    return texture;
  }

  // The Dawn surface over a native window: a CAMetalLayer on Apple
  // platforms, an ANativeWindow on Android (see RNSkWindowSurface).
  wgpu::Surface MakeWGPUSurface(void *window) {
    wgpu::SurfaceDescriptor surfaceDescriptor;
#ifdef __APPLE__
    wgpu::SurfaceSourceMetalLayer metalSurfaceDesc;
    metalSurfaceDesc.layer = window;
    surfaceDescriptor.nextInChain = &metalSurfaceDesc;
#else
    wgpu::SurfaceSourceAndroidNativeWindow androidSurfaceDesc;
    androidSurfaceDesc.window = window;
    surfaceDescriptor.nextInChain = &androidSurfaceDesc;
#endif
    return wgpu::Instance(instance->Get()).CreateSurface(&surfaceDescriptor);
  }

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

private:
  std::unique_ptr<dawn::native::Instance> instance;
  std::unique_ptr<skgpu::graphite::Context> fGraphiteContext;
  skgpu::graphite::DawnBackendContext backendContext;
  std::mutex _mutex;

  // The readback poller: started on the first readback, it checks the
  // context for finished GPU work while readbacks are pending and sleeps
  // otherwise (see readPixels).
  std::atomic<int> _pendingReadbacks{0};
  std::once_flag _pollerOnce;
  std::mutex _pollerMutex;
  std::condition_variable _pollerCondition;

  void wakeReadbackPoller() {
    std::call_once(_pollerOnce, [this]() {
      std::thread([this]() { pollReadbacks(); }).detach();
    });
    // Taken so that a poller between its predicate check and its wait cannot
    // miss the notification.
    {
      std::lock_guard<std::mutex> lock(_pollerMutex);
    }
    _pollerCondition.notify_one();
  }

  void pollReadbacks() {
#if defined(__APPLE__)
    pthread_setname_np("RNSkia Readback");
#elif defined(__ANDROID__)
    pthread_setname_np(pthread_self(), "RNSkia Readback");
#endif
    for (;;) {
      {
        std::unique_lock<std::mutex> lock(_pollerMutex);
        _pollerCondition.wait(lock, [this]() {
          return _pendingReadbacks.load(std::memory_order_acquire) > 0;
        });
      }
      // Polls every millisecond at first, then backs off: a short readback
      // is delivered quickly, a long one does not take the context lock a
      // thousand times a second.
      auto interval = std::chrono::milliseconds(1);
      while (_pendingReadbacks.load(std::memory_order_acquire) > 0) {
        // A busy context is a view rendering: skip this round rather than
        // hold up its frame.
        std::unique_lock<std::mutex> lock(_mutex, std::try_to_lock);
        if (lock.owns_lock()) {
          tick();
          fGraphiteContext->checkAsyncWorkCompletion();
          lock.unlock();
          interval = std::min(interval * 2, std::chrono::milliseconds(4));
        }
        std::this_thread::sleep_for(interval);
      }
    }
  }

  DawnContext() {
    // No dawnProcSetProcs() here: the monolithic libwebgpu_dawn (shared with
    // react-native-webgpu) exposes the real wgpu* C entry points directly
    // rather than the settable dawn_proc trampoline, which it does not ship.
    static const auto kTimedWaitAny = wgpu::InstanceFeatureName::TimedWaitAny;

    wgpu::InstanceDescriptor instanceDesc{.requiredFeatureCount = 1,
                                          .requiredFeatures = &kTimedWaitAny};

    // For limits:
    wgpu::InstanceLimits limits{.timedWaitAnyMaxCount = 64};
    instanceDesc.requiredLimits = &limits;

    // Same instance-stage toggles react-native-webgpu sets on its own
    // instance: when webgpu adopts this instance (rnskia_getWGPUInstance),
    // its external-texture path expects experimental adapter features to be
    // visible. These only un-hide features in adapter.features; nothing
    // becomes active unless a device requests it.
    static const char *const kInstanceToggles[] = {
        "allow_unsafe_apis",
        "expose_wgsl_experimental_features",
    };
    wgpu::DawnTogglesDescriptor instanceToggles;
    instanceToggles.enabledToggleCount = std::size(kInstanceToggles);
    instanceToggles.enabledToggles = kInstanceToggles;
    instanceDesc.nextInChain = &instanceToggles;

    instance = std::make_unique<dawn::native::Instance>(&instanceDesc);

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

  ~DawnContext() {
    backendContext.fDevice = nullptr;
    tick();
  }

  void tick() {
    if (backendContext.fTick) {
      backendContext.fTick(backendContext.fInstance);
    }
  }
};

} // namespace RNSkia
