// Host-side check of RNSkia::RNSkPresentedImageLedger, the bookkeeping
// RNSkPresentedImages does under its lock (see run.sh).

#include <cstdint>
#include <cstdio>
#include <optional>
#include <vector>

#include "rnskia/RNSkPresentedImageLedger.h"

namespace {

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Two runtimes, or two static canvases: retains are counted per owner.
const int firstOwnerObject = 0;
const int secondOwnerObject = 0;
const void *const firstOwner = &firstOwnerObject;
const void *const secondOwner = &secondOwnerObject;

constexpr uint32_t image = 7;
constexpr uint32_t otherImage = 8;

void oneImageInManyViewsIsReadBackOnce() {
  RNSkia::RNSkPresentedImageLedger ledger;
  int readbacks = 0;
  for (int view = 0; view < 120; view++) {
    if (ledger.retain(view % 2 == 0 ? firstOwner : secondOwner, image)
            .has_value()) {
      readbacks++;
    }
  }
  expect(readbacks == 1,
         "120 views of one image ask for one readback, the first retain's");
}

void onlyTheLastReleaseDiscards() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  ledger.retain(firstOwner, image);
  ledger.retain(secondOwner, image);
  expect(!ledger.release(firstOwner, image),
         "a release with retains left keeps the image");
  expect(!ledger.release(secondOwner, image),
         "a release with retains left keeps the image");
  expect(ledger.isCurrent(image, *generation),
         "an image with a retain left is still presented");
  expect(ledger.release(firstOwner, image),
         "the last release discards the image");
  expect(!ledger.isCurrent(image, *generation),
         "a discarded image presents nothing");
}

void aReleaseOvertakesItsReadback() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  ledger.release(firstOwner, image);
  expect(!ledger.isCurrent(image, *generation),
         "a readback completing after its image was released presents "
         "nothing");
}

void anImageRetainedAgainIsReadBackAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto first = ledger.retain(firstOwner, image);
  ledger.release(firstOwner, image);
  auto second = ledger.retain(firstOwner, image);
  expect(second.has_value() && *second > *first,
         "a retain from zero asks for a readback under a newer generation");
  expect(!ledger.isCurrent(image, *first),
         "the readback of the earlier retain presents nothing");
  expect(ledger.isCurrent(image, *second),
         "the readback of the current retain presents");
}

void anOwnerGivesBackItsRetainsAndNoOthers() {
  RNSkia::RNSkPresentedImageLedger ledger;
  ledger.retain(firstOwner, image);
  ledger.retain(firstOwner, image);
  auto shared = ledger.retain(firstOwner, otherImage);
  ledger.retain(secondOwner, otherImage);
  auto released = ledger.releaseAll(firstOwner);
  expect(released == std::vector<uint32_t>{image},
         "an owner going away discards the images only it retained");
  expect(ledger.isCurrent(otherImage, *shared),
         "an image another owner retains stays presented");
  expect(ledger.releaseAll(firstOwner).empty(),
         "an owner going away twice discards nothing the second time");
  expect(ledger.release(secondOwner, otherImage),
         "the other owner's last release discards the image");
}

void aReleaseWithoutARetainChangesNothing() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  expect(!ledger.release(secondOwner, image),
         "a release by an owner holding no retain discards nothing");
  expect(!ledger.release(firstOwner, otherImage),
         "a release of an image never retained discards nothing");
  expect(ledger.isCurrent(image, *generation),
         "the retained image is still presented");
}

} // namespace

int main() {
  oneImageInManyViewsIsReadBackOnce();
  onlyTheLastReleaseDiscards();
  aReleaseOvertakesItsReadback();
  anImageRetainedAgainIsReadBackAgain();
  anOwnerGivesBackItsRetainsAndNoOthers();
  aReleaseWithoutARetainChangesNothing();
  if (failures > 0) {
    return 1;
  }
  std::printf("PresentedImageLedgerTest: passed\n");
  return 0;
}
