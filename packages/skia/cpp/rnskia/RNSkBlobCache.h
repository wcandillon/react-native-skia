#pragma once

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <filesystem>
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
 * carries so that a hash collision reads as a miss. Dawn's keys carry its
 * own version and the adapter's identity, so a stale entry is never asked
 * for. Any thread: Dawn loads and stores from whichever thread creates a
 * pipeline, the warmup thread included; the calls are serialized here.
 */
class RNSkBlobCache {
public:
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
    std::error_code error;
    std::filesystem::create_directories(directory, error);
    _directory = error ? std::string() : directory;
    _last.key.clear();
    _last.value.clear();
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
   is too small for it.
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

private:
  RNSkBlobCache() = default;

  // Vulkan pipeline caches run to a few megabytes; anything beyond this is
  // not a cache entry.
  static constexpr size_t kMaxValueSize = 64u * 1024u * 1024u;
  static constexpr char kMagic[8] = {'R', 'N', 'S', 'K', 'B', 'L', 'O', 'B'};

  // The entry read or written last: Dawn loads each entry twice (the size,
  // then the bytes), and the second call must not read the file again.
  struct Entry {
    std::vector<uint8_t> key;
    std::vector<uint8_t> value;
    bool matches(const uint8_t *otherKey, size_t otherKeySize) const {
      return !key.empty() && key.size() == otherKeySize &&
             std::memcmp(key.data(), otherKey, otherKeySize) == 0;
    }
  };

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

  // Reads the entry for the key into _last; false when there is none, or
  // the file is not an entry for this key.
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
          if (end >= start && std::fseek(file, start, SEEK_SET) == 0) {
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
    _last.key = std::move(storedKey);
    _last.value = std::move(value);
    return true;
  }

  // Writes the entry to a file of its own, whole: a file is only ever seen
  // complete, by this process or the next.
  void write(const uint8_t *key, size_t keySize, const uint8_t *value,
             size_t valueSize) {
    const auto path = pathFor(key, keySize);
    const auto temporary = path + ".tmp";
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
    std::error_code error;
    if (!ok || !closed) {
      std::filesystem::remove(temporary, error);
      return;
    }
    std::filesystem::rename(temporary, path, error);
    if (error) {
      std::filesystem::remove(temporary, error);
      return;
    }
    _last.key.assign(key, key + keySize);
    _last.value.assign(value, value + valueSize);
  }

  std::mutex _mutex;
  std::string _directory;
  Entry _last;
};

} // namespace RNSkia
