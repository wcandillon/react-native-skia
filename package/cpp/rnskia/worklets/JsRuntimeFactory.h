#pragma once

#include <jsi/jsi.h>
#include <memory>

#if !ANDROID && !defined(FOR_HERMES) && __has_include(<hermes/hermes.h>)
#define FOR_HERMES 1
#endif

#if FOR_HERMES
// Hermes
#include <hermes/hermes.h>
#else
// JSC
#if ANDROID
#include <JSCRuntime.h>
#else
#include <jsi/JSCRuntime.h>
#endif
#endif

namespace RNJsi {

using namespace facebook;

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunused-function"

static std::unique_ptr<jsi::Runtime> makeJSIRuntime() {

#pragma clang diagnostic pop

#if FOR_HERMES
  return facebook::hermes::makeHermesRuntime();
#else
  return facebook::jsc::makeJSCRuntime();
#endif
}

} // namespace RNJsi
