
#pragma once

#include <exception>
#include <functional>
#include <memory>

#include <worklets/JsRuntimeFactory.h>

#include <jsi/jsi.h>

namespace RNJsi {

using namespace facebook;

class JsiWorkletContext {
public:
  const char* WorkletRuntimeFlag = "__rnskia_worklet_runtime_flag";
  
  /**
   * Ctor for the JsiWorkletContext
   * @param jsRuntime Runtime for the main javascript runtime.
   */
  JsiWorkletContext(jsi::Runtime *jsRuntime, std::function<void(const std::exception&)> raiseError):
    _jsRuntime(jsRuntime),
    _raise(raiseError) {}

  /**
   * Dtor
   */
  virtual ~JsiWorkletContext() {
  }
  
  /**
   Returns the main javascript runtime
   */
  jsi::Runtime *getJsRuntime() { return _jsRuntime; }
  
  /**
   Returns the worklet runtime. Lazy evaluated
   */
  jsi::Runtime &getWorkletRuntime() {
    if(_workletRuntime == nullptr) {
      _workletRuntime = makeJSIRuntime();
      _workletRuntime->global().setProperty(*_workletRuntime, WorkletRuntimeFlag, true);
    }
    return *_workletRuntime;
  }

  /**
   * Raises an exception on the platform. This function does not necessarily
   * throw an exception and stop execution, so it is important to stop execution
   * by returning after calling the function
   * @param err Error to raise
   */
  void raiseError(const std::exception &err) {
    _raise(err);
  };

  /**
   * Raises an exception on the platform. This function does not necessarily
   * throw an exception and stop execution, so it is important to stop execution
   * by returning after calling the function
   * @param message Message to show
   */
  void raiseError(const std::string &message) {
    raiseError(std::runtime_error(message));
  }
  
private:
  jsi::Runtime *_jsRuntime;
  std::unique_ptr<jsi::Runtime> _workletRuntime;
  std::function<void(const std::exception&)> _raise;
};
} // namespace RNJsi
