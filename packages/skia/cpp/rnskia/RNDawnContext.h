#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_map>
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

/**
 * The GPU Skia renders with: a Dawn device and the Graphite context on it.
 *
 * The device can be lost while the app runs (a driver reset, the GPU out of
 * memory, GPU work refused while the app is in the background on iOS). Dawn
 * reports it and fails every later operation on that device instead of
 * crashing. The context then replaces the device: a new one is created on
 * the same adapter, with a new Graphite context, and the views configure
 * their windows on it and record their frames again. Everything made on the
 * lost device stays valid memory, but is good for nothing: the recordings of
 * its recorders are dropped rather than run on the new device, offscreen
 * surfaces and texture images made on it draw nothing, and JS is told through
 * Skia.gpu.lost so that the app makes them again. Each device and its
 * context are a generation (see generation()).
 */
class DawnContext {
public:
  DawnContext(const DawnContext &) = delete;
  DawnContext &operator=(const DawnContext &) = delete;

  /**
   The GPU Skia renders with, or why there is none: a device without a
   Vulkan 1.1 driver on Android, a driver short of the WebGPU core
   requirements, a device creation failure. Probed once per process, the
   first time the context is asked for (RNSkManager does so when the module
   is installed), and reported to JS as Skia.gpu.
   */
  struct GpuInfo {
    bool available = false;
    /** The adapter Skia renders on; empty when unavailable. */
    DawnUtils::AdapterDescription adapter;
    /** Why the GPU is unavailable; empty when it is. */
    std::string error;
    /** The device in use (see generation()); 0 without one. */
    uint64_t generation = 0;
  };

  /**
   A device that was lost, for the loss listeners (see addLossListener) and
   Skia.gpu.lost: which generation, the reason in WebGPU's terms ("unknown"
   for a loss React Native Skia did not cause) and the driver's message.
   */
  struct LossInfo {
    uint64_t generation = 0;
    std::string reason;
    std::string message;
  };
  using LossListener = std::function<void(const LossInfo &)>;

  /**
   The context. Throws std::runtime_error, with the reason, when the device
   has no GPU Skia can render with: a JSI host function lets it propagate
   and JS gets an Error; native code on a thread of its own, or called from
   Java or Objective-C, uses tryGetInstance() instead, since an exception
   there takes the process down.
   */
  static DawnContext &getInstance() {
    auto *instance = tryGetInstance();
    if (instance == nullptr) {
      throw std::runtime_error(getGpuInfo().error);
    }
    return *instance;
  }

  /** The context, or nullptr when the GPU is unavailable. Never throws. */
  static DawnContext *tryGetInstance() noexcept { return probe().instance; }

  /**
   Probes the GPU if not done yet and describes it. While the device in use
   is lost (see isDeviceLost), unavailable, with the loss as the error.
   Never throws.
   */
  static GpuInfo getGpuInfo() noexcept {
    GpuInfo info = probe().info;
    if (!info.available) {
      return info;
    }
    auto *instance = probe().instance;
    auto *current = instance->_current.load(std::memory_order_acquire);
    info.generation = current->id;
    if (current->lost.load(std::memory_order_acquire)) {
      std::lock_guard<std::mutex> lock(instance->_lostMutex);
      info.available = false;
      info.error = current->lostMessage;
      info.error += current->recoveryFailure.empty()
                        ? " A replacement is being made."
                        : " " + current->recoveryFailure;
    }
    return info;
  }

  /**
   Starts the probe on a thread of its own, so that installing the module
   does not wait for the GPU (drivers load, a device and a Graphite context
   are created). Whoever needs the context first (a view's window, a GPU
   call, Skia.gpu) waits for the probe to finish instead.
   */
  static void probeInBackground() {
    std::thread([]() {
#if defined(__APPLE__)
      pthread_setname_np("RNSkia GPU Probe");
#elif defined(__ANDROID__)
      pthread_setname_np(pthread_self(), "RNSkia GPU Probe");
#endif
      probe();
    }).detach();
  }

  // Generations ---------------------------------------------------------------

  /**
   The device in use, by number: 1 for the one probed, one more for each
   replacement of a lost device (see the class comment); 0 without a GPU.
   Whoever keeps a recorder or a recording remembers the generation it was
   made for and checks it with isCurrent() before using it. Any thread.
   */
  static uint64_t generation() noexcept {
    auto *instance = tryGetInstance();
    return instance == nullptr
               ? 0
               : instance->_current.load(std::memory_order_acquire)->id;
  }

