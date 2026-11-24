#pragma once

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>
#include <unistd.h>
#include <unordered_set>
#include <vector>

namespace RNSkia {

/**
 * The record of the GPU pipelines the app used, as Graphite serializes
 * them (see ContextOptions::fPipelineCachingCallback): what the next launch
 * compiles ahead of its frames (see RNSkPipelineWarmup). Keys only, as
 * bytes: nothing here depends on Skia, so that the file format and the
 * bound are checked on the host (see cpp-tests). The record keeps the keys
 * in the order they were first used, each once, and at most kMaxKeys of
 * them, the most recent: Graphite's pipeline cache is bounded too, and a
 * launch that compiled more than a screen's worth would only evict them.
 *
 * The file is written whole into a temporary next to it and moved into
 * place, so that a launch reads the whole record or the previous one; one
 * it cannot read (another format, a truncated write) is an empty record.
 */
class RNSkPipelineRecord {
public:
  using Key = std::vector<uint8_t>;

  static constexpr size_t kMaxKeys = 256;
  static constexpr const char *kFileName = "pipelines.bin";

  /** Adds a key, once; past kMaxKeys the oldest goes. Whether it was new. */
  bool add(Key key) {
    if (key.empty()) {
      return false;
    }
    if (!_seen.insert(std::string(key.begin(), key.end())).second) {
      return false;
    }
    _keys.push_back(std::move(key));
    if (_keys.size() > kMaxKeys) {
      const auto &oldest = _keys.front();
      _seen.erase(std::string(oldest.begin(), oldest.end()));
      _keys.erase(_keys.begin());
    }
    return true;
  }

  const std::vector<Key> &keys() const { return _keys; }

  size_t size() const { return _keys.size(); }

  bool empty() const { return _keys.empty(); }

  /**
   Whether Graphite can compile `key` on a context that has not drawn with
   it, as the warmup asks it to (see RNSkPipelineWarmup). Graphite reads a
   key against the shader code dictionary of the context, which knows the
   paint's code snippets by ID: the built-in snippets from the start, a
   runtime effect only once a draw registered it. On any other context, a
   key naming one of Skia's own effects (the blurs, the morphologies, the
   luma color filter, ...) finds its snippet uninitialized (Skia's
   TODO(b/238759147) in ShaderCodeDictionary::getEntry): an effect with
   children fails to read, one without reads and then crashes the compile
   on its null name. Such a key is left out of the record, as is a key in a
   layout this does not know (another version of Graphite's format), whose
   snippets cannot be told.

   The layout (see src/gpu/graphite/SerializationUtils.cpp): "skiapipe",
   the format version, the render step, the count of the paint key's 32-bit
   words and the words, then the render pass. The words are snippet IDs
   and, after some snippets, embedded sampler data. The IDs below 500 are
   the built-in snippets, from 500 on the runtime effects (see
   src/core/SkKnownRuntimeEffects.h). The data words are read as IDs too:
   a key with one at 500 or above is left out for nothing, which is rare
   and costs a precompile.
   */
  static bool isPortable(const Key &key) {
    static constexpr char kGraphiteMagic[8] = {'s', 'k', 'i', 'a',
                                               'p', 'i', 'p', 'e'};
    static constexpr uint32_t kGraphiteVersion = 3;
    static constexpr int32_t kFirstRuntimeEffectId = 500;
    static constexpr size_t kHeaderSize =
        sizeof(kGraphiteMagic) + 3 * sizeof(uint32_t);
    if (key.size() < kHeaderSize ||
        std::memcmp(key.data(), kGraphiteMagic, sizeof(kGraphiteMagic)) != 0) {
      return false;
    }
    uint32_t version = 0;
    uint32_t wordCount = 0;
    std::memcpy(&version, key.data() + sizeof(kGraphiteMagic), sizeof(version));
    std::memcpy(&wordCount, key.data() + kHeaderSize - sizeof(wordCount),
                sizeof(wordCount));
    if (version != kGraphiteVersion ||
        wordCount > (key.size() - kHeaderSize) / sizeof(int32_t)) {
      return false;
    }
    for (uint32_t i = 0; i < wordCount; i++) {
      int32_t word = 0;
      std::memcpy(&word, key.data() + kHeaderSize + i * sizeof(int32_t),
                  sizeof(word));
      if (word >= kFirstRuntimeEffectId) {
        return false;
      }
    }
    return true;
  }

  /** The path of the record in `directory`. */
  static std::string pathIn(const std::string &directory) {
    return directory + "/" + kFileName;
  }

  /**
   The keys of the record at `path`, in order: none for a file that is
   missing or not a record (another format, a truncated write).
   */
  static std::vector<Key> load(const std::string &path) {
    std::vector<Key> keys;
    std::FILE *file = std::fopen(path.c_str(), "rb");
    if (file == nullptr) {
      return keys;
    }
    char magic[sizeof(kMagic)];
    uint32_t version = 0;
    uint32_t count = 0;
    if (std::fread(magic, 1, sizeof(magic), file) != sizeof(magic) ||
        std::memcmp(magic, kMagic, sizeof(magic)) != 0 ||
        !readU32(file, &version) || version != kVersion ||
        !readU32(file, &count)) {
      std::fclose(file);
      return keys;
    }
    for (uint32_t i = 0; i < count && i < kMaxKeys; i++) {
      uint32_t length = 0;
      if (!readU32(file, &length) || length == 0 || length > kMaxKeySize) {
        break;
      }
      Key key(length);
      if (std::fread(key.data(), 1, length, file) != length) {
        break;
      }
      keys.push_back(std::move(key));
    }
    std::fclose(file);
    return keys;
  }

  /**
   Writes the keys as the record at `path`, whole: into a temporary file of
   this process's, moved into place once complete. Whether it was written.
   */
  static bool write(const std::string &path, const std::vector<Key> &keys) {
    const std::string temporary =
        path + ".tmp" + std::to_string(static_cast<long>(getpid()));
    std::FILE *file = std::fopen(temporary.c_str(), "wb");
    if (file == nullptr) {
      return false;
    }
    bool ok = std::fwrite(kMagic, 1, sizeof(kMagic), file) == sizeof(kMagic) &&
              writeU32(file, kVersion) &&
              writeU32(file, static_cast<uint32_t>(keys.size()));
    for (const auto &key : keys) {
      ok = ok && writeU32(file, static_cast<uint32_t>(key.size())) &&
           std::fwrite(key.data(), 1, key.size(), file) == key.size();
    }
    ok = std::fclose(file) == 0 && ok;
    if (!ok || std::rename(temporary.c_str(), path.c_str()) != 0) {
      std::remove(temporary.c_str());
      return false;
    }
    return true;
  }

private:
  static constexpr char kMagic[8] = {'R', 'N', 'S', 'K', 'P', 'I', 'P', 'E'};
  static constexpr uint32_t kVersion = 1;
  // A serialized pipeline key is a few hundred bytes.
  static constexpr uint32_t kMaxKeySize = 64u * 1024u;

  static bool readU32(std::FILE *file, uint32_t *value) {
    return std::fread(value, 1, sizeof(*value), file) == sizeof(*value);
  }

  static bool writeU32(std::FILE *file, uint32_t value) {
    return std::fwrite(&value, 1, sizeof(value), file) == sizeof(value);
  }

  std::vector<Key> _keys;
  std::unordered_set<std::string> _seen;
};

} // namespace RNSkia
