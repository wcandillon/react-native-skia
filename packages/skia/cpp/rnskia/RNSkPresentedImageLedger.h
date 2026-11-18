#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <unordered_map>
#include <vector>

namespace RNSkia {

/**
 Who retains each presented image, and which retain-from-zero its bitmap is
 being drawn for (see RNSkPresentedImages, which keeps the ledger under
 its lock and does what each answer asks for). Retains are counted per owner,
 so an owner that goes away gives back its own retains and no others.
 */
class RNSkPresentedImageLedger {
public:
  /** What abandon() decided. */
  enum class Abandon {
    // It was the image's last retain: its bitmap is discarded.
    kDiscard,
    // The image is still held: its views are told it failed.
    kFail,
    // The retain-from-zero that asked no longer holds the image: nothing.
    kNothing,
  };

  /**
   Counts a retain of image `id` by `owner`. The first retain of an image,
   and the first after its drawing failed (see fail), answers the generation
   to draw it under; any other answers nothing.
   */
  [[nodiscard]] std::optional<uint64_t> retain(const void *owner, uint32_t id) {
    auto &entry = _entries[id];
    const bool draws = entry.retains.empty() || entry.failed;
    entry.retains[owner]++;
    if (!draws) {
      return std::nullopt;
    }
    return draw(entry);
  }

  /**
   Draws image `id`, whose drawing failed, again with no retain: answers the
   generation to draw it under, or nothing for an image whose drawing did not
   fail.
   */
  [[nodiscard]] std::optional<uint64_t> drawAgain(uint32_t id) {
    auto it = _entries.find(id);
    if (it == _entries.end() || !it->second.failed) {
      return std::nullopt;
    }
    return draw(it->second);
  }

  /**
   The drawing under `generation` made no bitmap of image `id`: the next
   retain, by any owner, or drawAgain draws it again. Answers whether
   `generation` is current, whose views are then told the image failed; a
   failure under a generation no longer current changes nothing.
   */
  [[nodiscard]] bool fail(uint32_t id, uint64_t generation) {
    auto it = _entries.find(id);
    if (it == _entries.end() || it->second.generation != generation) {
      return false;
    }
    it->second.failed = true;
    return true;
  }

  /**
   Gives back `owner`'s retain of image `id` whose drawing under
   `generation` could not be requested: as a release (see release), and as a
   failure of that drawing for the image's other holders (see fail).
   */
  [[nodiscard]] Abandon abandon(const void *owner, uint32_t id,
                                uint64_t generation) {
    if (release(owner, id)) {
      return Abandon::kDiscard;
    }
    return fail(id, generation) ? Abandon::kFail : Abandon::kNothing;
  }

  /**
   Gives back one of `owner`'s retains of image `id`. Answers whether it was
   the image's last, whose bitmap is then discarded.
   */
  [[nodiscard]] bool release(const void *owner, uint32_t id) {
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
  [[nodiscard]] std::vector<uint32_t> releaseAll(const void *owner) {
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
   Whether the retain-from-zero that asked for a drawing under `generation`
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
    bool failed = false;
  };

  uint64_t draw(Entry &entry) {
    entry.failed = false;
    entry.generation = ++_generation;
    return entry.generation;
  }

  std::unordered_map<uint32_t, Entry> _entries;
  uint64_t _generation = 0;
};

} // namespace RNSkia
