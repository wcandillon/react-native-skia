#pragma once

namespace rnsurface {

/**
 * The interval owned by an Apple display link, on its present thread.
 * An empty callback still opens an interval: a recording ready just after
 * it can use that interval instead of waiting for the next callback.
 * No clock is read here, so deadline boundaries are testable without a GPU.
 */
class DisplayLinkPacing {
public:
  void onTick(double target) {
    _target = target;
    _presented = false;
  }

  void onPresented() { _presented = true; }

  // A successful present keeps one following callback even if the next UI
  // update has not started replay yet. An empty tick clears this demand.
  bool hasPresented() const { return _presented; }

  bool canPresentLate(double now) const {
    return !_presented && _target > 0 && now < _target;
  }

  // Resizes retain their immediate path, except for a second present in an
  // interval already used. An expired interval does not hold a resize back.
  bool hasPresentedInInterval(double now) const {
    return _presented && now < _target;
  }

  void reset() {
    _target = 0;
    _presented = false;
  }

private:
  double _target = 0;
  bool _presented = false;
};

} // namespace rnsurface
