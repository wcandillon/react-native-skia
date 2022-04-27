
#pragma once

#include "RNSkReadonlyValue.h"
#include <RNSkPlatformContext.h>
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
class RNSkDerivedValue : public RNSkReadonlyValue
{
public:
  RNSkDerivedValue(std::shared_ptr<RNSkPlatformContext> platformContext,
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
      dependencies.push_back(value);
    }
    
    // Get callback for calculating result
    _callback = std::make_shared<jsi::Function>(arguments[0].asObject(runtime).asFunction(runtime));

    // register change handler on dependencies
    _unsubscribers.reserve(_unsubscribers.size() + size);
    for(const auto &dep: dependencies) {
      auto dispatcher = std::bind(&RNSkDerivedValue::dependencyUpdated, this, std::placeholders::_1);
      _unsubscribers.push_back(dep->addListener(dispatcher));
    }
        
    // Set initial value
    dependencyUpdated(runtime);
  }
  
  virtual ~RNSkDerivedValue() {
    // Unregister listeners
    for(const auto &unsubscribe: _unsubscribers) {
      unsubscribe();
    }
  }
  
private:
  void dependencyUpdated(jsi::Runtime &runtime) {
    // Calculate new value
    update(runtime, _callback->call(runtime, nullptr, 0));
  }

  std::shared_ptr<jsi::Function> _callback;
  std::vector<std::function<void()>> _unsubscribers;
};
}
