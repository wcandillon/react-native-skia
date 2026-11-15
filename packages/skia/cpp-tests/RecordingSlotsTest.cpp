// Host-side check of RNSkia::RNSkRecordingSlots, the slots a producer's
// recordings hold in its view's queue (see run.sh).

#include <cstdio>
#include <memory>
#include <vector>

#include "rnskia/RNSkRecordingSlots.h"

namespace {

struct Recording {};

using Slots = RNSkia::RNSkRecordingSlots<Recording>;

int failures = 0;

void expect(bool condition, const char *what) {
  if (!condition) {
    std::fprintf(stderr, "FAIL: %s\n", what);
    failures++;
  }
}

void giveBack(Slots &slots,
              const std::vector<std::shared_ptr<Recording>> &done) {
  slots.giveBack(done.begin(), done.end());
}

void aRecordingGivesItsSlotBackOnceDone() {
  Slots slots;
  auto recording = std::make_shared<Recording>();
  slots.hold(recording);
  expect(slots.count() == 1, "a queued recording holds a slot");
  giveBack(slots, {recording});
  expect(slots.count() == 0, "a recording done with gives its slot back");
}

void aLastFrameShownAgainGivesNoneBack() {
  Slots slots;
  auto shown = std::make_shared<Recording>();
  slots.hold(shown);
  giveBack(slots, {shown});
  auto coming = std::make_shared<Recording>();
  slots.hold(coming);
  // A redraw shows the last frame again while the next one is queued.
  giveBack(slots, {shown});
  expect(slots.count() == 1, "a last frame shown again frees no slot, the "
                             "frame on its way keeps its own");
}

void aRecordingTheProducerDidNotQueueGivesNoneBack() {
  Slots slots;
  auto coming = std::make_shared<Recording>();
  slots.hold(coming);
  auto client = std::make_shared<Recording>();
  giveBack(slots, {client});
  expect(slots.count() == 1, "a client's recording frees no slot");
}

void aRecordingTheQueueDroppedGivesItsSlotBack() {
  Slots slots;
  auto dropped = std::make_shared<Recording>();
  slots.hold(dropped);
  // The queue drops it (made for a GPU device lost since), unpresented.
  dropped.reset();
  expect(slots.count() == 0, "a recording dropped from the queue gives its "
                             "slot back");
}

void aRecordingNotDoneKeepsItsSlotWhileAnotherGivesItsBack() {
  Slots slots;
  auto first = std::make_shared<Recording>();
  auto second = std::make_shared<Recording>();
  slots.hold(first);
  slots.hold(second);
  giveBack(slots, {first});
  expect(slots.count() == 1, "a recording not done yet keeps its slot");
  giveBack(slots, {second});
  expect(slots.count() == 0, "it gives it back once done");
}

void anotherTargetHoldsNone() {
  Slots slots;
  auto queued = std::make_shared<Recording>();
  slots.hold(queued);
  slots.clear();
  expect(slots.count() == 0, "a recording queued on the previous target "
                             "holds no slot");
  giveBack(slots, {queued});
  expect(slots.count() == 0, "nor does it give one back once presented");
}

} // namespace

int main() {
  aRecordingGivesItsSlotBackOnceDone();
  aLastFrameShownAgainGivesNoneBack();
  aRecordingTheProducerDidNotQueueGivesNoneBack();
  aRecordingTheQueueDroppedGivesItsSlotBack();
  aRecordingNotDoneKeepsItsSlotWhileAnotherGivesItsBack();
  anotherTargetHoldsNone();
  if (failures > 0) {
    return 1;
  }
  std::printf("RecordingSlotsTest: passed\n");
  return 0;
}
