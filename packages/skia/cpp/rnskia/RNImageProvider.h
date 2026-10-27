#pragma once

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstring>
#include <functional>
#include <list>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#if defined(__APPLE__)
#include <pthread.h>
#include <pthread/qos.h>
#elif defined(__ANDROID__)
#include <pthread.h>
#include <sys/resource.h>
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImage.h"
#include "include/core/SkTiledImageUtils.h"
#include "include/gpu/graphite/Image.h"
#include "include/gpu/graphite/ImageProvider.h"
#include "include/gpu/graphite/Recorder.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Uploads the CPU images (raster or encoded) the recorders draw, and keeps
 * the textures for the next frames, in one cache for the whole process.
 *
 * Graphite only draws GPU images: it hands any other image to the provider of
 * the recorder, and drops the draw when the provider returns nothing. This is
 * the implicit path; the explicit one is SkImage::makeTextureImage()
 * (DawnContext::MakeTextureImage), and the provider uploads the same way: on
 * an upload recorder of the calling thread, submitted right away, rather
 * than recorded into the frame that first draws the image. The texture is
 * then complete on the GPU before any recording that samples it is inserted,
 * in whatever order the recordings are inserted. That is what lets every
 * recorder share the one cache: the render thread pool records the frames of
 * every view on the recorders of its threads, and the views present them in
 * an order of their own, so an upload riding in one view's frame could not
 * be relied on by another's. An image drawn by many views is uploaded once:
 * the first thread to miss it uploads it, the others wait for that upload
 * rather than decode and upload a copy of their own.
 *
 * The cache is bounded by bytes, least recently used first out, and a thread
 * of its own releases the entries not drawn for a while, so that the
 * textures of a screen that is gone do not wait for the next lookup. A
 * released texture goes back to the upload recorder it was made on, which
 * frees it on its own thread once asked to (see setReleaseListener). Every
 * entry carries the generation of the GPU device it was uploaded on (see
 * DawnContext::generation()): a recorder only gets textures of its own
 * device, an entry of a device since lost is released when a newer recorder
 * finds it, and the whole cache is cleared when the device is replaced
 * (invalidateAll), whichever happens first. A failed upload is remembered
 * for a moment, so that an image the GPU refuses is not decoded and uploaded
 * again on every frame of every view drawing it. The lock is held for the
 * bookkeeping only, never for an upload: decoding and uploading an image can
 * take a while, and uploads of different images run in parallel.
 */
class ImageProvider : public skgpu::graphite::ImageProvider {
public:
  /**
   What an Uploader returns: the GPU image, and the generation of the GPU
   device it was uploaded on (see DawnContext::generation()). No texture when
   the upload failed, with the generation of the device that refused it.
   */
  struct Upload {
    sk_sp<SkImage> texture;
    uint64_t generation = 0;
  };

  /**
   Uploads a CPU image and submits the upload, so that any recorder of the
   device can draw the GPU image it returns (see
   DawnContext::MakeTextureImage). Reports a failure rather than throwing:
   Skia, which calls the provider, is not compiled for exceptions.
   */
  using Uploader = std::function<Upload(const SkImage *image, bool mipmapped)>;

  /** Bytes of textures the cache keeps before releasing the oldest. */
  static constexpr size_t kDefaultBudgetInBytes = 128 * 1024 * 1024;
  /** An entry not drawn for that long is released. */
  static constexpr std::chrono::seconds kMaxUnusedAge{10};
  /** An image whose upload failed is not uploaded again for that long. */
  static constexpr std::chrono::seconds kFailureRetryDelay{1};

  /**
   The provider of a recorder made for the device of `generation` (see
   DawnContext::generation()): it only hands that recorder textures of that
   device.
   */
  ImageProvider(Uploader uploader, uint64_t generation)
      : _uploader(std::move(uploader)), _generation(generation) {}

  static sk_sp<ImageProvider> Make(Uploader uploader, uint64_t generation) {
    return sk_make_sp<ImageProvider>(std::move(uploader), generation);
  }

  /**
   Releases every texture the cache holds. Called when the GPU device is
   replaced (see DawnContext): the textures were made on the lost device,
   which the new one refuses. Any thread.
   */
  static void invalidateAll() { cache().clear(); }

