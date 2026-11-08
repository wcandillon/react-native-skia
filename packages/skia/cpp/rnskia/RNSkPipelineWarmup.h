#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <initializer_list>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#if defined(__ANDROID__)
#include <sys/resource.h>
#include <sys/syscall.h>
#include <unistd.h>
#elif defined(__APPLE__)
#include <pthread/qos.h>
#endif

#include "RNDawnUtils.h"
#include "RNSkGpuActivity.h"
#include "RNSkPipelineRecord.h"
#include "rnwgpu/DawnBlobCache.h"
#include "utils/RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBlendMode.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkColorType.h"
#include "include/core/SkData.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkRefCnt.h"
#include "include/core/SkSpan.h"
#include "include/core/SkTileMode.h"
#include "include/gpu/graphite/ContextOptions.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/PrecompileContext.h"
#include "include/gpu/graphite/precompile/PaintOptions.h"
#include "include/gpu/graphite/precompile/Precompile.h"
#include "include/gpu/graphite/precompile/PrecompileShader.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Builds the pipelines of the library's common draws ahead of their first
 * use, on a thread of its own, as soon as a GPU device exists. Graphite
 * compiles a pipeline the first time a frame draws with it, on the thread
 * that records the frame, and the frame waits for the compile: hundreds of
 * milliseconds after a fresh install, seconds on a slow GPU, during which
 * the canvas shows nothing (#4384), and on Android, whose surface sync holds
 * a window's frames until a SurfaceView's first buffer arrives, the whole
 * screen freezes. A pipeline built here is found in Graphite's cache
 * instead; one that is not is still compiled inline, as before. Dawn's blob
 * cache on disk (see rnwgpu::DawnBlobCache) keeps the compiled shaders
 * across processes, so the warmup of a second launch is mostly reads.
 *
 * The warmup runs while the frames leave the device alone: from the moment
 * the device exists (on the first launch, while the bundle still loads)
 * until the first frame starts, and from then on only while no frame is
 * made or shown and none was for a moment (see RNSkGpuActivity). Each of
 * its compiles holds Dawn's device lock for its duration, so one that ran
 * alongside a frame would hold that frame up; a frame that comes in waits
 * for the compile in flight at most. Its pipelines serve the frames that
 * follow: the canvases the app mounts next, and the next launch through the
 * blob cache. A device lost meanwhile stops it: its pipelines are good for
 * nothing, and the replacement device starts a warmup of its own.
 *
 * What it builds, in order:
 *
 * - The pipelines the app used last time. Graphite reports every pipeline
 *   it compiles for a frame, with a serialized key that recreates it (see
 *   ContextOptions::fPipelineCachingCallback and onPipelineCached); the
 *   keys are kept in a record in the cache directory (see
 *   RNSkPipelineRecord), written a moment after they last changed, and the
 *   next launch compiles them first thing, so the screens the app showed
 *   come up without a compile on the frame. A key Graphite no longer reads
 *   (after a Skia update) is dropped from the record. So is one Graphite
 *   can only compile on the context that recorded it: a paint with a
 *   runtime effect, Skia's own included (see
 *   RNSkPipelineRecord::isPortable).
 * - On a launch without a record (the first one, or after the cache was
 *   cleared), a built-in set: the paint options <Canvas> content draws
 *   with most (a solid color, an image, a linear and a radial gradient,
 *   the atlas draw, text, drop shadows), for the render passes of a window
 *   (see DawnUtils). What the app then draws is recorded, the built-in
 *   pipelines it used included, so later launches compile what was used
 *   rather than the set.
 *
 * A device replaced after a loss is warmed again from the record in memory.
 */
class RNSkPipelineWarmup {
public:
  /** The warmup of the process; never destroyed (see DawnContext). */
  static RNSkPipelineWarmup &getInstance() {
    static auto *instance = new RNSkPipelineWarmup();
    return *instance;
  }

  /**
   Where the record of the pipelines used is kept: the cache directory
   (see DawnContext::setCacheDirectory), which the platform gives before the
   GPU is probed. Without one, nothing is recorded and every launch builds
   the built-in set. Any thread.
   */
  void setDirectory(const std::string &directory) {
    std::lock_guard<std::mutex> lock(_mutex);
    _directory = directory;
  }

