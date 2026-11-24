// Host-side check that rnwgpu::DawnBlobCache, the file shared with React
// Native WebGPU (see cpp/rnwgpu/README.md), is wired as Skia's device cache
// expects (see run.sh): it chains onto a device descriptor once a directory is
// set and not before, makes its directory, and Dawn's two-call load finds what
// a store wrote. The cache's own behaviour (its limit, the writes a killed
// process left, concurrent stores) is covered by the suite next to the
// original, packages/webgpu/tests/cpp/DawnBlobCacheTest.cpp.

#include <sys/stat.h>
#include <unistd.h>

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

#include "rnwgpu/DawnBlobCache.h"

namespace {

using rnwgpu::DawnBlobCache;
using Bytes = std::vector<uint8_t>;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

bool isDirectory(const std::string &path) {
  struct stat info{};
  return ::stat(path.c_str(), &info) == 0 && S_ISDIR(info.st_mode);
}

// The cache as Dawn sees it: the callbacks chained onto a device descriptor,
// or none when the cache declined to chain.
struct Callbacks {
  WGPUDawnLoadCacheDataCallback load = nullptr;
  WGPUDawnStoreCacheDataCallback store = nullptr;
  bool chained = false;

  size_t size(const Bytes &key) const {
    return load(key.size(), key.data(), 0, nullptr, nullptr, nullptr);
  }

  Bytes read(const Bytes &key) const {
    Bytes value(size(key));
    if (value.empty()) {
      return value;
    }
    const size_t read = load(key.size(), key.data(), value.size(), value.data(),
                             nullptr, nullptr);
    value.resize(read);
    return value;
  }

  void write(const Bytes &key, const Bytes &value) const {
    store(key.size(), key.data(), value.size(), value.data(), nullptr, nullptr);
    DawnBlobCache::waitForWrites();
  }
};

Callbacks chain() {
  wgpu::DeviceDescriptor descriptor;
  WGPUDawnCacheDeviceDescriptor storage =
      WGPU_DAWN_CACHE_DEVICE_DESCRIPTOR_INIT;
  Callbacks callbacks;
  callbacks.chained = DawnBlobCache::chain(descriptor, storage);
  callbacks.load = storage.dawnLoadCacheDataCallbackInfo.callback;
  callbacks.store = storage.dawnStoreCacheDataCallbackInfo.callback;
  return callbacks;
}

} // namespace

int main() {
  const char *tmp = std::getenv("TMPDIR");
  std::string root = std::string(tmp != nullptr ? tmp : "/tmp") +
                     "/rnskia-dawn-blob-cache-XXXXXX";
  if (::mkdtemp(root.data()) == nullptr) {
    std::fprintf(stderr, "DawnBlobCacheTest: no temporary directory\n");
    return 1;
  }
  const std::string directory = root + "/rnskia/webgpu-dawn";

  // Without a directory nothing is chained: Dawn then caches in memory only.
  {
    DawnBlobCache::setDirectory("");
    expect(!chain().chained, "chains nothing without a directory");
  }

  // The directory is made with its parents, as the platform's cache
  // directory may be cleared under the app.
  DawnBlobCache::setDirectory(directory);
  DawnBlobCache::waitForWrites();
  expect(isDirectory(directory), "makes its directory");

  // Dawn asks for the size, then for the bytes.
  {
    const Callbacks cache = chain();
    expect(cache.chained, "chains once a directory is set");
    const Bytes key{1, 2, 3};
    const Bytes value{0, 255, 7, 0, 42};
    expect(cache.size(key) == 0, "misses a key never stored");
    cache.write(key, value);
    expect(cache.size(key) == value.size(), "the size of what was stored");
    expect(cache.read(key) == value, "the bytes that were stored");
  }

  // What one process wrote, the next one finds: the directory is set again.
  {
    DawnBlobCache::setDirectory(directory);
    DawnBlobCache::waitForWrites();
    expect(chain().read({1, 2, 3}) == (Bytes{0, 255, 7, 0, 42}),
           "keeps the entries across a second setup");
  }

  DawnBlobCache::setDirectory("");
  DawnBlobCache::waitForWrites();
  std::string command = "rm -rf '" + root + "'";
  (void)std::system(command.c_str());

  if (failures == 0) {
    std::printf("DawnBlobCacheTest: passed\n");
    return 0;
  }
  std::fprintf(stderr, "DawnBlobCacheTest: %d failure(s)\n", failures);
  return 1;
}