  /**
   What to call after the cache let go of textures: entries not drawn for
   kMaxUnusedAge, evicted for the budget, or all of them (invalidateAll).
   Called on the thread that let go of them, outside the cache lock. A texture
   goes back to the recorder that uploaded it, which only frees it on its own
   thread (see DawnContext::trimThreadRecorders): the listener asks for that.
   Any thread.
   */
  static void setReleaseListener(std::function<void()> listener) {
    cache().setReleaseListener(std::move(listener));
  }

  sk_sp<SkImage>
  findOrCreate(skgpu::graphite::Recorder *recorder, const SkImage *image,
               SkImage::RequiredProperties requiredProps) override {
    auto &shared = cache();
    const bool mipmapped = requiredProps.fMipmapped;
    auto lookup = shared.lookup(image, mipmapped, _generation);
    if (lookup.texture != nullptr) {
      return lookup.texture;
    }
    if (!lookup.claimed) {
      // Failed a moment ago (see kFailureRetryDelay).
      return nullptr;
    }
    // Outside the lock (see the class comment). The claim is handed back
    // whatever happens, or the threads waiting for it would wait for good.
    Upload upload;
    try {
      upload = _uploader(image, mipmapped);
    } catch (...) {
      upload = Upload{nullptr, _generation};
    }
    return shared.endUpload(lookup.key, std::move(upload));
  }

  /** Bytes of textures held, for tests and diagnostics. */
  static size_t bytesUsed() { return cache().bytesUsed(); }

  /** Number of textures held, for tests and diagnostics. */
  static size_t count() { return cache().count(); }

private:
  using Clock = std::chrono::steady_clock;

  // The content of the image (the generation id of its pixels, or the id
  // of its generator, and the subset), not its address: two images sharing
  // pixels share a texture, and a freed image's address cannot alias.
  class Key {
  public:
    Key() { std::memset(_values, 0, sizeof(_values)); }

    Key(const SkImage *image, bool mipmapped) {
      SkTiledImageUtils::GetImageKeyValues(image, _values);
      _values[kNumValues - 1] = mipmapped ? 1 : 0;
    }

    bool operator==(const Key &other) const {
      return std::memcmp(_values, other._values, sizeof(_values)) == 0;
    }

    size_t hash() const {
      size_t h = 0;
      for (auto value : _values) {
        h = h * 31 + value;
      }
      return h;
    }

  private:
    static constexpr int kNumValues = SkTiledImageUtils::kNumImageKeyValues + 1;
    uint32_t _values[kNumValues];
  };

  struct KeyHash {
    size_t operator()(const Key &key) const { return key.hash(); }
  };

  struct Entry {
    Key key;
    sk_sp<SkImage> texture;
    size_t bytes;
    Clock::time_point lastUsed;
    // The GPU device the texture was uploaded on.
    uint64_t generation;
  };

  // An upload that failed, on the device of `generation`.
  struct Failure {
    Clock::time_point when;
    uint64_t generation;
  };

  /** The cache every provider shares. Any thread. */
  class Cache {
  public:
    /** What lookup() found, or the claim to upload the image. */
    struct Lookup {
      /** The texture held, most recently used now. */
      sk_sp<SkImage> texture;
      /**
       No texture, and the caller is to upload one and hand it to endUpload()
       with this key, whatever happens: the other threads drawing the image
       wait for that. Neither texture nor claim: the upload failed a moment
       ago.
       */
      bool claimed = false;
      Key key;
    };

    explicit Cache(size_t budgetInBytes) : _budget(budgetInBytes) {}

    /**
     The texture of the image for a recorder of the device of `generation`,
     if held. Otherwise, while another thread uploads it, waits for that
     upload and looks again; otherwise the claim to upload it (see Lookup).
     */
    Lookup lookup(const SkImage *image, bool mipmapped, uint64_t generation) {
      Lookup result;
      result.key = Key(image, mipmapped);
      // A mipmapped texture also serves a draw without mipmaps.
      const Key mipmappedKey =
          mipmapped ? result.key : Key(image, /* mipmapped= */ true);
      // The stale entries met are released outside the lock (declared
      // before it, so destroyed after it).
      std::vector<sk_sp<SkImage>> released;
      std::unique_lock<std::mutex> lock(_mutex);
      for (;;) {
        const auto now = Clock::now();
        if (auto *hit = findLocked(mipmappedKey, generation, now, released)) {
          result.texture = *hit;
          return result;
        }
        if (!mipmapped) {
          if (auto *hit = findLocked(result.key, generation, now, released)) {
            result.texture = *hit;
            return result;
          }
        }
        if (_uploading.count(result.key) == 0 &&
            _uploading.count(mipmappedKey) == 0) {
          break;
        }
        // Being uploaded by another thread, with or without mipmaps: either
        // serves. Its endUpload() wakes this up.
        _uploaded.wait(lock);
      }
      if (failedRecentlyLocked(result.key, generation, Clock::now())) {
        return result;
      }
      _uploading.insert(result.key);
      result.claimed = true;
      return result;
    }

