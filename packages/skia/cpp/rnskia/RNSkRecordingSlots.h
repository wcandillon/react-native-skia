#pragma once

#include <algorithm>
#include <cstddef>
#include <memory>
#include <vector>

namespace RNSkia {

/**
 * The slots a producer's recordings hold in its view's queue: one for each
 * recording it queued, given back once the view is done with that recording
 * (presented or skipped it), whichever path got to it, or once the recording
 * is gone (the queue dropped it, made for a GPU device lost since). A
 * recording the producer did not queue (a client's, one another view's
 * producer queued, the last frame shown again) holds none. Not thread-safe:
 * the producer holds its lock.
 */
template <typename Recording> class RNSkRecordingSlots {
public:
  /** The producer queued the recording. */
  void hold(const std::shared_ptr<Recording> &recording) {
    // A recording the queue dropped unpresented frees its slot here: no view
    // reports it done.
    _held.erase(std::remove_if(_held.begin(), _held.end(),
                               [](const std::weak_ptr<Recording> &slot) {
                                 return slot.expired();
                               }),
                _held.end());
    _held.push_back(recording);
  }

  /** The view is done with these recordings: presented, or skipped. */
  template <typename Iterator> void giveBack(Iterator first, Iterator last) {
    _held.erase(
        std::remove_if(_held.begin(), _held.end(),
                       [first, last](const std::weak_ptr<Recording> &slot) {
                         return std::find(first, last, slot.lock()) != last;
                       }),
        _held.end());
  }

  /** The slots held: by the recordings still queued. */
  size_t count() const {
    return static_cast<size_t>(std::count_if(
        _held.begin(), _held.end(),
        [](const std::weak_ptr<Recording> &slot) { return !slot.expired(); }));
  }

  /** The producer moved to another target: nothing it queued holds one. */
  void clear() { _held.clear(); }

private:
  std::vector<std::weak_ptr<Recording>> _held;
};

} // namespace RNSkia
