
#pragma once

#include <RNSkPlatformContext.h>
#include <RNSkReadonlyValue.h>
#include <jsi/jsi.h>

#include <algorithm>
#include <functional>
#include <chrono>

namespace RNSkia
{
using namespace facebook;
/**
 Implements a readonly Value that is updated every time the screen is redrawn. Its value will be the
 number of milliseconds since the animation value was started.
 */
class RNSkClockValue : public RNSkReadonlyValue
{
enum RNSkClockState {
    NotStarted = 0,
    Running = 1,
    Stopped = 2
};
  
public:
  RNSkClockValue(std::shared_ptr<RNSkPlatformContext> platformContext,
                 size_t identifier,
                 jsi::Runtime& runtime,
                 const jsi::Value *arguments,
                 size_t count) : RNSkReadonlyValue(platformContext),
        _runtime(runtime),
        _identifier(identifier) {
    // Start by updating to zero (start value)
    update(_runtime, static_cast<double>(0));
  }
  
  virtual ~RNSkClockValue() {
    stopClock();
  }
  
  JSI_HOST_FUNCTION(start) {
    startClock();
    return jsi::Value::undefined();
  }
  
  JSI_HOST_FUNCTION(stop) {
    stopClock();
    return jsi::Value::undefined();
  }
  
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkReadonlyValue, addListener),
                       JSI_EXPORT_FUNC(RNSkClockValue, start),
                       JSI_EXPORT_FUNC(RNSkClockValue, stop))
  
  
  virtual void startClock() {
    if(_state == RNSkClockState::Running) {
      return;
    }
    
    auto now = std::chrono::high_resolution_clock::now();
    if(_state == RNSkClockState::NotStarted) {
      _start = now;
      _stop = now;
    }
    
    // Subtract pause time from start
    auto timeSinceStop = now - _stop;
    _start += timeSinceStop;
    
    _state = RNSkClockState::Running;
    
    getContext()->beginDrawLoop([weakSelf = weak_from_this()](bool invalidated){
      auto self = weakSelf.lock();
      if(self) {
        std::dynamic_pointer_cast<RNSkClockValue>(self)->notifyUpdate(invalidated);
      }
    });
  }
  
  virtual void stopClock() {
    if(_state == RNSkClockState::Running) {
      _state = RNSkClockState::Stopped;
      _stop = std::chrono::high_resolution_clock::now();
      getContext()->endDrawLoop(_identifier);
    }
  }
  
protected:
  virtual void tick(jsi::Runtime &runtime, const jsi::Value &value) {
    update(runtime, value);
  }
  
  void notifyUpdate(bool invalidated) {
    if(invalidated) {
      stopClock();
      return;
    }
    
    if(_state != RNSkClockState::Running) {
      return;
    }
    
    // Update method
    if(getState() == RNSkClockState::Running) {
      auto now = std::chrono::high_resolution_clock::now();
      auto deltaFromStart = std::chrono::duration_cast<std::chrono::milliseconds>(now - _start).count();
      tick(_runtime, static_cast<double>(deltaFromStart));
    }    
  }
  
  /**
   Returns the draw identifier for the clock. This identifier is used
   for the draw loop.
   */
  size_t getIdentifier() { return _identifier; }
  
  /**
   Returns the state of the clock
   */
  RNSkClockState getState() { return _state; }

  jsi::Runtime &_runtime;
  size_t _identifier;
  std::chrono::time_point<std::chrono::steady_clock> _start;
  std::chrono::time_point<std::chrono::steady_clock> _stop;
  std::atomic<RNSkClockState> _state = { RNSkClockState::NotStarted };
};

}