    /**
     Ends the upload claimed by lookup(): keeps the texture and returns it,
     or remembers the failure (see kFailureRetryDelay) and returns nullptr.
     A texture of a device older than the one already held for the key is
     released instead, and the held one returned. The newest entry stays even
     when it alone exceeds the budget: it is drawn this frame, and dropping
     it would upload it again every frame.
     */
    sk_sp<SkImage> endUpload(const Key &key, Upload upload) {
      // The textures evicted (and the one that lost out) are released
      // outside the lock, and the listener told after.
      std::vector<sk_sp<SkImage>> released;
      sk_sp<SkImage> texture;
      std::function<void()> listener;
      {
        std::lock_guard<std::mutex> lock(_mutex);
        texture = endUploadLocked(key, std::move(upload), released);
        if (!released.empty()) {
          listener = _releaseListener;
        }
      }
      released.clear();
      if (listener) {
        listener();
      }
      return texture;
    }

    void clear() {
      std::function<void()> listener;
      {
        List entries;
        {
          std::lock_guard<std::mutex> lock(_mutex);
          entries.swap(_entries);
          _index.clear();
          _failures.clear();
          _bytes = 0;
          if (!entries.empty()) {
            listener = _releaseListener;
          }
        }
        // Released outside the lock.
      }
      if (listener) {
        listener();
      }
    }

    void setReleaseListener(std::function<void()> listener) {
      std::lock_guard<std::mutex> lock(_mutex);
      _releaseListener = std::move(listener);
    }

    size_t bytesUsed() {
      std::lock_guard<std::mutex> lock(_mutex);
      return _bytes;
    }

    size_t count() {
      std::lock_guard<std::mutex> lock(_mutex);
      return _entries.size();
    }

  private:
    // Most recently used first.
    using List = std::list<Entry>;

    /** See endUpload(). Under the lock. */
    sk_sp<SkImage> endUploadLocked(const Key &key, Upload upload,
                                   std::vector<sk_sp<SkImage>> &released) {
      const auto now = Clock::now();
      _uploading.erase(key);
      _uploaded.notify_all();
      if (upload.texture == nullptr) {
        _failures[key] = Failure{now, upload.generation};
        startReaperLocked();
        _reaperWakeup.notify_one();
        return nullptr;
      }
      _failures.erase(key);
      auto existing = _index.find(key);
      if (existing != _index.end()) {
        // Uploaded by a retired recorder's thread while the entry was made
        // on the device in use (see findLocked), or the other way round.
        if (existing->second->generation >= upload.generation) {
          released.push_back(std::move(upload.texture));
          existing->second->lastUsed = now;
          _entries.splice(_entries.begin(), _entries, existing->second);
          return existing->second->texture;
        }
        eraseLocked(existing->second, released);
      }
      const size_t bytes = upload.texture->textureSize();
      _entries.push_front(
          Entry{key, upload.texture, bytes, now, upload.generation});
      _index.insert_or_assign(key, _entries.begin());
      _bytes += bytes;
      while (_bytes > _budget && _entries.size() > 1) {
        eraseLocked(std::prev(_entries.end()), released);
      }
      startReaperLocked();
      _reaperWakeup.notify_one();
      return upload.texture;
    }

    /**
     The entry of the key, for a recorder of the device of `generation`. An
     entry of an older device is good for nothing anymore: released. An
     entry of a newer device is left alone: the lookup comes from a recorder
     made before the device was replaced, whose frame is dropped anyway.
     */
    sk_sp<SkImage> *findLocked(const Key &key, uint64_t generation,
                               Clock::time_point now,
                               std::vector<sk_sp<SkImage>> &released) {
      auto it = _index.find(key);
      if (it == _index.end()) {
        return nullptr;
      }
      auto entry = it->second;
      if (entry->generation < generation) {
        eraseLocked(entry, released);
        return nullptr;
      }
      if (entry->generation > generation) {
        return nullptr;
      }
      _entries.splice(_entries.begin(), _entries, entry);
      entry->lastUsed = now;
      return &entry->texture;
    }

