
#pragma once

#include <array>

#include <JsiHostObject.h>
#include <RNSkPlatformContext.h>
#include <RNSkClockValue.h>
#include <JsiWorklet.h>
#include <jsi/jsi.h>

namespace RNSkia
{
using namespace facebook;

/**
 Implements an animation that can be used to drive other values
 */
class RNSkAnimation : public RNSkClockValue
{
  
public:
  RNSkAnimation(std::shared_ptr<RNSkPlatformContext> platformContext,
                     size_t identifier,
                     jsi::Runtime& runtime,
                     const jsi::Value *arguments,
                     size_t count) :
    RNSkClockValue(platformContext, identifier, runtime, arguments, count) {

    // Save the update function
    auto function = std::make_shared<jsi::Function>(arguments[0].asObject(runtime).asFunction(runtime));
    _worklet = std::make_shared<RNJsi::JsiWorklet>(platformContext->getWorkletContext(), function);
        
    // Set state to undefined initially.
    _args[1] = jsi::Value::undefined();
  }
  
  JSI_HOST_FUNCTION(cancel) {
    stopClock();
    return jsi::Value::undefined();
  }
  
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkAnimation, cancel))

protected:
   
  void tick(jsi::Runtime &runtime, const jsi::Value &value) override {
    // Set up arguments and call the update function
    _args[0] = value.asNumber();
    _args[1] = _worklet->call(static_cast<const jsi::Value*>(_args.data()), _args.size());
    
    // Get finished
    auto finished = _args[1].asObject(runtime).getProperty(runtime, "finished").getBool();
    if(finished) {
      stopClock();
    }
    
    // Get the next value
    auto nextValue = _args[1].asObject(runtime).getProperty(runtime, "current").asNumber();
    
    // Update self
    update(runtime, nextValue);
  }
  
private:
  
  std::shared_ptr<RNJsi::JsiWorklet> _worklet;
  std::array<jsi::Value, 2> _args;
};
}