  /**
   Registers the callback that records the pipelines used, on the options
   of every Graphite context made (see DawnContext::createGeneration).
   */
  void install(skgpu::graphite::ContextOptions &options) {
    options.fPipelineCallbackContext = this;
    options.fPipelineCachingCallback = &RNSkPipelineWarmup::onPipelineCached;
  }

  /**
   Starts the warmup for the device the precompile context was made on (see
   Context::makePrecompileContext), in Display P3 as well as sRGB when asked
   (see DawnContext::setPrecompileDisplayP3). The context is used on the
   warmup thread only, and released there. `lost` is the device's loss flag
   (see DawnContext::Generation), which outlives the warmup: set, the warmup
   stops at its next step. `device` is that device, whose pipeline cache the
   thread then keeps on disk (see storePipelineCache). Any thread; returns at
   once.
   */
  void start(std::unique_ptr<skgpu::graphite::PrecompileContext> context,
             bool displayP3, const std::atomic<bool> *lost,
             wgpu::Device device) {
    if (context == nullptr || lost == nullptr) {
      return;
    }
    {
      // The hashes of the last device's pipelines mean nothing on this one.
      std::lock_guard<std::mutex> lock(_mutex);
      _precompiledByHash.clear();
    }
    auto *released = context.release();
    std::thread([this, released, displayP3, lost,
                 device = std::move(device)]() {
      std::unique_ptr<skgpu::graphite::PrecompileContext> owned(released);
      lowerPriority();
      run(owned.get(), displayP3, *lost);
      owned = nullptr;
#if defined(__ANDROID__)
      storePipelineCache(device, *lost);
#else
      (void)device;
#endif
    }).detach();
  }

private:
  using CacheOp = skgpu::graphite::ContextOptions::PipelineCacheOp;
  using Key = RNSkPipelineRecord::Key;

  RNSkPipelineWarmup() = default;

  // How long the frames must have left the device alone before the warmup
  // compiles: longer than the interval of a frame at any display rate, so
  // that a canvas animating at 30 Hz is not interleaved with.
  static constexpr auto kIdle = std::chrono::milliseconds(100);
  // How long the record must have stayed the same before it is written: the
  // keys come in bursts, as a screen appears.
  static constexpr auto kWriteDelay = std::chrono::seconds(2);

  // The callback (see ContextOptions::PipelineCachingCallback): Graphite
  // added a pipeline to its cache, or found one there. Any thread; takes
  // the mutex briefly and compiles nothing.
  static void onPipelineCached(void *context, CacheOp op, const std::string &,
                               uint32_t hash, bool fromPrecompile,
                               sk_sp<SkData> key) {
    auto *self = static_cast<RNSkPipelineWarmup *>(context);
    if (op == CacheOp::kAddingPipeline) {
      if (!key) {
        // Not serializable (a runtime effect of the app's, for one): a
        // pipeline the next launch cannot be told about.
        return;
      }
      if (fromPrecompile) {
        self->_precompiled.fetch_add(1, std::memory_order_relaxed);
        // Kept until a frame finds it (below), which is when it was used.
        std::lock_guard<std::mutex> lock(self->_mutex);
        if (!self->_directory.empty()) {
          self->_precompiledByHash[hash] = toKey(*key);
        }
        return;
      }
      self->record(toKey(*key));
      return;
    }
    if (op == CacheOp::kPipelineFound && fromPrecompile &&
        std::this_thread::get_id() !=
            self->_warmupThread.load(std::memory_order_acquire)) {
      // A frame used a precompiled pipeline. Found from the warmup thread,
      // it is only the warmup asking twice for the same pipeline.
      Key found;
      {
        std::lock_guard<std::mutex> lock(self->_mutex);
        auto it = self->_precompiledByHash.find(hash);
        if (it == self->_precompiledByHash.end()) {
          return;
        }
        found = std::move(it->second);
        self->_precompiledByHash.erase(it);
      }
      self->record(std::move(found));
    }
  }

