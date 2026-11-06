#pragma once

#include <dirent.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <mutex>
#include <string>
#include <vector>

namespace RNSkia {

/**
 * Dawn's blob cache, on disk: what Dawn asks to keep across devices (the
 * translated shaders, and on Vulkan the pipeline caches), so that a fresh
 * process finds what the previous one compiled rather than compiling it
 * again on its first frame (see RNSkPipelineWarmup for the other half).
 * Installed on every device as its DawnCacheDeviceDescriptor (see
 * DawnUtils::requestDevice) once a directory is set (see
 * DawnContext::setCacheDirectory); without one, Dawn caches in memory only.
 *
 * One file per entry, named after a hash of Dawn's key, which the file
 * carries so that a hash collision reads as a miss: the magic, the key's
 * size, the key, the value. Dawn's keys carry its own version and the
 * adapter's identity, so a stale entry is never asked for; it is let go of
 * once nothing has asked for it in a while (see prune). Any thread: Dawn
 * loads and stores from whichever thread creates a pipeline, the warmup
 * thread included; the calls are serialized here.
 */
class RNSkBlobCache {
public:
  // Vulkan pipeline caches run to a few megabytes; anything beyond this is
  // not a cache entry.
  static constexpr size_t kMaxValueSize = 64u * 1024u * 1024u;
  // What the directory holds at most: the oldest entries go past this (see
  // prune). An app's shaders and pipeline caches take a few megabytes.
  static constexpr uint64_t kMaxTotalBytes = 64u * 1024u * 1024u;
  // How long an entry is kept once nothing loads or stores it: long enough
  // for a screen the app rarely shows, short enough that the entries of a
  // previous Dawn, adapter or driver do not pile up for good.
  static constexpr auto kMaxAge = std::chrono::hours(24 * 30);

  static RNSkBlobCache &getInstance() {
    // Never destroyed: Dawn may store while the process exits.
    static auto *instance = new RNSkBlobCache();
    return *instance;
  }

  /**
   Where the entries go: created when missing. A directory that cannot be
   made leaves the cache disabled. Any thread; takes effect for the devices
   created from then on.
   */
  void setDirectory(const std::string &directory) {
    std::lock_guard<std::mutex> lock(_mutex);
    _directory = makeDirectories(directory) ? directory : std::string();
    _last = Entry();
  }

  /** Whether a directory is set (see setDirectory). Any thread. */
  bool isEnabled() {
    std::lock_guard<std::mutex> lock(_mutex);
    return !_directory.empty();
  }

  /**
   Dawn's load, in two calls: with `value` null, the size of the entry (0
   when there is none); then with a buffer of that size, which the entry is
   copied into. Returns the entry's size either way, or 0 when `valueSize`
   is too small for it. An entry loaded is touched: it stays (see prune).
   */
  size_t load(const uint8_t *key, size_t keySize, uint8_t *value,
              size_t valueSize) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_directory.empty() || key == nullptr || keySize == 0) {
      return 0;
    }
    if (!_last.matches(key, keySize) && !read(key, keySize)) {
      return 0;
    }
    const size_t size = _last.value.size();
    if (value == nullptr) {
      return size;
    }
    if (valueSize < size) {
      return 0;
    }
    std::memcpy(value, _last.value.data(), size);
    // Copied: the entry is Dawn's now, and a pipeline cache of several
    // megabytes is not kept here for the rest of the run.
    _last = Entry();
    return size;
  }

  /** Dawn's store: an entry too large to be worth a file is dropped. */
  void store(const uint8_t *key, size_t keySize, const uint8_t *value,
             size_t valueSize) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_directory.empty() || key == nullptr || keySize == 0 ||
        value == nullptr || valueSize == 0 || valueSize > kMaxValueSize) {
      return;
    }
    write(key, keySize, value, valueSize);
  }

  /**
   Lets go of the entries no longer in use: those neither loaded nor stored
   for `maxAge` (a load touches its file, so an entry in use stays, while
   the entries of a previous Dawn, adapter or driver, which nothing asks
   for again, go once that long has passed), the temporary files a writer
   that died left behind, and, past `maxTotalBytes`, the oldest of the
   rest. Once per launch, by the warmup thread (see RNSkPipelineWarmup);
   any thread, and the loads and stores meanwhile wait for it.
   */
  void prune(std::chrono::seconds maxAge = kMaxAge,
             uint64_t maxTotalBytes = kMaxTotalBytes) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_directory.empty()) {
      return;
    }
    DIR *directory = ::opendir(_directory.c_str());
    if (directory == nullptr) {
      return;
    }
    struct File {
      std::string path;
      std::time_t modified;
      uint64_t size;
    };
    std::vector<File> entries;
    uint64_t total = 0;
    const std::time_t now = std::time(nullptr);
    while (const auto *item = ::readdir(directory)) {
      const std::string name = item->d_name;
      const bool entry = endsWith(name, ".blob");
      const bool temporary = endsWith(name, ".tmp");
      if (!entry && !temporary) {
        continue;
      }
      const auto path = _directory + "/" + name;
      struct stat info;
      if (::stat(path.c_str(), &info) != 0 || !S_ISREG(info.st_mode)) {
        continue;
      }
      const auto age = std::chrono::seconds(now - info.st_mtime);
      if (temporary) {
        // A writer takes well under this; one older belongs to a process
        // that died mid-write.
        if (age > kTemporaryMaxAge) {
          ::unlink(path.c_str());
        }
        continue;
      }
      if (age > maxAge) {
        ::unlink(path.c_str());
        continue;
      }
      entries.push_back(
          {path, info.st_mtime, static_cast<uint64_t>(info.st_size)});
      total += static_cast<uint64_t>(info.st_size);
    }
    ::closedir(directory);
    if (total <= maxTotalBytes) {
      return;
    }
    std::sort(entries.begin(), entries.end(), [](const File &a, const File &b) {
      return a.modified < b.modified;
    });
    for (const auto &file : entries) {
      if (total <= maxTotalBytes) {
        break;
      }
      if (::unlink(file.path.c_str()) == 0) {
        total -= file.size;
      }
    }
  }

