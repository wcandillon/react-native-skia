#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <unordered_map>
#include <vector>

namespace RNSkia {

/**
 Who retains each presented image, and which retain-from-zero its bitmap is
 being read back for (see RNSkPresentedImages, which keeps the ledger under
 its lock and does what each answer asks for). Retains are counted per owner,
 so an owner that goes away gives back its own retains and no others.
 */
class RNSkPresentedImageLedger {
public:
  /**
   Counts a retain of image `id` by `owner`. The first retain of an image
   answers the generation to read it back for; any other answers nothing.
   */
  std::optional<uint64_t> retain(const void *owner, uint32_t id) {
    auto &entry = _entries[id];
    const bool first = entry.retains.empty();
    entry.retains[owner]++;
    if (!first) {
      return std::nullopt;
    }
    entry.generation = ++_generation;
    return entry.generation;
  }

  /**
   Gives back one of `owner`'s retains of image `id`. Answers whether it was
   the image's last, whose bitmap is then discarded.
   */
  bool release(const void *owner, uint32_t id) {
    auto it = _entries.find(id);
    if (it == _entries.end()) {
      return false;
    }
    auto &retains = it->second.retains;
    auto own = retains.find(owner);
    if (own == retains.end()) {
      return false;
    }
    if (--own->second == 0) {
      retains.erase(own);
    }
    if (!retains.empty()) {
      return false;
    }
    _entries.erase(it);
    return true;
  }

  /**
   Gives back every retain `owner` holds. Answers the images whose last
   retain it held, whose bitmaps are then discarded.
   */
  std::vector<uint32_t> releaseAll(const void *owner) {
    std::vector<uint32_t> released;
    for (auto it = _entries.begin(); it != _entries.end();) {
      it->second.retains.erase(owner);
      if (!it->second.retains.empty()) {
        ++it;
        continue;
      }
      released.push_back(it->first);
      it = _entries.erase(it);
    }
    return released;
  }

  /**
   Whether the retain-from-zero that asked for a readback under `generation`
   still holds image `id`: an image released since, and maybe retained
   again, presents nothing for the old request.
   */
  bool isCurrent(uint32_t id, uint64_t generation) const {
    auto it = _entries.find(id);
    return it != _entries.end() && it->second.generation == generation;
  }

private:
  struct Entry {
    std::unordered_map<const void *, size_t> retains;
    uint64_t generation = 0;
  };

  std::unordered_map<uint32_t, Entry> _entries;
  uint64_t _generation = 0;
};

} // namespace RNSkia
