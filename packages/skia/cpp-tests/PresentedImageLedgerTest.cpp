// Host-side check of RNSkia::RNSkPresentedImageLedger, the bookkeeping
// RNSkPresentedImages does under its lock (see run.sh).

#include <cstdint>
#include <cstdio>
#include <optional>
#include <vector>

#include "rnskia/RNSkPresentedImageLedger.h"

namespace {

using Abandon = RNSkia::RNSkPresentedImageLedger::Abandon;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

// Two runtimes: retains are counted per owner.
const int firstOwnerObject = 0;
const int secondOwnerObject = 0;
const void *const firstOwner = &firstOwnerObject;
const void *const secondOwner = &secondOwnerObject;

constexpr uint32_t image = 7;
constexpr uint32_t otherImage = 8;

void oneImageInManyViewsIsDrawnOnce() {
  RNSkia::RNSkPresentedImageLedger ledger;
  int drawings = 0;
  for (int view = 0; view < 120; view++) {
    if (ledger.retain(view % 2 == 0 ? firstOwner : secondOwner, image)
            .has_value()) {
      drawings++;
    }
  }
  expect(drawings == 1,
         "120 views of one image ask for one drawing, the first retain's");
}

void onlyTheLastReleaseDiscards() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  expect(!ledger.retain(firstOwner, image).has_value(),
         "a later retain by the same owner only counts");
  expect(!ledger.retain(secondOwner, image).has_value(),
         "a later retain by another owner only counts");
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

void aReleaseOvertakesItsDrawing() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  expect(ledger.release(firstOwner, image),
         "the release of an image's only retain discards it");
  expect(!ledger.isCurrent(image, *generation),
         "a drawing completing after its image was released presents "
         "nothing");
}

void anImageRetainedAgainIsDrawnAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto first = ledger.retain(firstOwner, image);
  expect(ledger.release(firstOwner, image),
         "the release of an image's only retain discards it");
  auto second = ledger.retain(firstOwner, image);
  expect(second.has_value() && *second > *first,
         "a retain from zero asks for a drawing under a newer generation");
  expect(!ledger.isCurrent(image, *first),
         "the drawing of the earlier retain presents nothing");
  expect(ledger.isCurrent(image, *second),
         "the drawing of the current retain presents");
}

void anOwnerGivesBackItsRetainsAndNoOthers() {
  RNSkia::RNSkPresentedImageLedger ledger;
  expect(ledger.retain(firstOwner, image).has_value(),
         "the first retain of an image asks for its drawing");
  expect(!ledger.retain(firstOwner, image).has_value(),
         "a second retain by the same owner only counts");
  auto shared = ledger.retain(firstOwner, otherImage);
  expect(!ledger.retain(secondOwner, otherImage).has_value(),
         "another owner's retain of a held image only counts");
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

void aFailedDrawingIsDrawnAgainByTheNextRetain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto failed = ledger.retain(firstOwner, image);
  expect(ledger.fail(image, *failed),
         "a failure of the current drawing tells the image's views");
  auto retried = ledger.retain(secondOwner, image);
  expect(retried.has_value() && *retried > *failed,
         "the retain after a failed drawing asks for one under a newer "
         "generation");
  expect(!ledger.isCurrent(image, *failed),
         "the failed drawing's generation is no longer current");
  expect(!ledger.retain(firstOwner, image).has_value(),
         "the retain after the retried one only counts");
}

void aFailureOfAnEarlierRetainChangesNothing() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto earlier = ledger.retain(firstOwner, image);
  expect(ledger.release(firstOwner, image),
         "the release of an image's only retain discards it");
  auto current = ledger.retain(firstOwner, image);
  expect(!ledger.fail(image, *earlier),
         "a failure under an earlier generation tells no view");
  expect(!ledger.retain(secondOwner, image).has_value(),
         "a failure under an earlier generation asks for no drawing");
  expect(ledger.isCurrent(image, *current),
         "the current drawing stays current");
}