  /**
   Whether the device in use was lost and not replaced yet: a replacement is
   on its way (see onDeviceLost), or none could be made. Nothing renders
   meanwhile: views keep their last frame (RNSkWindowSurface), recordings
   are dropped (RNSkGraphiteTarget), GPU APIs return nothing, and Skia.gpu
   reports the loss. Any thread.
   */
  static bool isDeviceLost() noexcept {
    auto *instance = tryGetInstance();
    return instance != nullptr &&
           instance->_current.load(std::memory_order_acquire)
               ->lost.load(std::memory_order_acquire);
  }

  /**
   Whether something made for the given generation can be used right now:
   it is the device in use, and that device is not lost. Any thread.
   */
  static bool isCurrent(uint64_t generation) noexcept {
    auto *instance = tryGetInstance();
    if (instance == nullptr) {
      return false;
    }
    auto *current = instance->_current.load(std::memory_order_acquire);
    return current->id == generation &&
           !current->lost.load(std::memory_order_acquire);
  }

  /**
   Replaces a lost device now rather than when the backoff allows (see
   scheduleRecovery): the app came back to the foreground, where GPU work
   is allowed again. Nothing happens unless the device in use is lost. Any
   thread.
   */
  static void requestRecovery() noexcept {
    auto *instance = tryGetInstance();
    if (instance == nullptr) {
      return;
    }
    auto *current = instance->_current.load(std::memory_order_acquire);
    if (!current->lost.load(std::memory_order_acquire)) {
      return;
    }
    instance->scheduleRecovery(current, /* failedAttempt= */ false);
  }

  /**
   Registers a listener told of every loss of the device in use, once React
   Native Skia has tried to replace it (so that Skia.gpu describes the new
   device, or why there is none, by the time it runs). Called on the thread
   that made the attempt, outside of the context lock; the listener must
   not need the caller to still exist. Returns the id to remove it with.
   */
  static size_t addLossListener(LossListener listener) {
    auto &registry = lossListeners();
    std::lock_guard<std::mutex> lock(registry.mutex);
    const auto id = ++registry.lastId;
    registry.listeners.emplace(id, std::move(listener));
    return id;
  }

