#pragma once

#include <map>
#include <mutex>
#include <vector>

#include <jsi/jsi.h>

#include <JsiHostObject.h>

namespace RNJsi {

using namespace facebook;

class JsiWrapper;

using JsiFunctionResolverResult = std::function<jsi::Value(jsi::Runtime &runtime, const jsi::Value &thisValue,
                                                           const jsi::Value *arguments, size_t count)>;

using JsiFunctionResolver = std::function<JsiFunctionResolverResult(jsi::Runtime&, const jsi::Value&)>;

class JsiWrapper: public JsiHostObject, public std::enable_shared_from_this<JsiWrapper> {
public:
  
  enum JsiWrapperType {
    Undefined,
    Null,
    Bool,
    Number,
    String,
    Array,
    Object,
    Promise,
    HostObject,
    HostFunction,
    Worklet
  };
  
  /**
   * Constructs a new JsiWrapper
   * @param runtime Calling runtime
   * @param value Value to wrap
   * @param resolver Function resolver
   * @param parent Optional parent wrapper
   */
  JsiWrapper(jsi::Runtime &runtime,
             const jsi::Value &value,
             JsiFunctionResolver resolver,
             std::weak_ptr<JsiWrapper> parent)
      : JsiWrapper(resolver, parent) {}

  /**
   * Returns a wrapper for the a jsi value
   * @param runtime Runtime to wrap value in
   * @param value Value to wrap
   * @return A new JsiWrapper
   */
  static std::shared_ptr<JsiWrapper> wrap(jsi::Runtime &runtime,
                                          const jsi::Value &value,
                                          JsiFunctionResolver resolver) {
    return JsiWrapper::wrap_child(runtime, value, resolver, std::weak_ptr<JsiWrapper>());
  }

  /**
   * Returns the value as a javascript value on the provided runtime
   * @param runtime Runtime
   * @param wrapper Wrapper to get value for
   * @return A new js value in the provided runtime with the wrapped value
   */
  static jsi::Value unwrap(jsi::Runtime &runtime,
                           std::shared_ptr<JsiWrapper> wrapper) {
    return wrapper->getValue(runtime);
  }

  /**
   * Updates the value from a JS value
   * @param runtime runtime for the value
   * @param value Value to set
   */
  virtual void updateValue(jsi::Runtime &runtime, const jsi::Value &value);
  
  /**
   Returns true if the value provided can be contained in the wrapped instance.
   */
  virtual bool canUpdateValue(jsi::Runtime &runtime, const jsi::Value &value);

  /**
   * @return The type of wrapper
   */
  JsiWrapperType getType() { return _type; }
  
  /**
   Returns the function resolver for the wrapper
   */
  JsiFunctionResolver getFunctionResolver() {
    return _resolver;
  }

  /**
   * Returns the object as a string
   */
  virtual std::string toString(jsi::Runtime &runtime);
  
  /**
   * Add listener
   * @param listener callback to notify
   * @return id of the listener - used for removing the listener
   */
  size_t addListener(std::shared_ptr<std::function<void()>> listener) {
    auto id = _listenerId++;
    _listeners.emplace(id, listener);
    return id;
  }

  /**
   * Remove listener
   * @param listenerId id of listener to remove
   */
  void removeListener(size_t listenerId) { _listeners.erase(listenerId); }
    
protected:
  /**
   * Constructor
   * @param runtime Calling runtime
   * @param value Value to wrap
   * @param resolver Function resolver
   * @param parent Optional parent wrapper
   * @param type Type of wrapper
   */
  JsiWrapper(jsi::Runtime &runtime,
             const jsi::Value &value,
             JsiFunctionResolver resolver,
             std::weak_ptr<JsiWrapper> parent,
             JsiWrapperType type)
      : JsiWrapper(resolver, parent) {
    _type = type;
  }
  
  /**
   * Returns a wrapper for the value
   * @param runtime Runtime to wrap value in
   * @param value Value to wrap
   * @return A new JsiWrapper
   */
  std::shared_ptr<JsiWrapper> wrap_child(jsi::Runtime &runtime, const jsi::Value &value);
  
  /**
   * Returns a wrapper for the value
   * @param runtime Runtime to wrap value in
   * @param value Value to wrap
   * @param resolver function resolver
   * @param parent Parent wrapper (for nested hierarchies)
   * @return A new JsiWrapper
   */
  static std::shared_ptr<JsiWrapper> wrap_child(jsi::Runtime &runtime,
                                                const jsi::Value &value,
                                                JsiFunctionResolver resolver,
                                                std::weak_ptr<JsiWrapper> parent);

  /**
   * Call to notify parent that something has changed
   */
  void notify() {
    auto parent = _parent.lock();
    if(parent) {
      parent->notify();
    }
        
    notifyListeners();
  }

  /**
   * Update the type
   * @param type Type to set
   */
  void setType(JsiWrapperType type) { _type = type; }

  /**
   * @return The parent object
   */
  std::weak_ptr<JsiWrapper> getParent() { return _parent; }
  
  /**
   Calls the Function and returns its value. This function will call the
   correct overload based on the this value
   */
  jsi::Value callFunction(jsi::Runtime & runtime,
                          const jsi::Function &func,
                          const jsi::Value &thisValue,
                          const jsi::Value *arguments, size_t count);  

  /**
   * Sets the value from a JS value
   * @param runtime runtime for the value
   * @param value Value to set
   */
  virtual void setValue(jsi::Runtime &runtime, const jsi::Value &value);

  /**
   * Returns the value as a javascript value on the provided runtime
   * @param runtime Runtime to set value in
   * @return A new js value in the provided runtime with the wrapped value
   */
  virtual jsi::Value getValue(jsi::Runtime &runtime);
  
private:
  
  /**
   * Notify listeners that the value has changed
   */
  void notifyListeners() {
    for (auto listener : _listeners) {
      (*listener.second)();
    }
  }
  
  /**
   * Base Constructor
   * @param parent Parent wrapper
   */
  JsiWrapper(JsiFunctionResolver resolver, std::weak_ptr<JsiWrapper> parent):
    _parent(parent),
    _resolver(resolver) {
    _readWriteMutex = new std::mutex();
  }

  std::mutex *_readWriteMutex;
  std::weak_ptr<JsiWrapper> _parent;
  JsiFunctionResolver _resolver;

  JsiWrapperType _type;

  bool _boolValue;
  double _numberValue;
  std::string _stringValue;

  size_t _listenerId = 1000;
  std::map<size_t, std::shared_ptr<std::function<void()>>> _listeners;  
};

} // namespace RNWorklet
