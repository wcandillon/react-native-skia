// Host-side check of RNSkia::ImageProvider, built against the Skia headers
// only (see run.sh). The Skia symbols the header references but this check
// never reaches are stubbed below. No texture can be made without Skia: the
// checks cover the misses, the failed uploads and the uploads in flight.

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <thread>

#include "include/private/SkLog.h"
#include "rnskia/RNImageProvider.h"

void SkLog(SkLogPriority, const char[], ...) {}
void sk_abort_no_print() { std::abort(); }
void SkTiledImageUtils::GetImageKeyValues(const SkImage *image,
                                          uint32_t *values) {
  // The stand-in images are told apart by their address.
  std::memset(values, 0,
              sizeof(uint32_t) * SkTiledImageUtils::kNumImageKeyValues);
  values[0] = static_cast<uint32_t>(reinterpret_cast<uintptr_t>(image));
}

static int fail(const char *message) {
  std::fprintf(stderr, "FAIL: %s\n", message);
  return 1;
}

int main() {
  using RNSkia::ImageProvider;
  int uploads = 0;
  // An uploader that always fails, on the device of generation 1.
  auto failing = [&uploads](const SkImage *, bool) {
    uploads++;
    return ImageProvider::Upload{nullptr, 1};
  };
  // The recorder that receives the provider must be its only owner: a
  // second reference would keep the provider alive after the recorder is
  // gone.
  auto provider = ImageProvider::Make(failing, 1);
  if (!provider->unique()) {
    return fail("ImageProvider::Make() returns a provider with more than one "
                "reference");
  }
  // The cache is shared by every provider, and starts empty.
  if (ImageProvider::count() != 0 || ImageProvider::bytesUsed() != 0) {
    return fail("the shared cache is not empty at start");
  }
  // A miss uploads through the uploader. A failed upload leaves no entry.
  int first = 0;
  const auto *image = reinterpret_cast<const SkImage *>(&first);
  if (provider->findOrCreate(nullptr, image, {false}) != nullptr ||
      uploads != 1) {
    return fail("a miss does not upload through the uploader");
  }
  if (ImageProvider::count() != 0) {
    return fail("a failed upload left an entry in the cache");
  }
  // The failure is remembered: the next draws do not upload again for a
  // moment (kFailureRetryDelay).
  if (provider->findOrCreate(nullptr, image, {false}) != nullptr ||
      uploads != 1) {
    return fail("a failed upload is tried again right away");
  }
  // A draw with mipmaps is another upload, remembered on its own.
  if (provider->findOrCreate(nullptr, image, {true}) != nullptr ||
      uploads != 2) {
    return fail("a draw with mipmaps does not upload on its own");
  }
  if (provider->findOrCreate(nullptr, image, {true}) != nullptr ||
      uploads != 2) {
    return fail("a failed mipmapped upload is tried again right away");
  }
  // Another image is not held back by it.
  int second = 0;
  const auto *other = reinterpret_cast<const SkImage *>(&second);
  if (provider->findOrCreate(nullptr, other, {false}) != nullptr ||
      uploads != 3) {
    return fail("a failure holds back the upload of another image");
  }
  // A replaced device gets a fresh attempt right away.
  auto next = ImageProvider::Make(
      [&uploads](const SkImage *, bool) {
        uploads++;
        return ImageProvider::Upload{nullptr, 2};
      },
      2);
  if (next->findOrCreate(nullptr, image, {false}) != nullptr || uploads != 4) {
    return fail("a provider of a new device does not upload again");
  }
  // An uploader that throws counts as a failed upload, and hands the claim
  // back: the next provider of a new device uploads again.
  auto throwing = ImageProvider::Make(
      [&uploads](const SkImage *, bool) -> ImageProvider::Upload {
        uploads++;
        throw std::runtime_error("no recorder");
      },
      3);
  if (throwing->findOrCreate(nullptr, image, {false}) != nullptr ||
      uploads != 5) {
    return fail("an uploader that throws is not a failed upload");
  }
  auto after = ImageProvider::Make(
      [&uploads](const SkImage *, bool) {
        uploads++;
        return ImageProvider::Upload{nullptr, 4};
      },
      4);
  if (after->findOrCreate(nullptr, image, {false}) != nullptr || uploads != 6) {
    return fail("an uploader that threw kept the claim on the image");
  }
  // One upload at a time per image: a thread drawing an image another
  // thread is uploading waits for that upload rather than uploading too,
  // and sees its outcome (here the failure).
  std::mutex mutex;
  std::condition_variable condition;
  bool entered = false;
  bool release = false;
  std::atomic<int> slowUploads{0};
  auto slow = ImageProvider::Make(
      [&](const SkImage *, bool) {
        slowUploads++;
        std::unique_lock<std::mutex> lock(mutex);
        entered = true;
        condition.notify_all();
        condition.wait(lock, [&]() { return release; });
        return ImageProvider::Upload{nullptr, 5};
      },
      5);
  int third = 0;
  const auto *shared = reinterpret_cast<const SkImage *>(&third);
  std::thread uploader([&]() { slow->findOrCreate(nullptr, shared, {false}); });
  {
    std::unique_lock<std::mutex> lock(mutex);
    condition.wait(lock, [&]() { return entered; });
  }
  std::atomic<bool> waiterDone{false};
  std::thread waiter([&]() {
    slow->findOrCreate(nullptr, shared, {false});
    waiterDone = true;
  });
  std::this_thread::sleep_for(std::chrono::milliseconds(100));
  if (waiterDone || slowUploads != 1) {
    return fail("a second thread does not wait for the upload in flight");
  }
  {
    std::lock_guard<std::mutex> lock(mutex);
    release = true;
  }
  condition.notify_all();
  uploader.join();
  waiter.join();
  if (slowUploads != 1) {
    return fail("the waiting thread uploaded the image a second time");
  }
  if (ImageProvider::count() != 0 || ImageProvider::bytesUsed() != 0) {
    return fail("failed uploads left entries in the cache");
  }
  // The release listener asks the recorders to free the textures the cache
  // let go of: a failed upload, or clearing an empty cache, lets go of none.
  std::atomic<int> releases{0};
  ImageProvider::setReleaseListener([&releases]() { releases++; });
  int fourth = 0;
  const auto *unseen = reinterpret_cast<const SkImage *>(&fourth);
  if (after->findOrCreate(nullptr, unseen, {false}) != nullptr ||
      uploads != 7) {
    return fail("a miss does not upload through the uploader");
  }
  ImageProvider::invalidateAll();
  if (releases != 0) {
    return fail("the release listener was told of a release that did not "
                "happen");
  }
  ImageProvider::setReleaseListener(nullptr);
  std::printf("ImageProviderTest: passed\n");
  return 0;
}
