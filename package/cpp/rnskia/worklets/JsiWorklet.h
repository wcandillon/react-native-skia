#pragma once

#include <JsiWrapper.h>
#include <JsiWorkletContext.h>
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace RNJsi {

using namespace facebook;

/// Class for wrapping jsi::JSError
class JsErrorWrapper : public std::exception {
public:
  JsErrorWrapper(std::string message, std::string stack):
    _message(std::move(message)), _stack(std::move(stack)) {};
  const std::string& getStack() const { return _stack; }
  const std::string& getMessage() const { return _message; }
  const char* what() const noexcept override { return _message.c_str();}
private:
  std::string _message;
  std::string _stack;
};

/**
 Encapsulates a runnable function. A runnable function is a function
 that exists in both the main JS runtime and as an installed function
 in the worklet runtime. The worklet object exposes some methods and props
 for handling this. The worklet exists in a given worklet context.
 */
class JsiWorklet {
public:
  JsiWorklet(std::shared_ptr<JsiWorkletContext> context, std::shared_ptr<jsi::Function> function)
      : _context(context) {
    // Install function in worklet runtime
    installInWorkletRuntime(function);
  }
  
  /**
   Returns true if the function is a worklet
   */
  bool isWorklet() { return _isWorklet; }
  
  /**
   Returns the hash for worklet identification
   */
  double getWorkletHash() { return _workletHash; }
  
  /**
   Returns the source location for the worklet
   */
  const std::string& getLocation() { return _location; }
  
  /**
   Calls the worklet in the correct runtime context
   */
  jsi::Value call(const jsi::Value *arguments, size_t count) {
    if(isWorklet()) {
      return callInWorkletRuntime(arguments, count);
    } else {
      return callInJsRuntime(arguments, count);
    }
  }
  
  /**
   Returns the current runtime depending on wether we are running as a worklet or not.
   */
  jsi::Runtime& getRuntime() {
    if(isWorklet()) {
      return _context->getWorkletRuntime();
    } else {
      return *_context->getJsRuntime();
    }
  }
    
private:
  /**
   Calls the worklet in the worklet runtime
   */
  jsi::Value callInWorkletRuntime(const jsi::Value *arguments, size_t count) {
    
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
  jsi::Value callInJsRuntime(const jsi::Value *arguments, size_t count) {
    return _jsFunction->call(*_context->getJsRuntime(), arguments, count);
  }
 
  
  /**
   Installs the worklet function into the worklet runtime
   */
  void installInWorkletRuntime(std::shared_ptr<jsi::Function> &function) {
    
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
    
    // TODO: Add support for caching based on worklet hash
    
    // Create closure wrapper so it will be accessible across runtimes
    _closureWrapper = JsiWrapper::wrap(runtime, closure);

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
  
  jsi::Value evaluteJavascriptInWorkletRuntime(const std::string &code) {
    auto workletRuntime = &_context->getWorkletRuntime();
    auto eval = workletRuntime->global().getPropertyAsFunction(*workletRuntime, "eval");
    return eval.call(*workletRuntime, ("(" + code + ")").c_str());
  }

  bool _isWorklet = false;
  std::shared_ptr<jsi::Function> _jsFunction;
  std::unique_ptr<jsi::Function> _workletFunction;
  std::shared_ptr<JsiWorkletContext> _context;
  std::shared_ptr<JsiWrapper> _closureWrapper;
  std::string _location = "";
#if DEBUG
  std::string _code = "";
#endif
  double _workletHash = 0;
};
} // namespace RNSkia
