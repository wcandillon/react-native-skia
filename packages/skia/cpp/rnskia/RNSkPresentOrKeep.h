#pragma once

#include <cstddef>
#include <utility>
#include <vector>

namespace RNSkia {

/** What presentOrKeep() did. */
struct RNSkPresented {
  // Every recording is done: shown, or skipped.
  bool allDone;
  // A frame went to the window.
  bool shown;
  // How many of the recordings are done, from the front; the rest went back
  // to the queue.
  size_t done;
};

/**
 Presents a view's recordings onto its window, described by `targetInfo`,
 and keeps what the window could not take, in order. `present(targetInfo,
 recordings)` replays them and says how many are done, from the front, and
 whether a frame went to the window (`done`, `shown`). The recordings done
 are handed to `release(recordings, done)` after every attempt, so that they
 give the producer back the slots they hold also when the window could not
 take the rest. A window that changed under the present (`readTarget`
 describes it otherwise: the main thread resized it between the read of its
 description and the present) gets the rest once more, as it is now, rather
 than a frame later. What is left goes to `keep`, for the front of the queue.
 */
template <typename Info, typename Recording, typename Present, typename Release,
          typename ReadTarget, typename Keep>
RNSkPresented presentOrKeep(Info targetInfo, std::vector<Recording> recordings,
                            Present &&present, Release &&release,
                            ReadTarget &&readTarget, Keep &&keep) {
  bool shown = false;
  size_t done = 0;
  for (int attempt = 0;; attempt++) {
    const auto replayed = present(targetInfo, recordings);
    shown = shown || replayed.shown;
    done += replayed.done;
    release(recordings, replayed.done);
    if (replayed.done == recordings.size()) {
      return {true, shown, done};
    }
    recordings.erase(recordings.begin(),
                     recordings.begin() + static_cast<long>(replayed.done));
    Info now;
    if (attempt == 0 && readTarget(&now) && now != targetInfo) {
      targetInfo = now;
      continue;
    }
    keep(std::move(recordings));
    return {false, shown, done};
  }
}

} // namespace RNSkia
