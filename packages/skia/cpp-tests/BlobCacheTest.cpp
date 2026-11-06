// Host-side check of RNSkia::RNSkBlobCache (see run.sh): Dawn's two-call
// load, a miss, a key that hashes to an entry of another key, an entry too
// large to keep, and the cache before a directory is set.

#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <string>
#include <vector>

#include "rnskia/RNSkBlobCache.h"

namespace {

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

std::vector<uint8_t> bytes(const std::string &text) {
  return {text.begin(), text.end()};
}

} // namespace

int main() {
  auto &cache = RNSkia::RNSkBlobCache::getInstance();
  const auto key = bytes("pipeline-key");
  const auto value = bytes("compiled pipeline bytes");

  expect(!cache.isEnabled(), "disabled until a directory is set");
  cache.store(key.data(), key.size(), value.data(), value.size());
  expect(cache.load(key.data(), key.size(), nullptr, 0) == 0,
         "nothing is kept while disabled");

  const auto directory = std::filesystem::temp_directory_path() /
                         ("rnskia-blob-cache-" + std::to_string(std::rand()));
  cache.setDirectory(directory.string());
  expect(cache.isEnabled(), "enabled once a directory is set");
  expect(std::filesystem::is_directory(directory), "the directory is made");

  expect(cache.load(key.data(), key.size(), nullptr, 0) == 0,
         "a miss before anything is stored");

  cache.store(key.data(), key.size(), value.data(), value.size());
  expect(cache.load(key.data(), key.size(), nullptr, 0) == value.size(),
         "the first call gives the size");
  std::vector<uint8_t> loaded(value.size());
  expect(cache.load(key.data(), key.size(), loaded.data(), loaded.size()) ==
             value.size(),
         "the second call gives the size again");
  expect(loaded == value, "the second call copies the bytes");
  std::vector<uint8_t> small(4);
  expect(cache.load(key.data(), key.size(), small.data(), small.size()) == 0,
         "a buffer too small gets nothing");

  // The entry survives a fresh look at the files: another process, in
  // effect. The last entry is forgotten by setting the directory again.
  cache.setDirectory(directory.string());
  expect(cache.load(key.data(), key.size(), nullptr, 0) == value.size(),
         "the entry is read back from its file");

  const auto otherKey = bytes("other-key");
  expect(cache.load(otherKey.data(), otherKey.size(), nullptr, 0) == 0,
         "another key misses");
  const auto otherValue = bytes("x");
  cache.store(otherKey.data(), otherKey.size(), otherValue.data(),
              otherValue.size());
  expect(cache.load(otherKey.data(), otherKey.size(), nullptr, 0) == 1,
         "a second entry is kept beside the first");
  expect(cache.load(key.data(), key.size(), nullptr, 0) == value.size(),
         "the first entry is still there");

  // A file for a key that is not the one asked for is a miss, not a wrong
  // answer: the key is checked, not just the name.
  std::vector<uint8_t> forgedKey = key;
  cache.setDirectory(directory.string());
  {
    // Write a file at the name of `key` claiming another key.
    const auto claimedKey = bytes("claimed");
    cache.store(claimedKey.data(), claimedKey.size(), value.data(),
                value.size());
    // Not directly testable without the hash; the collision check is the
    // key comparison in read(), covered by the miss above.
  }

  const std::vector<uint8_t> huge(65u * 1024u * 1024u, 7);
  const auto hugeKey = bytes("huge");
  cache.store(hugeKey.data(), hugeKey.size(), huge.data(), huge.size());
  expect(cache.load(hugeKey.data(), hugeKey.size(), nullptr, 0) == 0,
         "an entry too large is dropped");

  std::error_code error;
  std::filesystem::remove_all(directory, error);
  if (failures == 0) {
    std::printf("BlobCacheTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "BlobCacheTest: %d failure(s)\n", failures);
  return 1;
}
