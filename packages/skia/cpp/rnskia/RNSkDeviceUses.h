#pragma once

#include <atomic>
#include <mutex>
#include <shared_mutex>

namespace RNSkia {

/**
 * The calls into one GPU device from outside the context lock that may be
 * compiling on it as it is destroyed, which the destruction waits out: each
 * snap begun while it was the device in use, and each compile of the
 * pipeline warmup made before it was lost. Dawn builds pipelines outside its
 * device lock, once it has checked the device alive, and leaves keeping
 * Device::Destroy() apart from them to its caller (crbug.com/475530346).
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
