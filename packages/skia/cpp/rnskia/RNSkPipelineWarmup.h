#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#if defined(__APPLE__) || defined(__ANDROID__)
#include <pthread.h>
#endif

#include "RNDawnUtils.h"
#include "utils/RNSkLog.h"

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

namespace RNSkia {

/**
 * Compiles the GPU pipelines a frame is about to need before it needs them.
 *
 * Graphite makes a pipeline the first time a draw calls for one: on Dawn the
 * compile itself runs on a Dawn worker thread, but the frame waits for it
 * when its command buffer binds the pipeline, on the presenting thread and
 * under the window's mutex. On a fresh install, the first row of a list
 * compiles exactly while the user scrolls it (see RNSkWindowSurface). This
 * class moves those compiles off the frame, onto a thread of its own, in two
 * ways:
 *
 * - The pipelines the app used are recorded (Graphite serializes their keys,
 *   see ContextOptions::fPipelineCachingCallback) and kept in a file in the
 *   app's cache directory (see setCacheDirectory). The next launch compiles
 *   them first thing, so the screens the app showed last time come up without
 *   a compile on the frame. A key Graphite no longer reads (after a Skia
 *   update) is dropped.
 * - A launch without a record (the first one, or after the cache was cleared)
 *   compiles a built-in set instead: solid colors, images and linear
 *   gradients on the shapes and text views draw, in the passes a window
 *   takes. What the app then draws is recorded, built-in pipelines included,
 *   so later launches compile what was used rather than the set.
 *
 * Precompiled pipelines live in Graphite's pipeline cache like any other,
 * and the cache is bounded (512 pipelines): the record keeps at most
 * kMaxRecordedKeys, the most recently recorded ones.
 *
 * Threading: one warm-up thread per Graphite context (see start), which
 * exits once through, and one writer thread for the process, started by the
 * first key recorded, which writes the record a moment after it last
 * changed. Graphite calls onPipelineCached from whichever thread compiles:
 * the callback only takes this class's mutex, briefly. A device lost during
 * the warm-up ends it (see start).
 *
 * Dawn's error scopes are a stack per device: a pipeline compiled here and
 * one compiled by a frame at the same moment may report into each other's
 * scope. Graphite only scopes the synchronous compiles (precompiles, and the
 * few blit pipelines of a frame), so the overlap is rare, and an error there
 * only drops a pipeline that is made again when next needed.
 */
class PipelineWarmup {
public:
  using Context = skgpu::graphite::PrecompileContext;

  /** The warm-up of the process; never destroyed (see DawnContext). */
  static PipelineWarmup &shared() noexcept {
    static auto *instance = new PipelineWarmup();
    return *instance;
  }

  /**
   The directory the record of pipelines used is kept in: the app's cache
   directory, which the platform gives before the GPU is probed (see
   RNSkiaModule, PlatformContext). Without one, nothing is recorded and every
   launch compiles the built-in set.
   */
  void setCacheDirectory(const std::string &directory) {
    std::lock_guard<std::mutex> lock(_mutex);
    _directory = directory;
  }

  /**
   Whether windows render in Display P3 (see
   RNSkPlatformContext::prefersP3ColorSpace): the built-in set is compiled
   for the color space the windows take. Set by the platform before the GPU
   is probed; sRGB otherwise.
   */
  void setPrefersP3ColorSpace(bool prefersP3) noexcept {
    _prefersP3.store(prefersP3, std::memory_order_release);
  }

  /** Registers the callback that records the pipelines used. */
  void install(skgpu::graphite::ContextOptions &options) {
    options.fPipelineCallbackContext = this;
    options.fPipelineCachingCallback = &PipelineWarmup::onPipelineCached;
  }

  /**
   Warms a new Graphite context on a thread of its own: `context` is the
   precompile helper made from it (Context::makePrecompileContext), which
   the thread owns from here on. The warm-up stops once `lost` is set, which
   the caller keeps valid as long as the context (see
   DawnContext::Generation).
   */
  void start(std::unique_ptr<Context> context, const std::atomic<bool> &lost) {
    {
      // The hashes of the last context's pipelines mean nothing on this one.
      std::lock_guard<std::mutex> lock(_mutex);
      _precompiledByHash.clear();
    }
    std::thread([this, precompile = std::move(context), &lost]() mutable {
#if defined(__APPLE__)
      pthread_setname_np("RNSkia Pipeline Warmup");
#elif defined(__ANDROID__)
      pthread_setname_np(pthread_self(), "RNSkia Pipeline Warmup");
#endif
      run(std::move(precompile), lost);
    }).detach();
  }

private:
  using CacheOp = skgpu::graphite::ContextOptions::PipelineCacheOp;