  static void removeLossListener(size_t id) {
    auto &registry = lossListeners();
    std::lock_guard<std::mutex> lock(registry.mutex);
    registry.listeners.erase(id);
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
   completes the GPU work, inside the context lock, or right away, outside
   of it, with nullptr while the device is lost: it must not use the context
   nor a JS runtime (hand the result to the right thread instead). It is
   called exactly once, with nullptr when the read failed.
   */
  void readPixels(const sk_sp<SkImage> &image, const SkIRect &srcRect,
                  std::function<void(ReadResult)> callback) {
    struct Request {
      std::function<void(ReadResult)> callback;
    };
    auto info = image->imageInfo().makeDimensions(srcRect.size());
    {
      std::unique_lock<std::mutex> lock(_mutex);
      auto *current = _current.load(std::memory_order_acquire);
      if (current->lost.load(std::memory_order_acquire)) {
        // A lost device reads nothing back.
        lock.unlock();
        callback(nullptr);
        return;
      }
      auto *request = new Request{std::move(callback)};
      _pendingReadbacks.fetch_add(1, std::memory_order_acq_rel);
      current->context->asyncRescaleAndReadPixels(
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
      current->context->submit();
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
   when it is not texture-backed, which needs no GPU (nor the context: it
   works on a device without one). Throws without a GPU for a Graphite
   image, like getInstance().
   */
  static sk_sp<SkImage> MakeRasterImage(const sk_sp<SkImage> &image) {
    if (!image->isTextureBacked()) {
      return image;
    }
    return MakeRasterImage(image->imageInfo(), getInstance().readPixelsSync(
                                                   image, image->bounds()));
  }

  // Recorders ----------------------------------------------------------------
  //
  // The recorders of the threads (see getRecorder) are known with the
  // generation each was made for (see generation()): a recording is only run
  // on the device it was recorded for (submitRecording), and the recorders
  // of a lost device are kept alive, since a surface made on a recorder
  // cannot be drawn into once the recorder is gone. The render thread pool
  // records the frames of every view on the recorders of its threads (see
  // getThreadRecorder); a target JS records into has a recorder of its own
  // (makeRecorder), tracked by the target (RNSkGraphiteRecorder).

  /**
   A recorder of its own for a target JS records into across calls
   (SkiaViewApi.makeGraphiteContext, see RNSkGraphiteTarget::beginRecording):
   unlike getRecorder() it is not tied to the calling thread. Made for the
   device in use (see generation()), to be replaced once that device is
   lost; its recordings go through insertRecordings(), with the generation
   the target remembers. Creating a recorder is a Context operation, hence
   the lock.
   */
  std::unique_ptr<skgpu::graphite::Recorder> makeRecorder() {
    std::lock_guard<std::mutex> lock(_mutex);
    return makeRecorderLocked();
  }

  /**
   The recorder of the calling thread, for the device in use: a thread
   whose recorder was made for a lost device gets a new one, and the old one
   stays alive for the surfaces made on it (which draw nothing from then on).
   Throws when no recorder can be made.
   */
  skgpu::graphite::Recorder *getRecorder() {
    return currentRecorder(threadSlot());
  }

  /** A thread's recorder with the generation it was made for. */
  struct RecorderRef {
    skgpu::graphite::Recorder *recorder = nullptr;
    uint64_t generation = 0;
  };

  /**
   The recorder of the calling thread (see getRecorder) with the generation
   it was made for: what a frame snapped from it on one thread and replayed
   on another remembers, to be dropped once that device is lost (see
   RNSkGraphiteTarget). Throws when no recorder can be made.
   */
  RecorderRef getThreadRecorder() {
    auto &slot = threadSlot();
    auto *recorder = currentRecorder(slot);
    return {recorder, slot.generation};
  }

  /**
   Frees the GPU memory the recorders of the calling thread hold without
   using it, on that thread (a recorder belongs to the thread it records
   on): what went unused for `unusedFor`, or, with `everything`, all they
   can let go of, the pages of their atlases included. `everything` is for a
   thread that records nothing for now (a render thread once idle, see
   RNSkGraphiteProducer): the atlases lose no content by it, as Graphite
   empties them at every snap when recordings may be inserted in any order.
   The upload recorder lets go of everything either way: what it made
   belongs to the image cache (see makeRecorderLocked). The GPU work that
   finished releases its resources first, and Dawn runs the deletions it
   deferred after. Never makes a recorder. Any thread.
   */
  static void trimThreadRecorders(std::chrono::milliseconds unusedFor,
                                  bool everything) {
    auto *instance = tryGetInstance();
    if (instance == nullptr) {
      return;
    }
    auto &drawing = threadSlot();
    auto &uploads = uploadSlot();
    if (drawing.recorder == nullptr && uploads.recorder == nullptr) {
      return;
    }
    instance->checkFinishedWork();
    if (drawing.recorder != nullptr) {
      if (everything) {
        drawing.recorder->freeGpuResources();
      } else {
        drawing.recorder->performDeferredCleanup(unusedFor);
      }
    }
    if (uploads.recorder != nullptr) {
      // Not performDeferredCleanup(0): a resource it takes back from the
      // return queue counts as used at that moment, so it would keep every
      // texture the image cache let go of since the last call.
      uploads.recorder->freeGpuResources();
    }
    instance->checkFinishedWork();
  }

  /**
   Snaps what the recorder recorded and runs it on the GPU. `recorder` is a
   thread's (see getRecorder), also behind the surfaces made on it; any
   other submits nothing. A recording made for a lost device (see
   generation()) is dropped: nothing can run it, and the device in use would
   refuse its resources. Called on the recorder's thread. Returns whether
   the recording runs: false when there was nothing to run, when it was
   dropped, or when Graphite rejected it (which is logged).
   */
  bool submitRecording(
      skgpu::graphite::Recorder *recorder,
      skgpu::graphite::SyncToCpu syncToCpu = skgpu::graphite::SyncToCpu::kNo) {
    if (recorder == nullptr) {
      return false;
    }
    auto recording = recorder->snap();
    if (recording == nullptr) {
      return false;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    auto *current = _current.load(std::memory_order_acquire);
    if (generationOf(recorder) != current->id ||
        current->lost.load(std::memory_order_acquire)) {
      return false;
    }
    skgpu::graphite::InsertRecordingInfo info;
    info.fRecording = recording.get();
    auto status = current->context->insertRecording(info);
    // InsertStatus converts to true on success.
    const bool inserted = static_cast<bool>(status);
    if (!inserted) {
      RNSkLogger::logToConsole(
          "Graphite rejected a recording (InsertStatus %d): %s",
          static_cast<int>(
              static_cast<skgpu::graphite::InsertStatus::V>(status)),
          status.message().c_str());
    }
    current->context->submit(syncToCpu);
    return inserted;
  }

  /**
   Replays the recordings, in order, onto the target surface (a deferred
   canvas target) and submits them as one batch. A recording Graphite
   rejects is logged and skipped; the others are still submitted. The
   recordings and the surface must be the device's in use (see isCurrent);
   nothing runs while it is lost.
   */
  void
  insertRecordings(const std::vector<skgpu::graphite::Recording *> &recordings,
                   SkSurface *targetSurface) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto *current = _current.load(std::memory_order_acquire);
    if (current->lost.load(std::memory_order_acquire)) {
      return;
    }
    for (auto *recording : recordings) {
      skgpu::graphite::InsertRecordingInfo info;
      info.fRecording = recording;
      info.fTargetSurface = targetSurface;
      auto status = current->context->insertRecording(info);
      // InsertStatus converts to true on success.
      if (!static_cast<bool>(status)) {
        RNSkLogger::logToConsole(
            "Graphite rejected a recording (InsertStatus %d): %s",
            static_cast<int>(
                static_cast<skgpu::graphite::InsertStatus::V>(status)),
            status.message().c_str());
      }
    }
    current->context->submit();
  }

  // GPU objects --------------------------------------------------------------

  /**
   A Graphite image of `image`: uploaded on an upload recorder of this thread
   and submitted, so that any recorder can draw it once this returns. The image
   itself when it already is one (with mipmaps when asked for). An encoded
   image is decoded on the calling thread first. nullptr when the upload
   failed, or did not run (the device is lost). The image provider of every
   recorder uploads the same way (see upload()).
   */
  sk_sp<SkImage> MakeTextureImage(const sk_sp<SkImage> &image, bool mipmapped) {
    if (image->isTextureBacked() && (!mipmapped || image->hasMipmaps())) {
      return image;
    }
    return upload(image, mipmapped).texture;
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

  // Get the wgpu::Instance for WebGPU bindings. The instance outlives every
  // device (see generation()).
  wgpu::Instance getWGPUInstance() { return wgpu::Instance(instance->Get()); }

  // Get the wgpu::Device for WebGPU bindings: the device in use, which a
  // loss replaces (see generation()); the previous one is then good for
  // nothing, and Skia.gpu.lost tells JS to ask again.
  wgpu::Device getWGPUDevice() {
    return _current.load(std::memory_order_acquire)->backendContext.fDevice;
  }

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

    return DawnUtils::requestDevice(adapter, features, /* listener= */ nullptr);
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

    wgpu::Texture texture = getWGPUDevice().CreateTexture(&textureDesc);
    if (!texture) {
      return nullptr;
    }

    // Create a surface backed by this texture
    skgpu::graphite::BackendTexture backendTexture =
        skgpu::graphite::BackendTextures::MakeDawn(texture.Get());

    auto *recorder = getRecorder();
    sk_sp<SkSurface> surface = SkSurfaces::WrapBackendTexture(
        recorder, backendTexture, DawnUtils::PreferedColorType,
        nullptr,  // colorspace
        nullptr); // surfaceProps

    if (!surface) {
      return nullptr;
    }

    // Draw the image onto the surface
    SkCanvas *canvas = surface->getCanvas();
    canvas->drawImage(image, 0, 0);

    // Flush the surface to ensure the image is rendered
    submitRecording(recorder, skgpu::graphite::SyncToCpu::kYes);

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

  /**
   Destroys the Dawn device of a replaced generation (see generation()), so
   that Dawn runs the deletions it deferred on it: a lost device never ticks
   again, and on Android the VkSurfaceKHR of a window's old swapchain keeps
   the window connected until then, so that no swapchain can be made over it
   on the new device (VK_ERROR_NATIVE_WINDOW_IN_USE_KHR). The Generation, its
   device handle and its Graphite context stay: what still points at them
   keeps failing validation, as destroyed rather than lost. Every
   wgpu::Surface configured on the device must be gone first: Dawn does not
   destroy swapchains with their device, and detaching one afterwards
   dereferences the device's deleted fenced deleter (see
   RNSkWindowSurface::ensureDevice). Nothing happens for the device in use,
   or for one destroyed already. Any thread.
   */
  void destroyRetiredDevice(uint64_t generation) {
    std::lock_guard<std::mutex> lock(_mutex);
    for (auto *retired : _retired) {
      if (retired->id == generation && !retired->deviceDestroyed) {
        retired->deviceDestroyed = true;
        retired->backendContext.fDevice.Destroy();
        return;
      }
    }
  }

private:
  struct Probe {
    DawnContext *instance = nullptr;
    GpuInfo info;
  };

  /**
   A device and the Graphite context on it (see generation()). Never
   destroyed: Dawn reports its loss from any of its threads, at any time,
   and the recorders, surfaces and images made on it keep pointing at it.
   The Dawn device itself is destroyed once replaced and let go of by the
   windows (see destroyRetiredDevice); the handle stays valid.
   */
  struct Generation {
    uint64_t id = 0;
    std::chrono::steady_clock::time_point created;
    // Declared before the device it listens to, so that it outlives it.
    DawnUtils::DeviceLostListener listener;
    skgpu::graphite::DawnBackendContext backendContext;
    std::unique_ptr<skgpu::graphite::Context> context;
    // Whether the device was destroyed (see destroyRetiredDevice). Guarded
    // by _mutex.
    bool deviceDestroyed = false;
    // Set once, by the loss callback (any thread, see onDeviceLost); the
    // strings are guarded by _lostMutex.
    std::atomic<bool> lost{false};
    std::string lostReason;
    std::string lostMessage;
    // Why the last attempt to replace the device failed, if it did.
    std::string recoveryFailure;
  };

  /**
   The recorder of one thread, with the generation it was made for (see
   currentRecorder). Forgotten when the thread ends.
   */
  struct ThreadRecorder {
    std::unique_ptr<skgpu::graphite::Recorder> recorder;
    uint64_t generation = 0;
    ~ThreadRecorder() {
      if (recorder == nullptr) {
        return;
      }
      if (auto *instance = tryGetInstance()) {
        instance->forgetRecorder(recorder.get());
      }
    }
  };

  struct LossListeners {
    std::mutex mutex;
    std::map<size_t, LossListener> listeners;
    size_t lastId = 0;
  };

  // Never destroyed: a listener may be added before the GPU is probed, and
  // a loss reported during process teardown.
  static LossListeners &lossListeners() noexcept {
    static auto *registry = new LossListeners();
    return *registry;
  }

  static const Probe &probe() noexcept {
    // Attempted once: a device without a usable GPU does not get one by
    // asking again, and the attempt enumerates drivers. The context is never
    // destroyed: the readback poller is a detached thread using it, which
    // the process takes down at exit instead of a static destructor tearing
    // the context down under it.
    static const Probe *result = []() noexcept {
      auto *probe = new Probe();
      try {
        probe->instance = new DawnContext();
        probe->info.available = true;
        probe->info.adapter = DawnUtils::describeAdapter(
            probe->instance->getWGPUDevice().GetAdapter());
      } catch (const std::exception &e) {
        probe->info.error = e.what();
        RNSkLogger::logToConsole(probe->info.error);
      }
      return probe;
    }();
    return *result;
  }

  // Loss and recovery --------------------------------------------------------

  /**
   Dawn's loss callback for `generation`, on whichever thread Dawn detects
   the loss: possibly inside a context call of this very thread, which holds
   the context lock, so nothing here takes it. Records the loss and, for the
   device in use, schedules its replacement.
   */
  void onDeviceLost(Generation *generation, wgpu::DeviceLostReason reason,
                    const std::string &message) noexcept {
    {
      std::lock_guard<std::mutex> lock(_lostMutex);
      if (generation->lost.load(std::memory_order_relaxed)) {
        return;
      }
      generation->lostReason = DawnUtils::deviceLostReasonName(reason);
      generation->lostMessage =
          "React Native Skia lost its GPU device. Reason: " + message;
      generation->lost.store(true, std::memory_order_release);
    }
    if (generation != _current.load(std::memory_order_acquire)) {
      // A device already replaced (or one still being made, which recover()
      // checks once it is in place): nothing more to do.
      return;
    }
    RNSkLogger::logToConsole("%s", generation->lostMessage.c_str());
    // A device lost right after it was made did not take: GPU work is
    // refused where the app is (the background, on iOS).
    const bool shortLived =
        std::chrono::steady_clock::now() - generation->created < kShortLived;
    scheduleRecovery(generation, shortLived);
  }

  /**
   Schedules the replacement of `lost`, the device in use (see recover()), on
   a thread of its own. The delay grows with the attempts in a row that did
   not take (`failedAttempt`): a replacement that could not be made, or one
   lost right after it was made, as while the app is in the background on
   iOS, where GPU work is refused. After kMaxFailedRecoveries the attempts
   stop until requestRecovery(), when the app comes back to the foreground.
   */
  void scheduleRecovery(Generation *lost, bool failedAttempt) noexcept {
    std::chrono::seconds delay;
    {
      std::lock_guard<std::mutex> lock(_lostMutex);
      _failedRecoveries = failedAttempt ? _failedRecoveries + 1 : 0;
      if (_failedRecoveries > kMaxFailedRecoveries) {
        RNSkLogger::logToConsole(
            "React Native Skia stops trying to replace its lost GPU device "
            "for now; it tries again when the app comes back to the "
            "foreground.");
        return;
      }
      delay =
          _failedRecoveries == 0
              ? std::chrono::seconds(0)
              : std::chrono::seconds(1 << std::min(_failedRecoveries - 1, 5));
    }
    std::thread([this, lost, delay]() {
#if defined(__APPLE__)
      pthread_setname_np("RNSkia GPU Recovery");
#elif defined(__ANDROID__)
      pthread_setname_np(pthread_self(), "RNSkia GPU Recovery");
#endif
      if (delay.count() > 0) {
        std::this_thread::sleep_for(delay);
      }
      recover(lost);
    }).detach();
  }

  /**
   Replaces `lost` with a new device and Graphite context, unless it was
   replaced meanwhile, then tells the loss listeners. The new device is
   validated (see DawnUtils::requestDevice): a resource of the lost device
   that reaches it is refused with an error rather than handed to the
   driver. A replacement that could not be made, or that was lost before it
   was in place, is tried again (see scheduleRecovery).
   */
  void recover(Generation *lost) noexcept {
    LossInfo info;
    Generation *next = nullptr;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_current.load(std::memory_order_acquire) != lost) {
        return;
      }
      {
        std::lock_guard<std::mutex> lostLock(_lostMutex);
        info.generation = lost->id;
        info.reason = lost->lostReason;
        info.message = lost->lostMessage;
      }
      try {
        next = createGeneration(/* validate= */ true);
        _retired.push_back(lost);
        _current.store(next, std::memory_order_release);
        RNSkLogger::logToConsole(
            "React Native Skia replaced its lost GPU device.");
      } catch (const std::exception &e) {
        std::lock_guard<std::mutex> lostLock(_lostMutex);
        lost->recoveryFailure =
            std::string("No replacement could be made: ") + e.what();
        RNSkLogger::logToConsole("React Native Skia could not replace its "
                                 "lost GPU device: %s",
                                 e.what());
      }
    }
    if (next != nullptr) {
      // The textures cached for the lost device are good for nothing on the
      // new one (see ImageProvider).
      ImageProvider::invalidateAll();
    }
    if (next == nullptr) {
      scheduleRecovery(lost, /* failedAttempt= */ true);
    } else if (next->lost.load(std::memory_order_acquire)) {
      // Lost while it was being made (its callback found it not in use yet):
      // GPU work is refused where the app is.
      scheduleRecovery(next, /* failedAttempt= */ true);
    }
    notifyLossListeners(info);
  }

  /**
   A new device on the adapter, with a Graphite context on it, numbered
   after the last one. Throws, with the reason, when either cannot be made.
   Called with the context lock held.
   */
  Generation *createGeneration(bool validate) {
    // Never destroyed (see Generation), also when its creation fails
    // halfway: a device that was made reports its loss to the listener.
    auto *generation = new Generation();
    generation->id = ++_lastGenerationId;
    generation->created = std::chrono::steady_clock::now();
    generation->listener.onLost = [this,
                                   generation](wgpu::DeviceLostReason reason,
                                               const std::string &message) {
      onDeviceLost(generation, reason, message);
    };
    generation->backendContext = DawnUtils::createDawnBackendContext(
        instance.get(), &generation->listener, validate);

    skgpu::graphite::ContextOptions ctxOptions;
    skgpu::graphite::ContextOptionsPriv contextOptionsPriv;
    ctxOptions.fOptionsPriv = &contextOptionsPriv;
    ctxOptions.fOptionsPriv->fStoreContextRefInRecorder = true;
    generation->context = skgpu::graphite::ContextFactory::MakeDawn(
        generation->backendContext, ctxOptions);
    if (!generation->context) {
      throw std::runtime_error(
          "React Native Skia could not create its Graphite context on the "
          "GPU device.");
    }
    return generation;
  }

  static void notifyLossListeners(const LossInfo &info) {
    std::vector<LossListener> listeners;
    {
      auto &registry = lossListeners();
      std::lock_guard<std::mutex> lock(registry.mutex);
      listeners.reserve(registry.listeners.size());
      for (const auto &entry : registry.listeners) {
        listeners.push_back(entry.second);
      }
    }
    for (const auto &listener : listeners) {
      listener(info);
    }
  }

  // Recorders ----------------------------------------------------------------

  /**
   A recorder for the device in use; `forUploads` for the upload recorder of
   a thread (see upload()). Called with the context lock held.
   */
  std::unique_ptr<skgpu::graphite::Recorder>
  makeRecorderLocked(bool forUploads = false) {
    auto *current = _current.load(std::memory_order_acquire);
    if (forUploads) {
      // Skia's default image provider, and no budget: the textures it makes
      // belong to the image cache, or to whoever asked for one. Graphite
      // keeps a texture that comes back to its recorder, for reuse, until the
      // recorder goes over budget (256 MB by default): with a budget, the
      // textures the image cache lets go of would stay on the GPU.
      skgpu::graphite::RecorderOptions options;
      options.fGpuBudgetInBytes = 0;
      return current->context->makeRecorder(options);
    }
    skgpu::graphite::RecorderOptions options;
    // The provider uploads through upload() (see ImageProvider), and serves
    // the recorder textures of the device in use only. The context is never
    // destroyed, so the capture is safe.
    options.fImageProvider = ImageProvider::Make(
        [this, generation = current->id](const SkImage *image, bool mipmapped) {
          try {
            return upload(sk_ref_sp(image), mipmapped);
          } catch (const std::exception &e) {
            // No recorder could be made: a failed upload, which the provider
            // remembers for a moment (see ImageProvider::Uploader).
            RNSkLogger::logToConsole("Uploading an image failed: %s", e.what());
            return ImageProvider::Upload{nullptr, generation};
          }
        },
        current->id);
    return current->context->makeRecorder(options);
  }

  /**
   Uploads a CPU image (decoded first when encoded) on the upload recorder of
   this thread and submits the upload (see MakeTextureImage), with the
   generation of the device it ran on (see ImageProvider::Upload): no texture
   when the upload failed or did not run. Throws when no recorder can be
   made.
   */
  ImageProvider::Upload upload(const sk_sp<SkImage> &image, bool mipmapped) {
    // A recorder of its own: snapping the recorder of this thread would also
    // submit what the offscreen surfaces of this thread recorded so far. It
    // only uploads, so it keeps Skia's default image provider rather than
    // the image cache, which uploads through here.
    auto &slot = uploadSlot();
    auto *recorder = currentRecorder(slot, /* forUploads= */ true);
    ImageProvider::Upload result;
    result.generation = slot.generation;
    auto texture =
        SkImages::TextureFromImage(recorder, image.get(), {mipmapped});
    if (texture == nullptr || !submitRecording(recorder)) {
      // Not run: the texture would hold nothing.
      return result;
    }
    result.texture = std::move(texture);
    return result;
  }

  /**
   The recorder in the slot, made for the device in use: one made for a
   lost device is retired first (see getRecorder), kept alive and known with
   its generation, so that a recording it snaps from now on is dropped (see
   submitRecording). Throws when none can be made.
   */
  skgpu::graphite::Recorder *currentRecorder(ThreadRecorder &slot,
                                             bool forUploads = false) {
    if (slot.recorder != nullptr &&
        slot.generation == _current.load(std::memory_order_acquire)->id) {
      return slot.recorder.get();
    }
    std::lock_guard<std::mutex> lock(_mutex);
    auto *current = _current.load(std::memory_order_acquire);
    auto recorder = makeRecorderLocked(forUploads);
    if (recorder == nullptr) {
      throw std::runtime_error("Failed to create graphite context");
    }
    if (slot.recorder != nullptr) {
      _retiredRecorders.push_back(std::move(slot.recorder));
    }
    _recorders[recorder.get()] = current->id;
    slot.recorder = std::move(recorder);
    slot.generation = current->id;
    return slot.recorder.get();
  }

  /**
   The generation a thread's recorder was made for (see currentRecorder); 0
   for any other recorder. Called with the context lock held.
   */
  uint64_t generationOf(const skgpu::graphite::Recorder *recorder) const {
    auto it = _recorders.find(recorder);
    return it != _recorders.end() ? it->second : 0;
  }

  /** The slot of the calling thread's recorder (see getRecorder). */
  static ThreadRecorder &threadSlot() {
    static thread_local ThreadRecorder slot;
    return slot;
  }

  /** The slot of the calling thread's upload recorder (see upload()). */
  static ThreadRecorder &uploadSlot() {
    static thread_local ThreadRecorder slot;
    return slot;
  }

  /** The recorder of a thread that ended (see ThreadRecorder). */
  void forgetRecorder(const skgpu::graphite::Recorder *recorder) noexcept {
    std::lock_guard<std::mutex> lock(_mutex);
    _recorders.erase(recorder);
  }

  // Readbacks ----------------------------------------------------------------

  void wakeReadbackPoller() {
    std::call_once(_pollerOnce, [this]() {
      std::thread([this]() { pollReadbacks(); }).detach();
    });
    // Taken so that a poller between its predicate check and its wait cannot
    // miss the notification.
    { std::lock_guard<std::mutex> lock(_pollerMutex); }
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
          _current.load(std::memory_order_acquire)
              ->context->checkAsyncWorkCompletion();
          // A readback requested on a device lost since is failed by Dawn;
          // its context delivers that like any other result.
          for (auto *retired : _retired) {
            retired->context->checkAsyncWorkCompletion();
          }
          lock.unlock();
          interval = std::min(interval * 2, std::chrono::milliseconds(4));
        }
        std::this_thread::sleep_for(interval);
      }
    }
  }

