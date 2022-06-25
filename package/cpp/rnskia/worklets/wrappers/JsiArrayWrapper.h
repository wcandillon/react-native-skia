#pragma once

#include <JsiHostObject.h>
#include <JsiWrapper.h>
#include <jsi/jsi.h>

namespace RNJsi {
using namespace facebook;
class JsiWrapper;

class JsiArrayWrapper : public JsiHostObject,
                        public std::enable_shared_from_this<JsiArrayWrapper>,
                        public JsiWrapper {
public:
  /**
   * Constructs a new array wrapper
   * @param runtime In runtime
   * @param value Value to wrap
   * @param parent Parent wrapper object
   */
  JsiArrayWrapper(jsi::Runtime &runtime, const jsi::Value &value,
                  JsiWrapper *parent)
      : JsiWrapper(runtime, value, parent, JsiWrapperType::Array) {}

  JSI_PROPERTY_GET(prototype) {
    auto retVal = runtime.global().getPropertyAsObject(runtime, "Array")
      .getProperty(runtime, "prototype");
    return retVal;
  }
                          
  JSI_PROPERTY_GET(toStringTag) {
    return jsi::String::createFromUtf8(runtime, "Array");
  }
                          
  JSI_PROPERTY_GET(length) { return (double)_array.size(); }
                          
  JSI_HOST_FUNCTION(iterator) {
    int index = 0;
    auto iterator = jsi::Object(runtime);
    auto next = [index, this](jsi::Runtime &runtime, const jsi::Value &thisValue,
                                         const jsi::Value *arguments, size_t count) mutable {
      auto retVal = jsi::Object(runtime);
      if(index < _array.size()) {
        retVal.setProperty(runtime, "value", JsiWrapper::unwrap(runtime, _array[index]));
        retVal.setProperty(runtime, "done", false);
        index++;
      } else {
        retVal.setProperty(runtime, "done", true);
      }
      return retVal;
    };
    
    iterator.setProperty(runtime, "next",
      jsi::Function::createFromHostFunction(runtime,
                                            jsi::PropNameID::forUtf8(runtime, "next"),
                                            0,
                                            next));
    
    return iterator;
  }
                          
  JSI_HOST_FUNCTION(push) {
    // Push all arguments to the array
    auto lastIndex = _array.size();
    for (size_t i = 0; i < count; i++) {
      std::string indexString = std::to_string(lastIndex++);
      _array.push_back(JsiWrapper::wrap(runtime, arguments[i], this));
    }
    notify();
    return (double)_array.size();
  };

  JSI_HOST_FUNCTION(pop) {
    // Pop last element from array
    if (_array.empty()) {
      return jsi::Value::undefined();
    }
    auto lastEl = _array.at(_array.size() - 1);
    _array.pop_back();
    notify();
    return JsiWrapper::unwrap(runtime, lastEl);
  };

  JSI_HOST_FUNCTION(forEach) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      callFunction(runtime, callbackFn, thisValue, &arg, 1);
    }
    return jsi::Value::undefined();
  };

  JSI_HOST_FUNCTION(map) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    auto result = jsi::Array(runtime, _array.size());
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      auto retVal = callFunction(runtime, callbackFn, thisValue, &arg, 1);
      result.setValueAtIndex(runtime, i, retVal);
    }
    return result;
  };

  JSI_HOST_FUNCTION(filter) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    std::vector<std::shared_ptr<JsiWrapper>> result;

    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      auto retVal = callFunction(runtime, callbackFn, thisValue, &arg, 1);
      if (retVal.getBool() == true) {
        result.push_back(_array.at(i));
      }
    }
    auto returnValue = jsi::Array(runtime, result.size());
    for (size_t i = 0; i < result.size(); i++) {
      returnValue.setValueAtIndex(runtime, i,
                                  JsiWrapper::unwrap(runtime, result.at(i)));
    }
    return returnValue;
  };
                          
  JSI_HOST_FUNCTION(find) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      auto retVal = callFunction(runtime, callbackFn, thisValue, &arg, 1);
      if (retVal.getBool() == true) {
        return arg;
      }
    }
    return jsi::Value::undefined();
  };
                          
  JSI_HOST_FUNCTION(every) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      auto retVal = callFunction(runtime, callbackFn, thisValue, &arg, 1);
      if (retVal.getBool() == false) {
        return false;
      }
    }
    return true;
  };
                          
  JSI_HOST_FUNCTION(findIndex) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      auto retVal = callFunction(runtime, callbackFn, thisValue, &arg, 1);
      if (retVal.getBool() == true) {
        return static_cast<int>(i);
      }
    }
    return -1;
  };
                          
  JSI_HOST_FUNCTION(indexOf) {
    auto wrappedArg = JsiWrapper::wrap(runtime, arguments[0]);
    for (size_t i = 0; i < _array.size(); i++) {
      // TODO: Add == operator to JsiWrapper
      if(wrappedArg->getType() == _array[i]->getType()) {
        if(wrappedArg->toString(runtime) == _array[i]->toString(runtime)) {
          return static_cast<int>(i);
        }
      }
    }
    return -1;
  };
             
  const std::vector<std::shared_ptr<JsiWrapper>>
  flat_internal(int depth, std::vector<std::shared_ptr<JsiWrapper>>& arr) {
    std::vector<std::shared_ptr<JsiWrapper>> result;
    for (auto it: arr) {
      if(it->getType() == JsiWrapperType::Array) {
        // Recursively call flat untill depth equals 0
        if(depth <= -1 || depth > 0) {
          auto childArray = ((JsiArrayWrapper*)it.get())->getArray();
          auto flattened = flat_internal(depth-1, childArray);
          for(auto child: flattened) {
            result.push_back(child);
          }
        }
      } else {
        result.push_back(it);
      }
    }
    return result;
  }
                          
  JSI_HOST_FUNCTION(flat) {
    auto depth = count > 0  ? arguments[0].asNumber() : -1;
    std::vector<std::shared_ptr<JsiWrapper>> result = flat_internal(depth, _array);
    auto returnValue = jsi::Array(runtime, result.size());
    for (size_t i = 0; i < result.size(); i++) {
      returnValue.setValueAtIndex(runtime, i,
                                  JsiWrapper::unwrap(runtime, result.at(i)));
    }
    return returnValue;
  };
                          
  JSI_HOST_FUNCTION(includes) {
    auto wrappedArg = JsiWrapper::wrap(runtime, arguments[0]);
    for (size_t i = 0; i < _array.size(); i++) {
      // TODO: Add == operator to JsiWrapper!!!
      if(wrappedArg->getType() == _array[i]->getType()) {
        if(wrappedArg->toString(runtime) == _array[i]->toString(runtime)) {
          return true;
        }
      }
    }
    return false;
  };
                          
  JSI_HOST_FUNCTION(concat) {
    auto nextArray = arguments[0].asObject(runtime).asArray(runtime);
    auto results = jsi::Array(runtime, static_cast<size_t>(_array.size() + nextArray.size(runtime)));
    for(size_t i=0; i<_array.size(); i++) {
      results.setValueAtIndex(runtime, i, JsiWrapper::unwrap(runtime, _array[i]));
    }
    auto startIndex = std::max<size_t>(0, _array.size()-1);
    for(size_t i=0; i<nextArray.size(runtime); i++) {
      results.setValueAtIndex(runtime, i + startIndex, nextArray.getValueAtIndex(runtime, i));
    }
    return results;
  }
                          
  JSI_HOST_FUNCTION(join) {
    auto separator = count > 0 ? arguments[0].asString(runtime).utf8(runtime) : ",";
    auto result = std::string("");
    for (size_t i = 0; i < _array.size(); i++) {
      auto arg = JsiWrapper::unwrap(runtime, _array.at(i));
      result += arg.toString(runtime).utf8(runtime);
      if(i < _array.size()-1) {
        result += separator;
      }
    }
    return jsi::String::createFromUtf8(runtime, result);
  }
                          
  JSI_HOST_FUNCTION(reduce) {
    auto callbackFn = arguments[0].asObject(runtime).asFunction(runtime);
    std::shared_ptr<JsiWrapper> acc = JsiWrapper::wrap(runtime, jsi::Value::undefined());
    if(count > 1) {
      acc = JsiWrapper::wrap(runtime, arguments[1]);
    }
    for (size_t i = 0; i < _array.size(); i++) {
      std::vector<jsi::Value> args(3);
      args[0] = JsiWrapper::unwrap(runtime, acc);
      args[1] = JsiWrapper::unwrap(runtime, _array.at(i));
      args[2] = jsi::Value(static_cast<int>(i));
      acc = JsiWrapper::wrap(runtime,
                             callFunction(runtime,
                                          callbackFn,
                                          thisValue,
                                          static_cast<const jsi::Value *>(args.data()),
                                          3)
                              );
    }
    return JsiWrapper::unwrap(runtime, acc);
  }

  JSI_HOST_FUNCTION(toString) {
    return jsi::String::createFromUtf8(runtime, toString(runtime));
  };
                          
  JSI_HOST_FUNCTION(toJSON) {
    return jsi::String::createFromUtf8(runtime, toString(runtime));
  }

  JSI_EXPORT_PROPERTY_GETTERS(JSI_EXPORT_PROP_GET(JsiArrayWrapper, length),
                              JSI_EXPORT_PROP_GET(JsiArrayWrapper, prototype),
                              JSI_EXPORT_PROP_GET(JsiArrayWrapper, toStringTag))
                          
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiArrayWrapper, push),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, pop),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, forEach),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, map),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, filter),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, concat),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, find),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, every),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, findIndex),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, flat),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, includes),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, indexOf),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, join),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, reduce),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, toString),
                       JSI_EXPORT_FUNC(JsiArrayWrapper, toJSON),
                       JSI_EXPORT_FUNC_NAMED(JsiArrayWrapper, iterator, Symbol.iterator))

  /**
   * Overridden getValue method
   * @param runtime Calling runtime
   * @return jsi::Value representing this array
   */
  jsi::Value getValue(jsi::Runtime &runtime) override {
    return jsi::Object::createFromHostObject(runtime, shared_from_this());
  }
                          
  bool canUpdateValue(jsi::Runtime &runtime, const jsi::Value &value) override {
    return value.isObject() && value.asObject(runtime).isArray(runtime);
  }

  /**
   * Overridden setValue method
   * @param runtime Calling runtime
   * @param value Value to set
   */
  void setValue(jsi::Runtime &runtime, const jsi::Value &value) override {
    assert(value.isObject());
    auto object = value.asObject(runtime);
    assert(object.isArray(runtime));
    auto array = object.asArray(runtime);

    size_t size = array.size(runtime);
    _array.resize(size);

    for (size_t i = 0; i < size; i++) {
      _array[i] =
          JsiWrapper::wrap(runtime, array.getValueAtIndex(runtime, i), this);
    }
    
    // Update prototype
    auto objectCtor = runtime.global().getProperty(runtime, "Object");
    if(!objectCtor.isUndefined()) {
        // Get setPrototypeOf
        auto setPrototypeOf = objectCtor.asObject(runtime).getProperty(runtime, "setPrototypeOf");
        if(!setPrototypeOf.isUndefined()) {
            auto array = runtime.global().getProperty(runtime, "Array");
            if(!array.isUndefined()) {
              auto arrayPrototype = array.asObject(runtime).getProperty(runtime, "prototype");
              auto selfObject = jsi::Object::createFromHostObject(runtime, shared_from_this());
              setPrototypeOf.asObject(runtime).asFunction(runtime).call(
                runtime, selfObject, arrayPrototype);
            }
        }
    }
  }

  /**
   * Overridden jsi::HostObject set property method
   * @param runtime Runtime
   * @param name Name of value to set
   * @param value Value to set
   */
  void set(jsi::Runtime &runtime, const jsi::PropNameID &name,
           const jsi::Value &value) override {
    auto nameStr = name.utf8(runtime);
    if (!nameStr.empty() &&
        std::all_of(nameStr.begin(), nameStr.end(), ::isdigit)) {
      // Return property by index
      auto index = std::stoi(nameStr.c_str());
      _array[index] = JsiWrapper::wrap(runtime, value);
      notify();
    } else {
      // This is an edge case where the array is used as a
      // hashtable to set a value outside the bounds of the
      // array (ie. outside out the range of items being pushed)
      jsi::detail::throwJSError(runtime, "Array out of bounds");
    }
  }

  /**
   * Overridden jsi::HostObject get property method. Returns functions from
   * the map of functions.
   * @param runtime Runtime
   * @param name Name of value to get
   * @return Value
   */
  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
    auto nameStr = name.utf8(runtime);
    if (!nameStr.empty() &&
        std::all_of(nameStr.begin(), nameStr.end(), ::isdigit)) {
      // Return property by index
      auto index = std::stoi(nameStr.c_str());
      auto prop = _array[index];
      return JsiWrapper::unwrap(runtime, prop);
    }
    // Return super JsiHostObject's get
    return JsiHostObject::get(runtime, name);
  }

  /**
   * Returns the array as a string
   * @param runtime Runtime to return in
   * @return Array as string
   */
  std::string toString(jsi::Runtime &runtime) override {
    std::string retVal = "";
    // Return array contents
    for (size_t i = 0; i < _array.size(); i++) {
      auto str = _array.at(i)->toString(runtime);
      retVal += (i > 0 ? "," : "") + str;
    }
    return "[" + retVal + "]";
  }
                          
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &runtime) override {
    std::vector<jsi::PropNameID> propNames;
    for(size_t i=0; i < _array.size(); i++) {
      propNames.push_back(jsi::PropNameID::forUtf8(runtime, std::to_string(i)));
    }
    return propNames;
  }
                          
  const std::vector<std::shared_ptr<JsiWrapper>>& getArray() { return _array; }
                          
private:
  std::vector<std::shared_ptr<JsiWrapper>> _array;
};
} // namespace RNSkia
