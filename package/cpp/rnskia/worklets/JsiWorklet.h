#pragma once

#include <JsiWrapper.h>
#include <JsiWorkletContext.h>
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

#include <unordered_map>

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
  /**
   Factory function for creating a worklet wrapped function
   */
  static std::shared_ptr<JsiWorklet> makeWorklet(std::shared_ptr<JsiWorkletContext> context, std::shared_ptr<jsi::Function> function);
  
  /**
   Ctor
   */
  JsiWorklet(std::shared_ptr<JsiWorkletContext> context, std::shared_ptr<jsi::Function> function);
   
  /**
   Returns true if the function is a worklet
   */
  bool isWorklet();
  
  /**
   Returns the hash for worklet identification
   */
  double getWorkletHash();
  
  /**
   Returns the source location for the worklet
   */
  const std::string& getLocation();
  
  /**
   Calls the worklet in the correct runtime context
   */
  jsi::Value call(const jsi::Value *arguments, size_t count);
  
  /**
   Returns the current runtime depending on wether we are running as a worklet or not.
   */
  jsi::Runtime& getRuntime();
    
private:
  
  /**
   Calls the worklet in the worklet runtime
   */
  jsi::Value callInWorkletRuntime(const jsi::Value *arguments, size_t count);

  /**
   Calls the worklet in the Javascript runtime
   */
  jsi::Value callInJsRuntime(const jsi::Value *arguments, size_t count);
  
  /**
   Installs the worklet function into the worklet runtime
   */
  void installInWorkletRuntime(std::shared_ptr<jsi::Function> &function);
  
  jsi::Value evaluteJavascriptInWorkletRuntime(const std::string &code);
  
  /**
   Resolves the funtion either as a worklet or throwing an exception - non-workletized functions cannot be shared.
   */
  JsiFunctionResolverResult resolveFunction(jsi::Runtime& runtime, const jsi::Value& value);
  
  /**
   Returns true if the provided value is a valid worklet
   */
  static bool isWorklet(jsi::Runtime& runtime, const jsi::Value& value);
  
  /**
   Returns the worklet hash for the worklet. 
   */
  static size_t getWorkletHash(jsi::Runtime& runtime, const jsi::Value& value);
  
  
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
  
  static std::unordered_map<double, std::shared_ptr<JsiWorklet>> _workletsCache;
};
} // namespace RNSkia