void aFailureOfAReleasedImageChangesNothing() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto generation = ledger.retain(firstOwner, image);
  expect(ledger.release(firstOwner, image),
         "the release of an image's only retain discards it");
  expect(!ledger.fail(image, *generation),
         "a failure of a released image tells no view");
  expect(!ledger.fail(otherImage, *generation),
         "a failure of an image never retained tells no view");
  auto again = ledger.retain(firstOwner, image);
  expect(again.has_value() && *again > *generation,
         "a released image retained again is drawn from zero");
  expect(!ledger.retain(secondOwner, image).has_value(),
         "the retain after it only counts");
}

// RNSkPresentedImages draws a failed CPU image again once a lost GPU device is
// replaced.
void aFailedDrawingIsDrawnAgainWithNoRetain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto failed = ledger.retain(firstOwner, image);
  expect(ledger.fail(image, *failed),
         "a failure of the current drawing tells the image's views");
  auto again = ledger.drawAgain(image);
  expect(again.has_value() && *again > *failed,
         "a failed drawing drawn again asks for one under a newer generation");
  expect(ledger.isCurrent(image, *again) && !ledger.isCurrent(image, *failed),
         "the drawing again is current, the failed one no longer");
  expect(!ledger.retain(secondOwner, image).has_value(),
         "a retain while the image is drawn again only counts");
  expect(!ledger.drawAgain(image).has_value(),
         "an image drawn again is not drawn again until it fails");
}

void anImageWhoseDrawingDidNotFailIsNotDrawnAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto drawing = ledger.retain(firstOwner, image);
  expect(!ledger.drawAgain(image).has_value(),
         "an image being drawn is not drawn again");
  expect(ledger.isCurrent(image, *drawing), "its drawing stays current");
  expect(!ledger.drawAgain(otherImage).has_value(),
         "an image never retained is not drawn");
}

void aReleasedFailedImageIsNotDrawnAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto failed = ledger.retain(firstOwner, image);
  expect(ledger.fail(image, *failed),
         "a failure of the current drawing tells the image's views");
  expect(ledger.release(firstOwner, image),
         "the release of an image's only retain discards it");
  expect(!ledger.drawAgain(image).has_value(),
         "a failed image released since is not drawn again");
}

void aDrawingAgainThatFailsIsDrawnAgainOnceMore() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto failed = ledger.retain(firstOwner, image);
  expect(ledger.fail(image, *failed),
         "a failure of the current drawing tells the image's views");
  auto again = ledger.drawAgain(image);
  expect(ledger.fail(image, *again),
         "a failure of the drawing again tells the image's views");
  auto once = ledger.drawAgain(image);
  expect(once.has_value() && *once > *again,
         "an image whose drawing again failed is drawn again once more");
}

void theSameScriptGivesTheSameGenerations() {
  auto script = []() {
    RNSkia::RNSkPresentedImageLedger ledger;
    std::vector<std::optional<uint64_t>> generations;
    auto first = ledger.retain(firstOwner, image);
    generations.push_back(first);
    generations.push_back(ledger.retain(secondOwner, otherImage));
    expect(ledger.fail(image, *first), "the scripted failure counts");
    generations.push_back(ledger.drawAgain(image));
    generations.push_back(ledger.retain(secondOwner, image));
    return generations;
  };
  expect(script() == script(),
         "the same retains, failures and drawings again answer the same "
         "generations");
}

// RNSkPresentedImages::retain abandons a retain whose drawing could not be
// requested.
void aFailedImageWhoseRetriedDrawingWasNeverRequestedIsDrawnAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto failed = ledger.retain(firstOwner, image);
  expect(ledger.fail(image, *failed),
         "a failure of the current drawing tells the image's views");
  auto unrequested = ledger.retain(secondOwner, image);
  expect(ledger.abandon(secondOwner, image, *unrequested) == Abandon::kFail,
         "abandoning the retried retain, which another owner shares, fails "
         "the image for that owner's views");
  auto next = ledger.retain(secondOwner, image);
  expect(next.has_value() && *next > *unrequested,
         "the retain after a retried drawing that was never requested asks "
         "for one, while another owner still holds the failed image");
}

