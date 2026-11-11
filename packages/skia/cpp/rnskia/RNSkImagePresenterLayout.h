#pragma once

#include <optional>

namespace RNSkia {

/**
 * The layout a static canvas's images take (see
 * RNSkView::layOutImagePresenter): the last one the platform view laid the
 * canvas out with and handed on to the images' worker, kept on the main
 * thread. A layout is handed on only when it differs from that one, so the
 * worker gets every change in the order the layouts came, and a layout pass
 * that changes nothing costs it nothing.
 */
class RNSkImagePresenterLayout {
public:
  struct Layout {
    int width = 0;
    int height = 0;
    bool useP3ColorSpace = false;

    bool operator==(const Layout &other) const = default;
  };

  /** What a layout asks of the image presenter. */
  enum class Change {
    // Nothing: the layout is the last one handed on, or it is empty.
    kNone,
    // Attach the presenter: the first layout, or a new color space.
    kAttach,
    // Resize the presenter: a new size in the same color space.
    kResize,
  };

  /** Main thread. Records a non-empty layout and says what it asks. */
  [[nodiscard]] Change layOut(const Layout &layout) {
    if (layout.width <= 0 || layout.height <= 0 || _last == layout) {
      return Change::kNone;
    }
    const bool attach =
        !_last.has_value() || _last->useP3ColorSpace != layout.useP3ColorSpace;
    _last = layout;
    return attach ? Change::kAttach : Change::kResize;
  }

private:
  std::optional<Layout> _last;
};

} // namespace RNSkia