  /**
   Lets the GPU work that finished release its resources (command buffers
   hold on to what they use until the context sees them done), and Dawn run
   the deletions it deferred until its next tick. Takes the context lock.
   */
  void checkFinishedWork() {
    std::lock_guard<std::mutex> lock(_mutex);
    tick();
    _current.load(std::memory_order_acquire)
        ->context->checkAsyncWorkCompletion();
  }

  // Processes the instance's events: the completions of every device on it.
  void tick() {
    const auto &backendContext =
        _current.load(std::memory_order_acquire)->backendContext;
    if (backendContext.fTick) {
      backendContext.fTick(backendContext.fInstance);
    }
  }

  // Construction -------------------------------------------------------------

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

    // The first device skips Dawn's validation in release builds; the ones
    // replacing a lost device are validated (see recover).
    _current.store(createGeneration(/* validate= */ false),
                   std::memory_order_release);
  }

  // Never run: the context lives as long as the process (see probe).
  ~DawnContext() = default;

  // The instance outlives every device made on it.
  std::unique_ptr<dawn::native::Instance> instance;

  // The device in use, and the ones it replaced, kept for what still points
  // at them (see Generation). Written under _mutex; read on every frame of
  // every view (isDeviceLost, isCurrent), hence atomic.
  std::atomic<Generation *> _current{nullptr};
  std::vector<Generation *> _retired;
  uint64_t _lastGenerationId = 0;
  // Guards every Context operation, and the replacement of the device.
  std::mutex _mutex;

  // The loss records of the generations and the recovery backoff (see
  // scheduleRecovery). Taken by Dawn's loss callback, possibly inside a
  // Context operation: never wait for _mutex while holding it.
  std::mutex _lostMutex;
  int _failedRecoveries = 0;
  static constexpr int kMaxFailedRecoveries = 6;
  static constexpr auto kShortLived = std::chrono::seconds(5);

  // The recorders of the threads (see currentRecorder), with the generation
  // each was made for, and the ones retired, kept alive. Guarded by _mutex.
  std::unordered_map<const skgpu::graphite::Recorder *, uint64_t> _recorders;
  std::vector<std::unique_ptr<skgpu::graphite::Recorder>> _retiredRecorders;

  // The readback poller: started on the first readback, it checks the
  // context for finished GPU work while readbacks are pending and sleeps
  // otherwise (see readPixels).
  std::atomic<int> _pendingReadbacks{0};
  std::once_flag _pollerOnce;
  std::mutex _pollerMutex;
  std::condition_variable _pollerCondition;
};

} // namespace RNSkia
