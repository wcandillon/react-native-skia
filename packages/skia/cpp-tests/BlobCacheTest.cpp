// Host-side check of RNSkia::RNSkBlobCache (see run.sh): Dawn's two-call
// load, a miss, an entry too large to keep or to read, a damaged entry, the
// cache before a directory is set, and the prune: by age, with a load as a
// touch, by budget, and of the temporary files a dead writer left.

#include <fcntl.h>
#include <sys/stat.h>

#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <set>
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

std::set<std::string> entryFiles(const std::filesystem::path &directory) {
  std::set<std::string> files;
  for (const auto &item : std::filesystem::directory_iterator(directory)) {
    if (item.path().extension() == ".blob") {
      files.insert(item.path().string());
    }
  }
  return files;
}

// The one file the set gained since `before`.
std::string newFile(const std::set<std::string> &before,
                    const std::filesystem::path &directory) {
  for (const auto &file : entryFiles(directory)) {
    if (before.count(file) == 0) {
      return file;
    }
  }
  return {};
}

void setAge(const std::string &path, std::chrono::seconds age) {
  const std::time_t then = std::time(nullptr) - age.count();
  const timespec times[2] = {{then, 0}, {then, 0}};
  utimensat(AT_FDCWD, path.c_str(), times, 0);
}

size_t sizeOf(RNSkia::RNSkBlobCache &cache, const std::vector<uint8_t> &key) {
  return cache.load(key.data(), key.size(), nullptr, 0);
}

} // namespace