  static Key toKey(const SkData &data) {
    const auto *bytes = static_cast<const uint8_t *>(data.data());
    return Key(bytes, bytes + data.size());
  }

  // Adds a key to the record, once, and has it written. Any thread.
  void record(Key key) {
    if (!RNSkPipelineRecord::isPortable(key)) {
      return;
    }
    std::lock_guard<std::mutex> lock(_mutex);
    if (_directory.empty() || !_record.add(std::move(key))) {
      return;
    }
    markChangedLocked();
  }

  // Has the writer write the record once it settles. With _mutex held.
  void markChangedLocked() {
    _changed = true;
    _lastChange = std::chrono::steady_clock::now();
    if (!_writerStarted) {
      _writerStarted = true;
      std::thread([this]() { write(); }).detach();
    }
    _condition.notify_one();
  }

  // The writer thread, one for the process: writes the record whenever it
  // changed, once it has not for kWriteDelay.
  void write() {
    for (;;) {
      std::vector<Key> keys;
      std::string path;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _condition.wait(lock, [this]() { return _changed; });
        for (;;) {
          _condition.wait_until(lock, _lastChange + kWriteDelay);
          if (std::chrono::steady_clock::now() >= _lastChange + kWriteDelay) {
            break;
          }
        }
        _changed = false;
        keys = _record.keys();
        path = RNSkPipelineRecord::pathIn(_directory);
      }
      RNSkPipelineRecord::write(path, keys);
    }
  }

#if defined(__ANDROID__)
  // How often the thread looks for pipelines to store, once the warmup is
  // done: the cadence React Native WebGPU flushes the devices it creates at.
  // Rarely: the device is only asked when the frames left it alone, and a
  // look with nothing compiled since costs next to nothing.
  static constexpr auto kStoreInterval = std::chrono::seconds(10);

  // Keeps the device's VkPipelineCache on disk for the next launch (see
  // vulkan_monolithic_pipeline_cache in DawnUtils). Dawn only stores it from
  // PerformIdleTasks, and only if a pipeline was compiled since the last
  // store. The warmup's pipelines go now, those the frames compile inline
  // once they leave the device alone, which leaving the foreground ends up
  // doing. A process killed before that compiles them again next time, like
  // one killed during the warmup. Until the device is lost: its pipelines are
  // not the replacement's to keep. Or until the blob cache refuses the
  // pipeline cache as too large (see DawnBlobCache::setDirectory): Dawn
  // stores on this thread, before PerformIdleTasks returns, and stores
  // nothing but the pipeline cache on idle, so a store refused on the way is
  // the pipeline cache's, and serializing it again (Dawn copies the whole of
  // it out of the driver, hashes it and copies it again) would be for
  // nothing.
  static void storePipelineCache(const wgpu::Device &device,
                                 const std::atomic<bool> &lost) {
    auto &activity = RNSkGpuActivity::getInstance();
    while (!lost.load(std::memory_order_acquire)) {
      if (activity.isIdle(kIdle)) {
        const uint64_t refused =
            rnwgpu::DawnBlobCache::refusedStoresOnThisThread();
        dawn::native::PerformIdleTasks(device);
        if (rnwgpu::DawnBlobCache::refusedStoresOnThisThread() != refused) {
          return;
        }
      }
      std::this_thread::sleep_for(kStoreInterval);
    }
  }