private:
  RNSkBlobCache() = default;

  static constexpr auto kTemporaryMaxAge = std::chrono::hours(1);
  static constexpr char kMagic[8] = {'R', 'N', 'S', 'K', 'B', 'L', 'O', 'B'};

  // The entry read last: Dawn loads each entry twice (the size, then the
  // bytes), and the second call must not read the file again. Let go of
  // with the copy.
  struct Entry {
    std::vector<uint8_t> key;
    std::vector<uint8_t> value;
    bool matches(const uint8_t *otherKey, size_t otherKeySize) const {
      return !key.empty() && key.size() == otherKeySize &&
             std::memcmp(key.data(), otherKey, otherKeySize) == 0;
    }
  };

  static bool endsWith(const std::string &name, const char *suffix) {
    const size_t length = std::strlen(suffix);
    return name.size() >= length &&
           name.compare(name.size() - length, length, suffix) == 0;
  }

  // Makes the directory and the ones leading to it, as needed. Whether it
  // exists afterwards.
  static bool makeDirectories(const std::string &directory) {
    for (size_t slash = directory.find('/', 1); slash != std::string::npos;
         slash = directory.find('/', slash + 1)) {
      ::mkdir(directory.substr(0, slash).c_str(), 0700);
    }
    ::mkdir(directory.c_str(), 0700);
    struct stat info;
    return ::stat(directory.c_str(), &info) == 0 && S_ISDIR(info.st_mode);
  }

  std::string pathFor(const uint8_t *key, size_t keySize) const {
    // FNV-1a over the key: the file carries the key itself, so the hash
    // only has to spread the names.
    uint64_t hash = 14695981039346656037ull;
    for (size_t i = 0; i < keySize; i++) {
      hash ^= key[i];
      hash *= 1099511628211ull;
    }
    char name[32];
    std::snprintf(name, sizeof(name), "%016llx.blob",
                  static_cast<unsigned long long>(hash));
    return _directory + "/" + name;
  }

  // Reads the entry for the key into _last; false when there is none, the
  // file is not an entry for this key, or it is too large to be one.
  bool read(const uint8_t *key, size_t keySize) {
    const auto path = pathFor(key, keySize);
    std::FILE *file = std::fopen(path.c_str(), "rb");
    if (file == nullptr) {
      return false;
    }
    bool ok = false;
    char magic[sizeof(kMagic)];
    uint32_t storedKeySize = 0;
    std::vector<uint8_t> storedKey;
    std::vector<uint8_t> value;
    if (std::fread(magic, 1, sizeof(magic), file) == sizeof(magic) &&
        std::memcmp(magic, kMagic, sizeof(magic)) == 0 &&
        std::fread(&storedKeySize, 1, sizeof(storedKeySize), file) ==
            sizeof(storedKeySize) &&
        storedKeySize == keySize) {
      storedKey.resize(keySize);
      if (std::fread(storedKey.data(), 1, keySize, file) == keySize &&
          std::memcmp(storedKey.data(), key, keySize) == 0) {
        const long start = std::ftell(file);
        if (start >= 0 && std::fseek(file, 0, SEEK_END) == 0) {
          const long end = std::ftell(file);
          if (end >= start &&
              static_cast<uint64_t>(end - start) <= kMaxValueSize &&
              std::fseek(file, start, SEEK_SET) == 0) {
            value.resize(static_cast<size_t>(end - start));
            ok = value.empty() || std::fread(value.data(), 1, value.size(),
                                             file) == value.size();
          }
        }
      }
    }
    std::fclose(file);
    if (!ok) {
      return false;
    }
    // In use: the entry stays (see prune).
    ::utimensat(AT_FDCWD, path.c_str(), nullptr, 0);
    _last.key = std::move(storedKey);
    _last.value = std::move(value);
    return true;
  }

  // Writes the entry to a file of its own, whole: a file is only ever seen
  // complete, by this process or the next. The temporary file is this
  // process's and this write's, so another process of the app writing the
  // same entry never publishes a partial one.
  void write(const uint8_t *key, size_t keySize, const uint8_t *value,
             size_t valueSize) {
    const auto path = pathFor(key, keySize);
    const auto temporary = path + "." + std::to_string(::getpid()) + "." +
                           std::to_string(_writes++) + ".tmp";
    std::FILE *file = std::fopen(temporary.c_str(), "wb");
    if (file == nullptr) {
      return;
    }
    const uint32_t storedKeySize = static_cast<uint32_t>(keySize);
    const bool ok =
        std::fwrite(kMagic, 1, sizeof(kMagic), file) == sizeof(kMagic) &&
        std::fwrite(&storedKeySize, 1, sizeof(storedKeySize), file) ==
            sizeof(storedKeySize) &&
        std::fwrite(key, 1, keySize, file) == keySize &&
        std::fwrite(value, 1, valueSize, file) == valueSize;
    const bool closed = std::fclose(file) == 0;
    if (!ok || !closed || ::rename(temporary.c_str(), path.c_str()) != 0) {
      ::unlink(temporary.c_str());
    }
  }

  std::mutex _mutex;
  std::string _directory;
  Entry _last;
  uint64_t _writes = 0;
};

} // namespace RNSkia
