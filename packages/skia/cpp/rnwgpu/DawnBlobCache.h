#pragma once

#include <cstdint>
#include <functional>
#include <string>

#include "webgpu/webgpu_cpp.h"

namespace rnwgpu {

// Dawn's blob cache, kept on disk so what a device produces while building
// shaders and pipelines (Vulkan pipeline data, translated MSL) survives a
// relaunch. Dawn only reuses those blobs across launches when the embedder
// gives it storage: load and store callbacks on the device descriptor, or a
// caching interface on the platform the instance was created with (how Chrome
// does it). The instance can be React Native Skia's, so the callbacks go on
// each device. Without them every launch builds every pipeline from scratch,
// and on Vulkan drivers that can take a noticeable time per pipeline.
//
// Each platform's module points the cache at the app's cache directory when it
// installs, and requestDevice() chains it onto every device it creates. A
// device requested with the `disable_blob_cache` Dawn toggle does not use it.
//
// Loads read the file on the calling thread, since Dawn needs the bytes
// before it goes on. Stores copy the bytes and return: a thread of the cache's
// own writes them, so neither the thread Dawn compiles on (a JS thread
// included) nor a device lock Dawn holds while it stores waits for the disk.
//
// The cache is best effort. By default Dawn checks a hash of every blob it
// loads, and an entry that is torn, truncated or for another key reads as a
// miss. Entries are replaced whole, so the writer that finishes last wins:
// devices or processes that share a key (Dawn's monolithic Vulkan pipeline
// cache has one per device) can replace a fuller blob with a smaller one,
// which only costs the pipelines in it being built again.
class DawnBlobCache {
public:
  // The directory to keep the blobs in, created (with its parents) if
  // missing. Each platform's module calls this when it installs. The cache is
  // then tidied on its own thread: abandoned writes are removed, and when the
  // entries together are past the limit (about 64 MB) all of them are, so that
  // a cache full of what the app no longer uses starts over, at the price of
  // one launch that builds everything. A session whose stores would take the
  // cache past the limit drops them (replacing an entry with one no larger is
  // never dropped), and an entry larger than half the limit is not stored.
  // Only the cache's own files are ever removed. An empty path, or one where
  // no directory can be made, leaves the cache off.
  static void setDirectory(const std::string &directory);

  // Chains the cache onto `descriptor`, in front of whatever it already
  // chains, and returns true. `storage` holds the chained struct and must
  // outlive the RequestDevice call that reads it. Does nothing, and returns
  // false, without a directory.
  static bool chain(wgpu::DeviceDescriptor &descriptor,
                    WGPUDawnCacheDeviceDescriptor &storage);

  // Runs `job` on the cache's thread, after the jobs queued so far (the
  // tidying, the stores), or not at all when no thread can be had. GPUDevice
  // has Dawn write a device's pipeline cache there (flushPipelineCacheIfDue),
  // so that the thread submitting a frame does not wait while Dawn serializes
  // it.
  static void post(std::function<void()> job);

  // How many stores asked for on the calling thread the cache has refused
  // because the entry was too large (see setDirectory). Dawn stores on the
  // thread that has it write, so a flush (GPUDevice::flushPipelineCache) that
  // sees this grow learns that the device's pipeline cache has outgrown what
  // the cache keeps, and stops having Dawn serialize it.
  static uint64_t refusedStoresOnThisThread();

  // Blocks until the cache's thread has done everything asked of it so far:
  // the tidying of setDirectory(), the stores and the posted jobs. Nothing in
  // an app needs to wait for a write; tests do.
  static void waitForWrites();
};

} // namespace rnwgpu