void anImageWhoseFirstDrawingWasNeverRequestedIsDrawnAgain() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto unrequested = ledger.retain(firstOwner, image);
  expect(!ledger.retain(secondOwner, image).has_value(),
         "a retain during the first drawing only counts");
  expect(ledger.abandon(firstOwner, image, *unrequested) == Abandon::kFail,
         "abandoning a first retain another owner shares fails the image for "
         "that owner's views");
  auto next = ledger.retain(firstOwner, image);
  expect(next.has_value() && *next > *unrequested,
         "the retain after a first drawing that was never requested asks "
         "for one, while the owner that retained meanwhile still holds it");
}

void theLastRetainWhoseDrawingWasNeverRequestedLeavesNothing() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto unrequested = ledger.retain(firstOwner, image);
  expect(ledger.abandon(firstOwner, image, *unrequested) == Abandon::kDiscard,
         "abandoning the only retain discards the image");
  expect(!ledger.isCurrent(image, *unrequested),
         "an image whose only retain was abandoned is no longer presented");
  auto next = ledger.retain(secondOwner, image);
  expect(next.has_value() && *next > *unrequested,
         "the image is drawn from zero at its next retain");
}

void aRetainItsOwnerGaveBackFailsTheImageOthersHold() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto unrequested = ledger.retain(firstOwner, image);
  expect(!ledger.retain(secondOwner, image).has_value(),
         "a retain during the first drawing only counts");
  expect(ledger.releaseAll(firstOwner).empty(),
         "an owner going away keeps an image another owner holds");
  expect(ledger.abandon(firstOwner, image, *unrequested) == Abandon::kFail,
         "abandoning a retain its owner gave back fails the image for the "
         "other owner's views, which wait for its drawing");
  auto next = ledger.retain(secondOwner, image);
  expect(next.has_value() && *next > *unrequested,
         "the retain after it draws the image again");
}

void aRetainItsOwnerGaveBackLeavesTheImageRetainedSinceAlone() {
  RNSkia::RNSkPresentedImageLedger ledger;
  auto unrequested = ledger.retain(firstOwner, image);
  expect(ledger.releaseAll(firstOwner) == std::vector<uint32_t>{image},
         "an owner going away discards the image only it held");
  auto current = ledger.retain(secondOwner, image);
  expect(ledger.abandon(firstOwner, image, *unrequested) == Abandon::kNothing,
         "abandoning a retain its owner gave back neither discards nor fails "
         "the image retained from zero since");
  expect(ledger.isCurrent(image, *current),
         "the drawing of the retain since stays current");
  expect(!ledger.retain(secondOwner, image).has_value(),
         "the retain after it only counts");
}

} // namespace

int main() {
  oneImageInManyViewsIsDrawnOnce();
  onlyTheLastReleaseDiscards();
  aReleaseOvertakesItsDrawing();
  anImageRetainedAgainIsDrawnAgain();
  anOwnerGivesBackItsRetainsAndNoOthers();
  aReleaseWithoutARetainChangesNothing();
  aFailedDrawingIsDrawnAgainByTheNextRetain();
  aFailureOfAnEarlierRetainChangesNothing();
  aFailureOfAReleasedImageChangesNothing();
  aFailedDrawingIsDrawnAgainWithNoRetain();
  anImageWhoseDrawingDidNotFailIsNotDrawnAgain();
  aReleasedFailedImageIsNotDrawnAgain();
  aDrawingAgainThatFailsIsDrawnAgainOnceMore();
  theSameScriptGivesTheSameGenerations();
  aFailedImageWhoseRetriedDrawingWasNeverRequestedIsDrawnAgain();
  anImageWhoseFirstDrawingWasNeverRequestedIsDrawnAgain();
  theLastRetainWhoseDrawingWasNeverRequestedLeavesNothing();
  aRetainItsOwnerGaveBackFailsTheImageOthersHold();
  aRetainItsOwnerGaveBackLeavesTheImageRetainedSinceAlone();
  if (failures > 0) {
    return 1;
  }
  std::printf("PresentedImageLedgerTest: passed\n");
  return 0;
}
