#pragma once

#include <atomic>
#include <mutex>
#include <shared_mutex>

namespace RNSkia {

/**
 * The calls into one GPU device from outside the context lock that its
 * destruction waits out: one that compiles a pipeline on it, which Dawn does
 * outside its device lock once it has checked the device alive, leaving
 * keeping Device::Destroy() apart from it to its caller
 * (crbug.com/475530346), and one that writes or reads a buffer Graphite keeps
 * mapped on it, which Destroy() unmaps.
 */
class RNSkDeviceUses {
public:
  /** `lost` is the device's loss flag, which outlives the uses. */
  explicit RNSkDeviceUses(const std::atomic<bool> &lost) : _lost(lost) {}

  /** The device's loss flag, set once by its loss. */
  const std::atomic<bool> &lost() const { return _lost; }

  /**
   One call: the device is not destroyed before it ends. Never taken with
   the context lock held, which the destruction takes.
   */
  class Use {
  public:
    explicit Use(RNSkDeviceUses &uses) : _lock(uses._mutex) {}

  private:
    std::shared_lock<std::shared_mutex> _lock;
  };

  /**
   Runs `call` as a Use unless the device is lost by the time the Use is
   held: false, with nothing run. For a call that is for nothing on a lost
   device.
   */
  template <typename Call> bool runUnlessLost(Call &&call) {
    Use use(*this);
    if (_lost.load(std::memory_order_acquire)) {
      return false;
    }
    call();
    return true;
  }

  /** Returns once no Use is in flight. */
  void waitForUsesInFlight() {
    std::unique_lock<std::shared_mutex> lock(_mutex);
  }

  /**
   Runs `destroy` once no Use is in flight, holding new ones off until it
   returns. Called once the device is lost.
   */
  template <typename Destroy> void destroyAfterUses(Destroy &&destroy) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    destroy();
  }

private:
  const std::atomic<bool> &_lost;
  std::shared_mutex _mutex;
};

} // namespace RNSkia
