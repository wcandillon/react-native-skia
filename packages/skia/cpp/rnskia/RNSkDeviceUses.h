#pragma once

#include <atomic>
#include <mutex>
#include <shared_mutex>

namespace RNSkia {

/**
 * The calls into one GPU device from outside the context lock that its
 * destruction waits out: each snap, which compiles the pipelines its
 * recording needs, and each call of the pipeline warmup. Dawn compiles
 * shaders and builds pipelines outside its device lock, and leaves keeping
 * Device::Destroy() apart from them to its caller (crbug.com/475530346).
 */
class RNSkDeviceUses {
public:
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
   Runs `call` as a Use unless the device is lost by then: false, with
   nothing run. For a call that is for nothing on a lost device.
   */
  template <typename Call>
  bool runUnlessLost(const std::atomic<bool> &lost, Call &&call) {
    Use use(*this);
    if (lost.load(std::memory_order_acquire)) {
      return false;
    }
    call();
    return true;
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
  std::shared_mutex _mutex;
};

} // namespace RNSkia