int main() {
  auto &cache = RNSkia::RNSkBlobCache::getInstance();
  const auto key = bytes("pipeline-key");
  const auto value = bytes("compiled pipeline bytes");

  expect(!cache.isEnabled(), "disabled until a directory is set");
  cache.store(key.data(), key.size(), value.data(), value.size());
  expect(sizeOf(cache, key) == 0, "nothing is kept while disabled");

  const auto directory = std::filesystem::temp_directory_path() /
                         ("rnskia-blob-cache-" + std::to_string(std::rand())) /
                         "nested";
  cache.setDirectory(directory.string());
  expect(cache.isEnabled(), "enabled once a directory is set");
  expect(std::filesystem::is_directory(directory),
         "the directory is made, with the ones leading to it");

  expect(sizeOf(cache, key) == 0, "a miss before anything is stored");

  cache.store(key.data(), key.size(), value.data(), value.size());
  expect(sizeOf(cache, key) == value.size(), "the first call gives the size");
  std::vector<uint8_t> loaded(value.size());
  expect(cache.load(key.data(), key.size(), loaded.data(), loaded.size()) ==
             value.size(),
         "the second call gives the size again");
  expect(loaded == value, "the second call copies the bytes");
  std::vector<uint8_t> small(4);
  expect(cache.load(key.data(), key.size(), small.data(), small.size()) == 0,
         "a buffer too small gets nothing");
  expect(entryFiles(directory).size() == 1, "one file per entry");
  for (const auto &item : std::filesystem::directory_iterator(directory)) {
    expect(item.path().extension() != ".tmp", "no temporary file is left");
  }

  // The entry survives a fresh look at the files: another process, in
  // effect. The last entry is forgotten by setting the directory again.
  cache.setDirectory(directory.string());
  expect(sizeOf(cache, key) == value.size(),
         "the entry is read back from its file");

  const auto otherKey = bytes("other-key");
  expect(sizeOf(cache, otherKey) == 0, "another key misses");
  const auto otherValue = bytes("x");
  cache.store(otherKey.data(), otherKey.size(), otherValue.data(),
              otherValue.size());
  expect(sizeOf(cache, otherKey) == 1,
         "a second entry is kept beside the first");
  expect(sizeOf(cache, key) == value.size(), "the first entry is still there");

  {
    // A value past the read cap is a miss, not an allocation: the file of
    // `key` gets a tail of that size.
    const auto files = entryFiles(directory);
    const auto hugeKey = bytes("huge-value");
    cache.store(hugeKey.data(), hugeKey.size(), value.data(), value.size());
    const auto path = newFile(files, directory);
    expect(!path.empty(), "the entry got a file");
    std::FILE *file = std::fopen(path.c_str(), "ab");
    const std::vector<uint8_t> tail(RNSkia::RNSkBlobCache::kMaxValueSize + 1,
                                    7);
    std::fwrite(tail.data(), 1, tail.size(), file);
    std::fclose(file);
    cache.setDirectory(directory.string());
    expect(sizeOf(cache, hugeKey) == 0, "an entry too large to read misses");
    std::filesystem::remove(path);
  }

  const std::vector<uint8_t> huge(65u * 1024u * 1024u, 7);
  const auto hugeKey = bytes("huge");
  cache.store(hugeKey.data(), hugeKey.size(), huge.data(), huge.size());
  expect(sizeOf(cache, hugeKey) == 0, "an entry too large is dropped");

  // A damaged entry reads as a miss, as a power loss can leave one (the rename
  // on disk, the data not), and a store replaces it.
  {
    const auto damagedKey = bytes("damaged");
    const std::vector<uint8_t> whole(4096, 42);
    const auto files = entryFiles(directory);
    cache.store(damagedKey.data(), damagedKey.size(), whole.data(),
                whole.size());
    const auto path = newFile(files, directory);
    expect(!path.empty(), "the damaged entry got a file");
    const auto size = std::filesystem::file_size(path);
    const auto isMiss = [&](const char *what) {
      cache.setDirectory(directory.string());
      expect(sizeOf(cache, damagedKey) == 0, what);
      cache.store(damagedKey.data(), damagedKey.size(), whole.data(),
                  whole.size());
      cache.setDirectory(directory.string());
      expect(sizeOf(cache, damagedKey) == whole.size(),
             "a store replaces a damaged entry");
    };
    const auto overwrite = [&](long offset, const char *data, size_t length) {
      std::FILE *file = std::fopen(path.c_str(), "r+b");
      std::fseek(file, offset, SEEK_SET);
      std::fwrite(data, 1, length, file);
      std::fclose(file);
    };

    cache.setDirectory(directory.string());
    expect(sizeOf(cache, damagedKey) == whole.size(), "a whole entry loads");

    std::filesystem::resize_file(path, size - 1);
    isMiss("a truncated value misses");

    std::filesystem::resize_file(path, 4);
    isMiss("a truncated header misses");

    // The size is right, the data never reached the disk.
    const std::vector<char> zeros(512, 0);
    overwrite(static_cast<long>(size - zeros.size()), zeros.data(),
              zeros.size());
    isMiss("a value zeroed at the end misses");

    const char flipped = 1;
    overwrite(static_cast<long>(size - 1), &flipped, 1);
    isMiss("a value with a wrong byte misses");

    std::filesystem::resize_file(path, size + 1);
    isMiss("bytes after the value miss");

    overwrite(0, "RNSKBLOB", 8);
    isMiss("an entry in the previous format misses");

    std::filesystem::remove(path);
  }

  // The prune by age: an entry nothing asked for in a long time goes, one
  // asked for stays, as the load touched it.
  {
    const auto staleKey = bytes("stale");
    const auto touchedKey = bytes("touched");
    auto files = entryFiles(directory);
    cache.store(staleKey.data(), staleKey.size(), value.data(), value.size());
    const auto stalePath = newFile(files, directory);
    files = entryFiles(directory);
    cache.store(touchedKey.data(), touchedKey.size(), value.data(),
                value.size());
    const auto touchedPath = newFile(files, directory);
    const auto old = RNSkia::RNSkBlobCache::kMaxAge + std::chrono::hours(24);
    setAge(stalePath, old);
    setAge(touchedPath, old);
    cache.setDirectory(directory.string());
    expect(sizeOf(cache, touchedKey) == value.size(), "the old entry loads");
    cache.prune();
    expect(sizeOf(cache, staleKey) == 0, "an entry not asked for is pruned");
    expect(sizeOf(cache, touchedKey) == value.size(),
           "an entry loaded since stays");
    expect(sizeOf(cache, key) == value.size(), "a fresh entry stays");
  }

  // The prune by budget: the oldest entries go until the rest fit.
  {
    const auto aKey = bytes("budget-a");
    const auto bKey = bytes("budget-b");
    const auto cKey = bytes("budget-c");
    const std::vector<uint8_t> payload(1000, 1);
    auto files = entryFiles(directory);
    cache.store(aKey.data(), aKey.size(), payload.data(), payload.size());
    const auto aPath = newFile(files, directory);
    files = entryFiles(directory);
    cache.store(bKey.data(), bKey.size(), payload.data(), payload.size());
    const auto bPath = newFile(files, directory);
    files = entryFiles(directory);
    cache.store(cKey.data(), cKey.size(), payload.data(), payload.size());
    setAge(aPath, std::chrono::hours(72));
    setAge(bPath, std::chrono::hours(48));
    // A budget for everything else in the directory and one of these two
    // older entries (about a kilobyte each): the oldest goes.
    uint64_t others = 0;
    for (const auto &file : entryFiles(directory)) {
      if (file != aPath && file != bPath) {
        others += std::filesystem::file_size(file);
      }
    }
    cache.prune(RNSkia::RNSkBlobCache::kMaxAge, others + 1500);
    expect(sizeOf(cache, aKey) == 0, "the oldest entry goes past the budget");
    expect(sizeOf(cache, bKey) == payload.size(),
           "the next entry stays once the rest fit");
    expect(sizeOf(cache, cKey) == payload.size(), "the newest entry stays");
  }

  // The prune of temporary files: one a dead writer left goes, a fresh one
  // may still be written.
  {
    const auto stale = (directory / "abc.blob.1.1.tmp").string();
    const auto fresh = (directory / "abc.blob.2.1.tmp").string();
    for (const auto &path : {stale, fresh}) {
      std::FILE *file = std::fopen(path.c_str(), "wb");
      std::fputs("partial", file);
      std::fclose(file);
    }
    setAge(stale, std::chrono::hours(2));
    cache.prune();
    expect(!std::filesystem::exists(stale), "a stale temporary file goes");
    expect(std::filesystem::exists(fresh), "a fresh temporary file stays");
  }

  std::error_code error;
  std::filesystem::remove_all(directory.parent_path(), error);
  if (failures == 0) {
    std::printf("BlobCacheTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "BlobCacheTest: %d failure(s)\n", failures);
  return 1;
}