#endif

  // Behind the threads that record and present: a compile that is not
  // needed yet must not delay a frame that is.
  static void lowerPriority() {
#if defined(__ANDROID__)
    setpriority(PRIO_PROCESS, static_cast<id_t>(gettid()), 10);
#elif defined(__APPLE__)
    pthread_set_qos_class_self_np(QOS_CLASS_UTILITY, 0);
#endif
  }

  // The warmup thread (see start): the record first, then, on a launch
  // without one, the built-in set.
  void run(skgpu::graphite::PrecompileContext *context, bool displayP3,
           const std::atomic<bool> &lost) {
    _warmupThread.store(std::this_thread::get_id(), std::memory_order_release);
    const auto started = std::chrono::steady_clock::now();
    const auto before = _precompiled.load(std::memory_order_relaxed);

    // The record: read from its file on the first warmup, kept in memory
    // (with what was recorded since) for the ones that replace a lost
    // device.
    std::vector<Key> keys;
    bool fromFile = false;
    bool dropped = false;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_loaded) {
        keys = _record.keys();
      } else {
        _loaded = true;
        fromFile = true;
        if (!_directory.empty()) {
          keys =
              RNSkPipelineRecord::load(RNSkPipelineRecord::pathIn(_directory));
          // A file written before such keys were left out of the record
          // (see isPortable): the next file is without them.
          const auto end =
              std::remove_if(keys.begin(), keys.end(), [](const Key &key) {
                return !RNSkPipelineRecord::isPortable(key);
              });
          dropped = end != keys.end();
          keys.erase(end, keys.end());
        }
      }
    }
    // One pipeline per step, behind the frames (see RNSkGpuActivity). The
    // keys to keep: the ones Graphite could read, and the ones not tried
    // because the device was lost meanwhile.
    auto &activity = RNSkGpuActivity::getInstance();
    std::vector<Key> kept;
    for (size_t i = 0; i < keys.size(); i++) {
      if (!activity.waitForIdle(kIdle, lost)) {
        kept.insert(kept.end(), keys.begin() + static_cast<long>(i),
                    keys.end());
        break;
      }
      if (context->precompile(
              SkData::MakeWithCopy(keys[i].data(), keys[i].size()))) {
        kept.push_back(keys[i]);
      }
    }
    if (fromFile) {
      std::lock_guard<std::mutex> lock(_mutex);
      for (auto &key : kept) {
        _record.add(std::move(key));
      }
      if ((dropped || kept.size() != keys.size()) && !_directory.empty()) {
        // Keys Graphite could not read any more: the next file is without
        // them.
        markChangedLocked();
      }
    }
    const auto afterRecord = _precompiled.load(std::memory_order_relaxed);

    if (keys.empty()) {
      warmBuiltIn(context, displayP3, lost);
    }

    const auto after = _precompiled.load(std::memory_order_relaxed);
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                             std::chrono::steady_clock::now() - started)
                             .count();
    RNSkLogger::logToConsole(
        "React Native Skia compiled %u GPU pipelines ahead of the frames in "
        "%lld ms: %u of the %zu recorded, %u of the built-in set",
        after - before, static_cast<long long>(elapsed), afterRecord - before,
        keys.size(), after - afterRecord);
    _warmupThread.store(std::thread::id(), std::memory_order_release);
  }

  // The built-in set, for a launch without a record.
  static void warmBuiltIn(skgpu::graphite::PrecompileContext *context,
                          bool displayP3, const std::atomic<bool> &lost) {
    namespace graphite = skgpu::graphite;
    using graphite::DrawTypeFlags;
    using graphite::PaintOptions;
    using graphite::RenderPassProperties;

    // The render passes of a window: single-sampled with a depth buffer for
    // the simple shapes, text and vertices, multisampled with depth and
    // stencil for the paths. In the window's format (see
    // DawnUtils::PreferedColorType), in sRGB and, on a wide gamut display,
    // in Display P3 too.
    RenderPassProperties passes[4];
    size_t passCount = 0;
    for (const bool p3 : {false, true}) {
      if (p3 && !displayP3) {
        continue;
      }
      const auto colorSpace = DawnUtils::viewColorSpace(p3);
      passes[passCount++] = {graphite::DepthStencilFlags::kDepth,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ false};
      passes[passCount++] = {graphite::DepthStencilFlags::kDepthStencil,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ true};
    }

    // One step per set of paint options, draw type and render pass: a few
    // pipelines, between which the warmup waits for the frames to leave
    // the device alone, and stops for a device lost meanwhile. False once
    // stopped.
    auto &activity = RNSkGpuActivity::getInstance();
    const auto precompile =
        [&](const PaintOptions &options,
            std::initializer_list<DrawTypeFlags> drawTypes) {
          for (const auto drawType : drawTypes) {
            for (size_t i = 0; i < passCount; i++) {
              if (!activity.waitForIdle(kIdle, lost)) {
                return false;
              }
              graphite::Precompile(
                  context, options, drawType,
                  SkSpan<const RenderPassProperties>(&passes[i], 1));
            }
          }
          return true;
        };

    // The render steps of the shapes, the text, and the vertices the atlas
    // draws with (see RNSkAtlas): the parts of kSimpleShape one at a time,
    // a render step each, and the paths (kNonSimpleShape, a dozen render
    // steps, the longest step of the warmup) last.
    const std::initializer_list<DrawTypeFlags> kShapesTextAndVertices = {
        DrawTypeFlags::kAnalyticRRect,    DrawTypeFlags::kPerEdgeAAQuad,
        DrawTypeFlags::kNonAAFillRect,    DrawTypeFlags::kBitmapText_Mask,
        DrawTypeFlags::kBitmapText_Color, DrawTypeFlags::kDrawVertices,
        DrawTypeFlags::kNonSimpleShape};

    const SkBlendMode blendModes[] = {SkBlendMode::kSrcOver};

    // A solid color, opaque or not: the most common draws first, so that
    // the time before the first frame goes to them.
    for (const bool opaque : {true, false}) {
      PaintOptions solid;
      solid.setBlendModes(blendModes);
      solid.setPaintColorIsOpaque(opaque);
      if (!precompile(solid, kShapesTextAndVertices)) {
        return;
      }
    }

    // An image (decoded to the platform's native format, premultiplied, in
    // sRGB, drawn clamped, then with decal edges), a linear and a radial
    // gradient: one shader per set, so that a step stays a few pipelines.
    {
      const SkColorInfo imageInfos[] = {SkColorInfo(
          kN32_SkColorType, kPremul_SkAlphaType, SkColorSpace::MakeSRGB())};
      const SkTileMode clamp[] = {SkTileMode::kClamp};
      const SkTileMode decal[] = {SkTileMode::kDecal};
      const sk_sp<graphite::PrecompileShader> shaders[] = {
          graphite::PrecompileShaders::Image(
              graphite::PrecompileShaders::ImageShaderFlags::kExcludeCubic,
              imageInfos, clamp),
          graphite::PrecompileShaders::Image(
              graphite::PrecompileShaders::ImageShaderFlags::kExcludeCubic,
              imageInfos, decal),
          graphite::PrecompileShaders::LinearGradient(
              graphite::PrecompileShaders::GradientShaderFlags::kNoLarge),
          graphite::PrecompileShaders::RadialGradient(
              graphite::PrecompileShaders::GradientShaderFlags::kNoLarge),
      };
      for (const auto &shader : shaders) {
        const sk_sp<graphite::PrecompileShader> one[] = {shader};
        PaintOptions shaded;
        shaded.setShaders(one);
        shaded.setBlendModes(blendModes);
        if (!precompile(shaded, kShapesTextAndVertices)) {
          return;
        }
      }
    }

    // The drop shadows Skia draws on its own. Not the blurs (the mask
    // filter of a shadow, the image filter of <Blur>): their precompile
    // expands to dozens of pipelines, which held the device lock for 12 s
    // on a Pixel 8 against 70 to 400 ms for any step above, and a blur is
    // compiled inline for the sigma it is drawn with anyway.
    {
      PaintOptions shadows;
      precompile(shadows, {DrawTypeFlags::kDropShadows});
    }
  }

  // Guards everything below but the atomics.
  std::mutex _mutex;
  std::condition_variable _condition;
  std::string _directory;
  // The pipelines used, for the next launch (see RNSkPipelineRecord).
  RNSkPipelineRecord _record;
  // The keys of the pipelines precompiled on the device in use, by the hash
  // Graphite reports them with, until a frame uses one.
  std::unordered_map<uint32_t, Key> _precompiledByHash;
  bool _loaded = false;
  bool _changed = false;
  bool _writerStarted = false;
  std::chrono::steady_clock::time_point _lastChange;

  // The pipelines precompiled so far, for the log.
  std::atomic<uint32_t> _precompiled{0};
  // The warmup thread, while one runs: set and cleared by that thread, and
  // compared with its own by the callback.
  std::atomic<std::thread::id> _warmupThread{};
};

} // namespace RNSkia
