#pragma once

#include <JsiHostObject.h>
#include <JsiWrapper.h>

#include <jsi/jsi.h>
#include <ReactCommon/TurboModuleUtils.h>

#include <functional>

namespace RNJsi {
using namespace facebook;
class JsiWrapper;

class JsiPromiseWrapper : public JsiHostObject,
                          public JsiWrapper {
public:
  JsiPromiseWrapper(jsi::Runtime &runtime, const jsi::Value &value,
    JsiWrapper *parent) : JsiWrapper(runtime, value, parent) {}
     
  static bool isPromise(jsi::Runtime &runtime, jsi::Object &obj) {
    auto then = obj.getProperty(runtime, "then");
    if(then.isObject() && then.asObject(runtime).isFunction(runtime)) {
      return true;
    }
    return false;
  }
                            
protected:
                            
  bool canUpdateValue(jsi::Runtime &runtime, const jsi::Value &value) override {
    return false;
  }
                            
  jsi::Value getValue(jsi::Runtime &runtime) override {
    return react::createPromiseAsJSIValue(runtime, [this](jsi::Runtime &runtime,
                                                          std::shared_ptr<react::Promise> promise) {
      // First of all, check if the promise is resolved
      if(_resultSet) {
        // resolve
        promise->resolve(JsiWrapper::unwrap(runtime, _result));
        return;
      }
      
      // Or if it failed
      if(_errorSet) {
        promise->reject(_error);
        return;
      }
      
      // Now we need to add ourselves as a listener to the original promise
      _resolveListeners.push_back([this, &runtime, promise](){
        promise->resolve(JsiWrapper::unwrap(runtime, _result));
      });
      
      _rejectListeners.push_back([this, &runtime, promise](){
        promise->reject(_error);
      });
    });
  }
                            
  void setValue(jsi::Runtime &runtime, const jsi::Value &value) override {
    setType(JsiWrapper::JsiWrapperType::Promise);
    
    auto obj = value.asObject(runtime);
    
    auto thenFunc = obj.getPropertyAsFunction(runtime, "then");
    auto catchFunc = obj.getProperty(runtime, "catch");
    // Set then
    auto thisThenHandler = (jsi::Value(JsiHostObject::*)
                           (jsi::Runtime & runtime, const jsi::Value &thisValue,
                           const jsi::Value *arguments, size_t)) &
                           JsiPromiseWrapper::handlePromiseResolved;
    
    auto dispatcher = std::bind(thisThenHandler, (JsiPromiseWrapper *)this,
                        std::placeholders::_1, std::placeholders::_2,
                        std::placeholders::_3, std::placeholders::_4);
    
    thenFunc.callWithThis(runtime, obj, jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forUtf8(runtime, "then"), 1, dispatcher));
    
    if(catchFunc.isObject()) {
      auto catchFuncObj = catchFunc.asObject(runtime);
      if(catchFuncObj.isFunction(runtime)) {
        auto thisCatchHandler = (jsi::Value(JsiHostObject::*)
                                (jsi::Runtime & runtime, const jsi::Value &thisValue,
                                const jsi::Value *arguments, size_t)) &
                                JsiPromiseWrapper::handlePromiseRejected;
        
        auto dispatcher = std::bind(thisCatchHandler, (JsiPromiseWrapper *)this,
                          std::placeholders::_1, std::placeholders::_2,
                          std::placeholders::_3, std::placeholders::_4);
        
        catchFuncObj.asFunction(runtime).callWithThis(runtime,
          obj, jsi::Function::createFromHostFunction(runtime,
            jsi::PropNameID::forUtf8(runtime, "catch"), 1, dispatcher));
      }
    }
  }
                            
private:
  jsi::Value handlePromiseResolved(jsi::Runtime & runtime, const jsi::Value &thisValue,                     \
                             const jsi::Value *arguments, size_t count) {
    if(_resultSet) {
      jsi::detail::throwJSError(runtime, "Promise is already resolved");
    }
    _resultSet = true;
    _result = JsiWrapper::wrap(runtime, arguments[0]);
    for(auto listener: _resolveListeners) {
      listener();
    }
    _rejectListeners.clear();
    _resolveListeners.clear();
    
    return jsi::Value::undefined();
  }
                            
  jsi::Value handlePromiseRejected(jsi::Runtime & runtime, const jsi::Value &thisValue,                     \
                             const jsi::Value *arguments, size_t count) {
    if(_errorSet) {
      jsi::detail::throwJSError(runtime, "Promise is already resolved");
    }
    _errorSet = true;
    // Error can be a string or an error objcet
    if(arguments[0].isObject()) {
      auto err = arguments[0].asObject(runtime);
      _error = err.getProperty(runtime, "message").asString(runtime).utf8(runtime);
    } else {
      _error = arguments[0].asString(runtime).utf8(runtime);
    }
    for(auto listener: _rejectListeners) {
      listener();
    }
    _rejectListeners.clear();
    _resolveListeners.clear();
    
    return jsi::Value::undefined();
  }
                            
  std::vector<std::function<void()>> _resolveListeners;
  std::vector<std::function<void()>> _rejectListeners;
  bool _resultSet = false;
  bool _errorSet = false;
  std::shared_ptr<JsiWrapper> _result;
  std::string _error;
};
} // namespace RNWorklet