    bool failedRecentlyLocked(const Key &key, uint64_t generation,
                              Clock::time_point now) {
      auto it = _failures.find(key);
      if (it == _failures.end()) {
        return false;
      }
      // A replaced device gets a fresh attempt right away.
      if (it->second.generation != generation ||
          now - it->second.when >= kFailureRetryDelay) {
        _failures.erase(it);
        return false;
      }
      return true;
    }

    // Entries are ordered by last use: the unused ones are at the back.
    void releaseUnusedLocked(Clock::time_point now,
                             std::vector<sk_sp<SkImage>> &released) {
      while (!_entries.empty() &&
             now - _entries.back().lastUsed >= kMaxUnusedAge) {
        eraseLocked(std::prev(_entries.end()), released);
      }
      for (auto it = _failures.begin(); it != _failures.end();) {
        if (now - it->second.when >= kFailureRetryDelay) {
          it = _failures.erase(it);
        } else {
          ++it;
        }
      }
    }

    void eraseLocked(List::iterator it, std::vector<sk_sp<SkImage>> &released) {
      _bytes -= it->bytes;
      _index.erase(it->key);
      released.push_back(std::move(it->texture));
      _entries.erase(it);
    }

    // The reaper thread (see reap()), started by the first upload. Detached:
    // the cache is never destroyed, and the process takes the thread down.
    void startReaperLocked() {
      if (_reaperStarted) {
        return;
      }
      _reaperStarted = true;
      std::thread([this]() { reap(); }).detach();
    }

    /**
     Releases the entries unused for kMaxUnusedAge, and forgets the failures
     past kFailureRetryDelay, as they expire: sleeps until the oldest one
     does, and until an upload when there is none. Releasing a texture from
     here is safe: a Graphite resource freed on another thread goes back to
     its recorder's cache through a queue.
     */
    void reap() {
#if defined(__APPLE__)
      pthread_setname_np("RNSkia Images");
      pthread_set_qos_class_self_np(QOS_CLASS_UTILITY, 0);
#elif defined(__ANDROID__)
      pthread_setname_np(pthread_self(), "RNSkia Images");
      // ANDROID_PRIORITY_BACKGROUND, for this thread only (see
      // RNSkThreadPool).
      setpriority(PRIO_PROCESS, 0, 10);
#endif
      std::vector<sk_sp<SkImage>> released;
      std::unique_lock<std::mutex> lock(_mutex);
      for (;;) {
        if (_entries.empty() && _failures.empty()) {
          _reaperWakeup.wait(lock);
          continue;
        }
        auto deadline = Clock::time_point::max();
        if (!_entries.empty()) {
          deadline = _entries.back().lastUsed + kMaxUnusedAge;
        }
        for (const auto &failure : _failures) {
          deadline =
              std::min(deadline, failure.second.when + kFailureRetryDelay);
        }
        // A lookup may have refreshed the oldest entry meanwhile: the loop
        // then computes the next deadline.
        _reaperWakeup.wait_until(lock, deadline);
        releaseUnusedLocked(Clock::now(), released);
        if (!released.empty()) {
          auto listener = _releaseListener;
          lock.unlock();
          released.clear();
          if (listener) {
            listener();
          }
          lock.lock();
        }
      }
    }

    std::mutex _mutex;
    size_t _budget;
    size_t _bytes = 0;
    List _entries;
    std::unordered_map<Key, List::iterator, KeyHash> _index;
    // The keys being uploaded, each by one thread (see lookup()).
    std::unordered_set<Key, KeyHash> _uploading;
    std::condition_variable _uploaded;
    std::unordered_map<Key, Failure, KeyHash> _failures;
    bool _reaperStarted = false;
    std::condition_variable _reaperWakeup;
    // See ImageProvider::setReleaseListener.
    std::function<void()> _releaseListener;
  };

  static Cache &cache() {
    // Never destroyed: a recorder may draw during process teardown.
    static auto *instance = new Cache(kDefaultBudgetInBytes);
    return *instance;
  }

  Uploader _uploader;
  uint64_t _generation;
};

} // namespace RNSkia
