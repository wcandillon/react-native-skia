#include "JsiWrapper.h"
#include <JsiArrayWrapper.h>
#include <JsiObjectWrapper.h>
#include <JsiPromiseWrapper.h>

namespace RNJsi {
using namespace facebook;

jsi::Value JsiWrapper::getValue(jsi::Runtime &runtime) {
  std::unique_lock<std::mutex> lock(*_readWriteMutex);
  switch (_type) {
  case JsiWrapperType::Undefined:
    return jsi::Value::undefined();
  case JsiWrapperType::Null:
    return jsi::Value::null();
  case JsiWrapperType::Bool:
    return jsi::Value((bool)_boolValue);
  case JsiWrapperType::Number:
    return jsi::Value((double)_numberValue);
  case JsiWrapperType::String:
    return jsi::String::createFromUtf8(runtime, _stringValue);
  default:
    jsi::detail::throwJSError(runtime, "Value type not supported.");
    return jsi::Value::undefined();
  }
}

std::shared_ptr<JsiWrapper> JsiWrapper::wrap(jsi::Runtime &runtime,
                                             const jsi::Value &value,
                                             JsiWrapper *parent) {
  std::shared_ptr<JsiWrapper> retVal = nullptr;

  if (value.isUndefined() || value.isNull() || value.isBool() ||
      value.isNumber() || value.isString()) {
    retVal = std::make_shared<JsiWrapper>(runtime, value, parent);
  } else if (value.isObject()) {
    auto obj = value.asObject(runtime);
    if (obj.isArray(runtime)) {
      retVal = std::make_shared<JsiArrayWrapper>(runtime, value, parent);
    } else if (JsiPromiseWrapper::isPromise(runtime, obj)) {
      retVal = std::make_shared<JsiPromiseWrapper>(runtime, value, parent);
    } else {
      retVal = std::make_shared<JsiObjectWrapper>(runtime, value, parent);
    }
  }

  if (retVal == nullptr) {
    jsi::detail::throwJSError(runtime, "Value type not supported.");
    return nullptr;
  }

  retVal->setValue(runtime, value);
  return retVal;
}

void JsiWrapper::setValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isUndefined()) {
    _type = JsiWrapperType::Undefined;
  } else if (value.isNull()) {
    _type = JsiWrapperType::Null;
  } else if (value.isBool()) {
    _type = JsiWrapperType::Bool;
    _boolValue = value.getBool();
  } else if (value.isNumber()) {
    _type = JsiWrapperType::Number;
    _numberValue = value.getNumber();
  } else if (value.isString()) {
    _type = JsiWrapperType::String;
    _stringValue = value.asString(runtime).utf8(runtime);
  } else {
    jsi::detail::throwJSError(runtime, "Value type not supported.");
  }
}

void JsiWrapper::updateValue(jsi::Runtime &runtime, const jsi::Value &value) {
  std::unique_lock<std::mutex> lock(*_readWriteMutex);
  setValue(runtime, value);
  // Notify changes
  notify();
}

bool JsiWrapper::canUpdateValue(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isUndefined() ||
      value.isNull() ||
      value.isBool() ||
      value.isNumber() ||
      value.isString()) {
    return true;
  } else {
    return false;
  }
}

std::string JsiWrapper::toString(jsi::Runtime &runtime) {
  switch (_type) {
  case JsiWrapperType::Undefined:
    return "undefined";
  case JsiWrapperType::Null:
    return "NULL";
  case JsiWrapperType::Bool:
    return std::to_string(_boolValue);
  case JsiWrapperType::Number: {
    // check if fraction is empty
    auto fraction = _numberValue-(long)_numberValue;
    if(fraction == 0.0) {
      return std::to_string(static_cast<long>(_numberValue));
    }
    std::string str = std::to_string (_numberValue);
    str.erase ( str.find_last_not_of('0') + 1, std::string::npos );
    return str;
  }
  case JsiWrapperType::String:
    return _stringValue;
  default:
    jsi::detail::throwJSError(runtime, "Value type not supported.");
    return "[Unknown]";
  }
}

jsi::Value JsiWrapper::callFunction(jsi::Runtime & runtime,
                                    const jsi::Function &func,
                                    const jsi::Value &thisValue,
                                    const jsi::Value *arguments, size_t count) {
  if (thisValue.isUndefined()) {
    return func.call(runtime, arguments, count);
  } else {
    return func.callWithThis(runtime, thisValue.asObject(runtime), arguments, count);
  }
}

} // namespace RNWorklet