  static constexpr size_t kMaxRecordedKeys = 256;
  static constexpr auto kWriteDelay = std::chrono::seconds(2);
  static constexpr const char *kFileName = "react-native-skia-pipelines.bin";
  static constexpr char kMagic[8] = {'R', 'N', 'S', 'K', 'P', 'I', 'P', 'E'};
  static constexpr uint32_t kVersion = 1;

  PipelineWarmup() = default;

  // The callback (see ContextOptions::PipelineCachingCallback): Graphite
  // added a pipeline to its cache, or found one there. Any thread.
  static void onPipelineCached(void *context, CacheOp op, const std::string &,
                               uint32_t hash, bool fromPrecompile,
                               sk_sp<SkData> key) {
    auto *self = static_cast<PipelineWarmup *>(context);
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
          self->_precompiledByHash[hash] = std::move(key);
        }
        return;
      }
      self->record(std::move(key));
      return;
    }
    if (op == CacheOp::kPipelineFound && fromPrecompile &&
        std::this_thread::get_id() != self->_warmupThread.load()) {
      // A frame used a precompiled pipeline. Found from the warm-up thread,
      // it is only the warm-up asking twice for the same pipeline.
      sk_sp<SkData> found;
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

  // Adds a key to the record, once, and has it written. Any thread.
  void record(sk_sp<SkData> key) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_directory.empty()) {
      return;
    }
    if (!addLocked(std::move(key))) {
      return;
    }
    markChangedLocked();
  }

  // Whether `key` was new to the record. Called with _mutex held.
  bool addLocked(sk_sp<SkData> key) {
    std::string bytes(static_cast<const char *>(key->data()), key->size());
    if (!_seen.insert(bytes).second) {
      return false;
    }
    _recorded.push_back(std::move(key));
    if (_recorded.size() > kMaxRecordedKeys) {
      auto &oldest = _recorded.front();
      _seen.erase(std::string(static_cast<const char *>(oldest->data()),
                              oldest->size()));
      _recorded.erase(_recorded.begin());
    }
    return true;
  }

  // Has the writer write the record once it settles. Called with _mutex
  // held.
  void markChangedLocked() {
    _changed = true;
    _lastChange = std::chrono::steady_clock::now();
    if (!_writerStarted) {
      _writerStarted = true;
      std::thread([this]() { write(); }).detach();
    }
    _condition.notify_one();
  }

  // The warm-up thread (see start).
  void run(std::unique_ptr<Context> precompile, const std::atomic<bool> &lost) {
    _warmupThread = std::this_thread::get_id();
    const auto started = std::chrono::steady_clock::now();
    const auto before = _precompiled.load(std::memory_order_relaxed);

    // The record: read from its file on the first warm-up, kept in memory
    // (with what was recorded since) for the ones that replace a lost
    // device.
    std::vector<sk_sp<SkData>> keys;
    bool fromFile = false;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      if (_loaded) {
        keys = _recorded;
      } else {
        _loaded = true;
        fromFile = true;
        if (!_directory.empty()) {
          keys = load(_directory + "/" + kFileName);
        }
      }
    }

    // The keys to keep: the ones Graphite could read, and the ones not
    // tried because the device was lost meanwhile.
    std::vector<sk_sp<SkData>> kept;
    for (size_t i = 0; i < keys.size(); i++) {
      if (lost.load(std::memory_order_acquire)) {
        kept.insert(kept.end(), keys.begin() + i, keys.end());
        break;
      }
      if (precompile->precompile(keys[i])) {
        kept.push_back(keys[i]);
      }
    }
    if (fromFile) {
      std::lock_guard<std::mutex> lock(_mutex);
      for (auto &key : kept) {
        addLocked(std::move(key));
      }
      if (kept.size() != keys.size()) {
        // Keys Graphite could not read any more: the next file is without
        // them.
        markChangedLocked();
      }
    }

    const auto afterRecord = _precompiled.load(std::memory_order_relaxed);
    if (keys.empty() && !lost.load(std::memory_order_acquire)) {
      warmBuiltIn(precompile.get(), lost);
    }
    const auto after = _precompiled.load(std::memory_order_relaxed);
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                             std::chrono::steady_clock::now() - started)
                             .count();
    RNSkLogger::logToConsole(
        "React Native Skia compiled %u GPU pipelines ahead of time in %lld "
        "ms: %u of the %zu recorded, %u from the built-in set.",
        after - before, static_cast<long long>(elapsed), afterRecord - before,
        keys.size(), after - afterRecord);
    _warmupThread = std::thread::id();
  }

  /**
   The pipelines views commonly draw with, for a launch without a record.
   Solid colors on every shape (rects, rounded rects, circles, paths,
   strokes) and on glyph masks; images and linear gradients on the simple
   shapes they fill. SrcOver only; everything else is recorded on first
   use. In the passes a window takes: single-sampled with depth, and the
   multisampled ones Graphite switches a pass to for paths (depth alone for
   strokes, with stencil for fills).
   */
  void warmBuiltIn(Context *precompile, const std::atomic<bool> &lost) {
    namespace sg = skgpu::graphite;
    using sg::DrawTypeFlags;

    // What a window is made of (see RNSkWindowSurface::attach): the
    // preferred format, in the color space the platform prefers.
    const SkColorType colorType = DawnUtils::PreferedColorType;
    const sk_sp<SkColorSpace> colorSpace =
        DawnUtils::viewColorSpace(_prefersP3.load(std::memory_order_acquire));

    sg::RenderPassProperties passes[3];
    passes[0].fDSFlags = sg::DepthStencilFlags::kDepth;
    passes[0].fRequiresMSAA = false;
    passes[1].fDSFlags = sg::DepthStencilFlags::kDepth;
    passes[1].fRequiresMSAA = true;
    passes[2].fDSFlags = sg::DepthStencilFlags::kDepthStencil;
    passes[2].fRequiresMSAA = true;
    for (auto &pass : passes) {
      pass.fDstCT = colorType;
      pass.fDstCS = colorSpace;
    }
    const SkSpan<const sg::RenderPassProperties> passSpan(passes);

    const SkBlendMode srcOver = SkBlendMode::kSrcOver;
    const SkSpan<const SkBlendMode> srcOverSpan(&srcOver, 1);

    constexpr auto kShapes = static_cast<DrawTypeFlags>(
        DrawTypeFlags::kSimpleShape | DrawTypeFlags::kNonSimpleShape |
        DrawTypeFlags::kCircularArc | DrawTypeFlags::kBitmapText_Mask);
    constexpr auto kFills = DrawTypeFlags::kSimpleShape;

    // Solid colors, opaque and translucent: the paint's alpha changes the
    // pipeline.
    for (bool opaque : {true, false}) {
      if (lost.load(std::memory_order_acquire)) {
        return;
      }
      sg::PaintOptions solid;
      solid.setBlendModes(srcOverSpan);
      solid.setPaintColorIsOpaque(opaque);
      sg::Precompile(precompile, solid, kShapes, passSpan);
    }

    if (lost.load(std::memory_order_acquire)) {
      return;
    }
    {
      // Images as views upload them (see ImageProvider), drawn with
      // drawImageRect (clamped) or through an ImageShader (decal by
      // default), sampled linearly.
      const SkColorInfo imageInfo(colorType, kPremul_SkAlphaType,
                                  SkColorSpace::MakeSRGB());
      const SkTileMode tileModes[] = {SkTileMode::kClamp, SkTileMode::kDecal};
      sk_sp<sg::PrecompileShader> image = sg::PrecompileShaders::Image(
          sg::PrecompileShaders::ImageShaderFlags::kNoAlphaNoCubic,
          SkSpan<const SkColorInfo>(&imageInfo, 1),
          SkSpan<const SkTileMode>(tileModes));
      sg::PaintOptions images;
      images.setShaders(SkSpan<const sk_sp<sg::PrecompileShader>>(&image, 1));
      images.setBlendModes(srcOverSpan);
      sg::Precompile(precompile, images, kFills, passSpan);
    }

    if (lost.load(std::memory_order_acquire)) {
      return;
    }
    {
      // Linear gradients of up to eight stops.
      sk_sp<sg::PrecompileShader> gradient =
          sg::PrecompileShaders::LinearGradient(
              sg::PrecompileShaders::GradientShaderFlags::kNoLarge);
      sg::PaintOptions gradients;
      gradients.setShaders(
          SkSpan<const sk_sp<sg::PrecompileShader>>(&gradient, 1));
      gradients.setBlendModes(srcOverSpan);
      sg::Precompile(precompile, gradients, kFills, passSpan);
    }
  }

  // Record file ---------------------------------------------------------------

  // The keys of a record file, none for a file that is missing or not one
  // of ours (an older format, a truncated write).
  static std::vector<sk_sp<SkData>> load(const std::string &path) {
    std::vector<sk_sp<SkData>> keys;
    sk_sp<SkData> file = SkData::MakeFromFileName(path.c_str());
    if (!file) {
      return keys;
    }
    const auto *bytes = static_cast<const uint8_t *>(file->data());
    const size_t size = file->size();
    size_t offset = 0;
    auto readU32 = [&](uint32_t *value) {
      if (offset + sizeof(uint32_t) > size) {
        return false;
      }
      std::memcpy(value, bytes + offset, sizeof(uint32_t));
      offset += sizeof(uint32_t);
      return true;
    };
    if (size < sizeof(kMagic) ||
        std::memcmp(bytes, kMagic, sizeof(kMagic)) != 0) {
      return keys;
    }
    offset = sizeof(kMagic);
    uint32_t version = 0;
    uint32_t count = 0;
    if (!readU32(&version) || version != kVersion || !readU32(&count)) {
      return keys;
    }
    for (uint32_t i = 0; i < count && i < kMaxRecordedKeys; i++) {
      uint32_t length = 0;
      if (!readU32(&length) || length == 0 || offset + length > size) {
        break;
      }
      keys.push_back(SkData::MakeSubset(file.get(), offset, length));
      offset += length;
    }
    return keys;
  }

  // The writer thread: writes the record whenever it changed, once it has
  // not for kWriteDelay (the keys come in bursts, as a screen appears).
  void write() {
#if defined(__APPLE__)
    pthread_setname_np("RNSkia Pipeline Record");
#elif defined(__ANDROID__)
    pthread_setname_np(pthread_self(), "RNSkia Pipeline Record");
#endif
    for (;;) {
      std::vector<sk_sp<SkData>> keys;
      std::string path;
      {
        std::unique_lock<std::mutex> lock(_mutex);
        _condition.wait(lock, [this]() { return _changed; });
        for (;;) {
          const auto settled = _lastChange + kWriteDelay;
          _condition.wait_until(lock, settled);
          if (std::chrono::steady_clock::now() >= _lastChange + kWriteDelay) {
            break;
          }
        }
        _changed = false;
        keys = _recorded;
        path = _directory + "/" + kFileName;
      }
      writeFile(path, keys);
    }
  }

  // Writes the record to a file next to `path`, then moves it into place:
  // the next launch reads the whole file or the previous one.
  static void writeFile(const std::string &path,
                        const std::vector<sk_sp<SkData>> &keys) {
    const std::string temporary = path + ".tmp";
    FILE *file = std::fopen(temporary.c_str(), "wb");
    if (file == nullptr) {
      return;
    }
    bool ok = std::fwrite(kMagic, sizeof(kMagic), 1, file) == 1;
    auto writeU32 = [&](uint32_t value) {
      ok = ok && std::fwrite(&value, sizeof(uint32_t), 1, file) == 1;
    };
    writeU32(kVersion);
    writeU32(static_cast<uint32_t>(keys.size()));
    for (const auto &key : keys) {
      writeU32(static_cast<uint32_t>(key->size()));
      ok = ok && std::fwrite(key->data(), key->size(), 1, file) == 1;
    }
    ok = std::fclose(file) == 0 && ok;
    if (!ok || std::rename(temporary.c_str(), path.c_str()) != 0) {
      std::remove(temporary.c_str());
    }
  }

  // Guards everything below but the counters.
  std::mutex _mutex;
  std::condition_variable _condition;
  std::string _directory;
  // The record: the keys of the pipelines used, oldest first, and the same
  // keys by value, to add each once.
  std::vector<sk_sp<SkData>> _recorded;
  std::unordered_set<std::string> _seen;
  // The keys of the pipelines precompiled on the context in use, by the
  // hash Graphite reports them with, until a frame uses one.
  std::unordered_map<uint32_t, sk_sp<SkData>> _precompiledByHash;
  bool _loaded = false;
  bool _changed = false;
  bool _writerStarted = false;
  std::chrono::steady_clock::time_point _lastChange;

  // The pipelines precompiled so far, for the log.
  std::atomic<uint32_t> _precompiled{0};
  // See setPrefersP3ColorSpace.
  std::atomic<bool> _prefersP3{false};
  // The warm-up thread, while one runs; set and read by that thread, and
  // read by the callback, which only compares it with its own.
  std::atomic<std::thread::id> _warmupThread{};
};

} // namespace RNSkia
