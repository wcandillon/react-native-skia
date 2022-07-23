#include "JsiWorklet.h"

namespace RNJsi {
using namespace facebook;

std::unordered_map<double, std::shared_ptr<JsiWorklet>> JsiWorklet::_workletsCache;

std::shared_ptr<JsiWorklet> JsiWorklet::makeWorklet(std::shared_ptr<JsiWorkletContext> context,
                                                    std::shared_ptr<jsi::Function> function) {
  auto result = std::make_shared<JsiWorklet>(context, function);
  // Add worklet to worklet cache
  _workletsCache.emplace(result->getWorkletHash(), result);
  return result;
}

JsiWorklet::JsiWorklet(std::shared_ptr<JsiWorkletContext> context, std::shared_ptr<jsi::Function> function)
    : _context(context) {
  // Install function in worklet runtime
  installInWorkletRuntime(function);
}

/**
 Returns true if the function is a worklet
 */
bool JsiWorklet::isWorklet() { return _isWorklet; }

/**
 Returns the hash for worklet identification
 */
double JsiWorklet::getWorkletHash() { return _workletHash; }

/**
 Returns the source location for the worklet
 */
const std::string& JsiWorklet::getLocation() { return _location; }

/**
 Calls the worklet in the correct runtime context
 */
jsi::Value JsiWorklet::call(const jsi::Value *arguments, size_t count) {
  if(isWorklet()) {
    return callInWorkletRuntime(arguments, count);
  } else {
    return callInJsRuntime(arguments, count);
  }
}

/**
 Returns the current runtime depending on wether we are running as a worklet or not.
 */
jsi::Runtime& JsiWorklet::getRuntime() {
  if(isWorklet()) {
    return _context->getWorkletRuntime();
  } else {
    return *_context->getJsRuntime();
  }
}

/**
 Calls the worklet in the worklet runtime
 */
jsi::Value JsiWorklet::callInWorkletRuntime(const jsi::Value *arguments, size_t count) {
  
  auto runtime = &_context->getWorkletRuntime();
  
  // Unwrap closure
  auto unwrappedClosure = JsiWrapper::unwrap(*runtime, _closureWrapper);

  // Prepare return value
  jsi::Value retVal;
  
  auto oldThis = runtime->global().getProperty(*runtime, "jsThis");
  auto newThis = jsi::Object(*runtime);
  newThis.setProperty(*runtime, "_closure", unwrappedClosure);
  runtime->global().setProperty(*runtime, "jsThis", newThis);

  if (!unwrappedClosure.isObject()) {
    retVal = _workletFunction->call(*runtime, arguments, count);
  } else {
    retVal = _workletFunction->callWithThis(*runtime, unwrappedClosure.asObject(*runtime), arguments, count);
  }
  runtime->global().setProperty(*runtime, "jsThis", oldThis);

  return retVal;
}

/**
 Calls the worklet in the Javascript runtime
 */
jsi::Value JsiWorklet::callInJsRuntime(const jsi::Value *arguments, size_t count) {
  return _jsFunction->call(*_context->getJsRuntime(), arguments, count);
}


/**
 Installs the worklet function into the worklet runtime
 */
void JsiWorklet::installInWorkletRuntime(std::shared_ptr<jsi::Function> &function) {
  
  jsi::Runtime& runtime = *_context->getJsRuntime();
  
  // Save pointer to function
  _jsFunction = function;

  // Try to get the closure
  jsi::Value closure = _jsFunction->getProperty(runtime, "_closure");
  
  // Return if this is not a worklet
  if (closure.isUndefined() || closure.isNull()) {
    return;
  }
  
  // Try to get the asString function
  jsi::Value asStringProp = _jsFunction->getProperty(runtime, "asString");
  if (asStringProp.isUndefined() ||
      asStringProp.isNull() ||
      !asStringProp.isString()) {
    return;
  }
  
  // Get location
  jsi::Value locationProp = _jsFunction->getProperty(runtime, "__location");
  if (locationProp.isUndefined() ||
      locationProp.isNull() ||
      !locationProp.isString()) {
    return;
  }
  
  // Set location
  _location = locationProp.asString(runtime).utf8(runtime);
  
  // Get worklet hash
  jsi::Value workletHashProp = _jsFunction->getProperty(runtime, "__workletHash");
  if (workletHashProp.isUndefined() ||
      workletHashProp.isNull() ||
      !workletHashProp.isNumber()) {
    return;
  }
  
  // Set location
  _workletHash = workletHashProp.asNumber();
  
  // This is a worklet
  _isWorklet = true;
  
  // Create closure wrapper so it will be accessible across runtimes
  _closureWrapper = JsiWrapper::wrap(runtime,
                                     closure,
                                     std::bind(&JsiWorklet::resolveFunction,
                                               (JsiWorklet *)this,
                                               std::placeholders::_1,
                                               std::placeholders::_2));

  // Let us try to install the function in the worklet context
  auto code = asStringProp.asString(runtime).utf8(runtime);
#if DEBUG
  _code = code;
#endif
  
  jsi::Runtime *workletRuntime = &_context->getWorkletRuntime();

  auto evaluatedFunction = evaluteJavascriptInWorkletRuntime(code);
  if(!evaluatedFunction.isObject()) {
    _context->raiseError(std::string("Could not create worklet from function. ") +
      "Eval did not return an object:\n" + code);
      return;
  }
  if(!evaluatedFunction.asObject(*workletRuntime).isFunction(*workletRuntime)) {
    _context->raiseError(std::string("Could not create worklet from function. ") +
                          "Eval did not return a function:\n" + code);
      return;
  }
  _workletFunction = std::make_unique<jsi::Function>(evaluatedFunction
    .asObject(*workletRuntime).asFunction(*workletRuntime));
}

jsi::Value JsiWorklet::evaluteJavascriptInWorkletRuntime(const std::string &code) {
  auto workletRuntime = &_context->getWorkletRuntime();
  auto eval = workletRuntime->global().getPropertyAsFunction(*workletRuntime, "eval");
  return eval.call(*workletRuntime, ("(" + code + ")").c_str());
}

bool JsiWorklet::isWorklet(jsi::Runtime& runtime, const jsi::Value& value) {
  if(!value.isObject()) {
    return false;
  }
  if(!value.asObject(runtime).isFunction(runtime)) {
    return false;
  }
  
  auto func = value.asObject(runtime).asFunction(runtime);
  
  // Try to get the closure
  jsi::Value closure = func.getProperty(runtime, "_closure");
  
  // Return if this is not a worklet
  if (closure.isUndefined() || closure.isNull()) {
    return false;
  }
  
  // Try to get the asString function
  jsi::Value asStringProp = func.getProperty(runtime, "asString");
  if (asStringProp.isUndefined() ||
      asStringProp.isNull() ||
      !asStringProp.isString()) {
    return false;
  }
  
  return true;
}

size_t JsiWorklet::getWorkletHash(jsi::Runtime& runtime, const jsi::Value& value) {
  auto func = value.asObject(runtime).asFunction(runtime);
  
  // Try to get the worklet hash
  jsi::Value workletHash = func.getProperty(runtime, "__workletHash");
  
  // Return if this is not a worklet
  if (workletHash.isUndefined() || workletHash.isNull()) {
    return 0;
  }
  
  return workletHash.asNumber();
}

JsiFunctionResolverResult JsiWorklet::resolveFunction(jsi::Runtime& runtime, const jsi::Value& value) {
  if(!JsiWorklet::isWorklet(runtime, value)) {
    return JSI_HOST_FUNCTION_LAMBDA {
      jsi::detail::throwJSError(
          runtime, "Regular javascript functions cannot be shared. Make sure the function is workletized \
                                by adding the `worklet` statement to the beginning of the function.");
      return jsi::Value::undefined();
    };
  }
  
  // Check if we have a cached version of the worklet
  auto workletHash = JsiWorklet::getWorkletHash(runtime, value);
  if(_workletsCache.count(workletHash) == 0) {
    // Create new worklet - this will add the worklet to the cache.
    JsiWorklet::makeWorklet(_context, std::make_shared<jsi::Function>(value.asObject(runtime).asFunction(runtime)));
  }
  auto worklet = _workletsCache.at(workletHash);
  
  return JSI_HOST_FUNCTION_LAMBDA {
    // Call the worklet
    return worklet->call(arguments, count);
  };
}
}
