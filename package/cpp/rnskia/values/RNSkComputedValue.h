
#pragma once

#include "RNSkReadonlyValue.h"
#include <RNSkPlatformContext.h>
#include <JsiWorklet.h>
#include <jsi/jsi.h>

#include <algorithm>
#include <functional>
#include <chrono>
#include <memory>
#include <vector>

namespace RNSkia
{
using namespace facebook;

/**
  Creates a readonly value that depends on one or more other values. The derived value has a callback
  function that is used to calculate the new value when any of the dependencies change.
 */
class RNSkComputedValue : public RNSkReadonlyValue
{
public:
  RNSkComputedValue(std::shared_ptr<RNSkPlatformContext> platformContext,
                    jsi::Runtime &runtime,
                    const jsi::Value *arguments,
                    size_t count
                   )
      : RNSkReadonlyValue(platformContext) {
    // Verify input
    if(!arguments[0].isObject() ||
       !arguments[0].asObject(runtime).isFunction(runtime)) {
      jsi::detail::throwJSError(runtime, "Expected callback function as first parameter");
    }
        
    if(!arguments[1].isObject() ||
       !arguments[1].asObject(runtime).isArray(runtime)) {
      jsi::detail::throwJSError(runtime, "Expected array of dependencies as second parameter");
    }
        
    // Get callback for calculating result
    auto function = std::make_shared<jsi::Function>(arguments[0].asObject(runtime).asFunction(runtime));
    _worklet = std::make_shared<RNJsi::JsiWorklet>(platformContext->getWorkletContext(), function);
  }
  
  void initializeDependencies(jsi::Runtime &runtime, const jsi::Value *arguments, size_t count) {
    // Save dependencies
    std::vector<std::shared_ptr<RNSkReadonlyValue>> dependencies;
        
    // Ensure that all dependencies are Values
    auto deps = arguments[1].asObject(runtime).asArray(runtime);
    const std::size_t size = deps.size(runtime);
    dependencies.reserve(size);
    for(size_t i=0; i<size; ++i) {
      auto dep = deps.getValueAtIndex(runtime, i);
      if(!dep.isObject() ||
         !dep.asObject(runtime).isHostObject(runtime)) {
        continue;
      }
      auto value = dep.asObject(runtime).asHostObject<RNSkReadonlyValue>(runtime);
      if(value == nullptr) {
        continue;
      }
      // Push to dependencies array
      dependencies.push_back(value);
    }

    // Ensure that all parent dependencies supports worklets or not - we don't allow
    // a mix of this.
    for(const auto &dep: dependencies) {
      if(dep->isLimitedToJSThread() && _worklet->isWorklet()) {
        throw std::runtime_error("One of the dependencies cannot be run as a worklet.");
      }
    }
    
    // register change handler on dependencies
    _unsubscribers.reserve(_unsubscribers.size() + size);
    for(const auto &dep: dependencies) {
      _unsubscribers.push_back(dep->addListener([weakSelf = weak_from_this()](jsi::Runtime& runtime) {
        auto self = weakSelf.lock();
        if(self) {
          auto selfAsThis = std::dynamic_pointer_cast<RNSkComputedValue>(self);
          selfAsThis->dependencyUpdated(runtime);
        }
      }));
    }
        
    // Set initial value
    dependencyUpdated(runtime);
  }
  
  virtual ~RNSkComputedValue() {
    // Unregister listeners
    for(const auto &unsubscribe: _unsubscribers) {
      unsubscribe();
    }
  }
  
  bool isLimitedToJSThread() override {
    return !_worklet->isWorklet();
  }
  
private:
  void dependencyUpdated(jsi::Runtime &runtime) {
    // Calculate new value
    if(_worklet->isWorklet()) {
      update(runtime, _worklet->call(nullptr, 0));
    } else {
      getContext()->runOnJavascriptThread([weakSelf = weak_from_this(), &runtime](){
          auto self = weakSelf.lock();
          if(self) {
            self->update(runtime,
                         std::dynamic_pointer_cast<RNSkComputedValue>(self)->_worklet->call(
                                 nullptr, 0));
          }
      });
    }
  }

  std::shared_ptr<RNJsi::JsiWorklet> _worklet;
  std::vector<std::function<void()>> _unsubscribers;
};
}
