
#pragma once

#include <algorithm>
#include <functional>
#include <chrono>
#include <unordered_map>
#include <memory>

#include <jsi/jsi.h>

#include <JsiSkHostObjects.h>
#include <RNSkPlatformContext.h>

namespace RNSkia
{
using namespace facebook;

/**
 Implements a readonly Value that is updated every time the screen is redrawn. Its value will be the
 number of milliseconds since the animation value was started.
 */
class RNSkReadonlyValue : public JsiSkHostObject,
                          public std::enable_shared_from_this<RNSkReadonlyValue>
{
public:
  RNSkReadonlyValue(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiSkHostObject(platformContext),
    _propNameId(jsi::PropNameID::forUtf8(*platformContext->getJsRuntime(), "value")) {}
  
  virtual ~RNSkReadonlyValue() { }

  JSI_PROPERTY_GET(__typename__) {
    return jsi::String::createFromUtf8(runtime, "RNSkValue");
  }
  
  JSI_PROPERTY_GET(current) {
    return getCurrent(runtime);
  }
  
  JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(RNSkReadonlyValue, __typename__),
                              JSI_EXPORT_PROP_GET(RNSkReadonlyValue, current))
      
  JSI_HOST_FUNCTION(addListener) {
    if(!arguments[0].isObject() || !arguments[0].asObject(runtime).isFunction(runtime)) {
      jsi::detail::throwJSError(runtime, "Expected function as first parameter.");
      return jsi::Value::undefined();
    }
    auto callback = std::make_shared<jsi::Function>(arguments[0].asObject(runtime).asFunction(runtime));
    
    auto unsubscribe = addListener([self = shared_from_this(),
                                    this,
                                    callback = std::move(callback)](jsi::Runtime& runtime){
      callback->call(runtime, get_current(runtime));
    });
    
    return jsi::Function::createFromHostFunction(runtime,
                                                 jsi::PropNameID::forUtf8(runtime, "unsubscribe"),
                                                 0,
                                                 JSI_HOST_FUNCTION_LAMBDA {
      unsubscribe();
      return jsi::Value::undefined();
    });
  }
  
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkReadonlyValue, addListener))
    
  /**
  * Adds a callback that will be called whenever the value changes
  * @param cb Callback
  * @return unsubscribe function
  */
  const std::function<void()> addListener(const std::function<void(jsi::Runtime&)> cb) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto listenerId = _listenerId++;
    _listeners.emplace(listenerId, cb);
    return [self = shared_from_this(), this, listenerId]() {
      removeListener(listenerId);
    };
  }
  
  /**
    Updates the underlying value and notifies all listeners about the change
   @param runtime Current JS Runtime
   @param value Next value
   */
  virtual void update(jsi::Runtime &runtime, const jsi::Value &value) {
    if(_valueHolder == nullptr) {
      _valueHolder = std::make_shared<jsi::Object>(runtime);
    }
    _valueHolder->setProperty(runtime, _propNameId, value);
    notifyListeners(runtime);
  }
  
  jsi::Value getCurrent(jsi::Runtime &runtime) {
    if(_valueHolder == nullptr) {
      return jsi::Value::undefined();
    }
    return _valueHolder->getProperty(runtime, _propNameId);
  }
  
protected:
  /**
    Notifies listeners about changes
   @param runtime Current JS Runtime
   */
  void notifyListeners(jsi::Runtime &runtime) {
    std::unordered_map<long, std::function<void(jsi::Runtime&)>> tmp;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      tmp.insert(_listeners.cbegin(), _listeners.cend());
    }
    for(const auto &listener: tmp) {
      listener.second(runtime);
    }
  }
  
  /**
   Removes a subscription listeners
   @param listenerId identifier of listener to remove
   */
  void removeListener(long listenerId) {
    std::lock_guard<std::mutex> lock(_mutex);
    _listeners.erase(listenerId);
  }

private:
  jsi::PropNameID _propNameId;
  std::shared_ptr<jsi::Object> _valueHolder;
  long _listenerId = 0;
  std::unordered_map<long, std::function<void(jsi::Runtime&)>> _listeners;
  std::mutex _mutex;
};
}
