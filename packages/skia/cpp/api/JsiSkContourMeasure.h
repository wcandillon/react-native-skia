#pragma once

#include <atomic>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "jsi2/NativeObject.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkContourMeasure.h"

#include "JsiSkPath.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

/**
 * Migrated from the deprecated jsi::HostObject API to the JSI NativeState
 * pattern (rnwgpu::NativeObject, see cpp/jsi2/NativeObject.h).
 *
 * Instead of intercepting every property access through HostObject::get(),
 * the methods/getters live on a shared prototype installed once per runtime,
 * and the native data is attached to a plain JS object via setNativeState().
 */
class JsiSkContourMeasure : public rnwgpu::NativeObject<JsiSkContourMeasure> {
public:
  // Used both for Symbol.toStringTag and (if ever installed) the global
  // constructor name. The JS-facing type guard relies on __typename__ below.
  static constexpr const char *CLASS_NAME = "ContourMeasure";

  JsiSkContourMeasure(std::shared_ptr<RNSkPlatformContext> context,
                      sk_sp<SkContourMeasure> contourMeasure)
      : rnwgpu::NativeObject<JsiSkContourMeasure>(CLASS_NAME),
        _context(std::move(context)), _object(std::move(contourMeasure)) {}

  // The method bodies below are unchanged from the HostObject implementation.
  // They are installed on the prototype via installMethod(); because they
  // return jsi::Value they take full control of argument handling (NativeObject
  // forwards `arguments`/`count` and passes an undefined `thisValue`).

  JSI_HOST_FUNCTION(getPosTan) {
    auto dist = arguments[0].asNumber();
    SkPoint position;
    SkPoint tangent;
    auto result = getObject()->getPosTan(dist, &position, &tangent);
    if (!result) {
      throw jsi::JSError(runtime, "getPosTan() failed");
    }
    auto posTan = jsi::Array(runtime, 2);
    auto posPoint = std::make_shared<JsiSkPoint>(getContext(), position);
    auto pos = JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(runtime, posPoint,
                                                           getContext());
    auto tanPoint = std::make_shared<JsiSkPoint>(getContext(), tangent);
    auto tan = JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(runtime, tanPoint,
                                                           getContext());
    posTan.setValueAtIndex(runtime, 0, pos);
    posTan.setValueAtIndex(runtime, 1, tan);
    return posTan;
  }

  JSI_HOST_FUNCTION(length) {
    return jsi::Value(SkScalarToDouble(getObject()->length()));
  }

  JSI_HOST_FUNCTION(isClosed) { return jsi::Value(getObject()->isClosed()); }

  JSI_HOST_FUNCTION(getSegment) {
    auto start = arguments[0].asNumber();
    auto end = arguments[1].asNumber();
    auto startWithMoveTo = arguments[2].getBool();
    SkPathBuilder builder;
    auto result =
        getObject()->getSegment(start, end, &builder, startWithMoveTo);
    if (!result) {
      throw jsi::JSError(runtime, "getSegment() failed");
    }
    return JsiSkPath::toValue(runtime, getContext(), builder.snapshot());
  }

  // Preserves the SkJSIInstance<"ContourMeasure"> contract on the JS side.
  std::string getTypename() { return CLASS_NAME; }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installGetter(runtime, prototype, "__typename__",
                  &JsiSkContourMeasure::getTypename);
    installMethod(runtime, prototype, "getPosTan",
                  &JsiSkContourMeasure::getPosTan);
    installMethod(runtime, prototype, "length", &JsiSkContourMeasure::length);
    installMethod(runtime, prototype, "isClosed",
                  &JsiSkContourMeasure::isClosed);
    installMethod(runtime, prototype, "getSegment",
                  &JsiSkContourMeasure::getSegment);
    // dispose() needs access to the JS object (`thisValue`) to lower the
    // reported memory pressure, so it is installed as a raw host function
    // rather than through installMethod() (which hides `thisValue`).
    prototype.setProperty(
        runtime, "dispose",
        jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forUtf8(runtime, "dispose"), 0,
            [](jsi::Runtime &rt, const jsi::Value &thisValue,
               const jsi::Value * /*arguments*/,
               size_t /*count*/) -> jsi::Value {
              auto self = JsiSkContourMeasure::fromValue(rt, thisValue);
              self->release();
              if (thisValue.isObject()) {
                thisValue.getObject(rt).setExternalMemoryPressure(
                    rt, rnwgpu::kMinMemoryPressure);
              }
              return jsi::Value::undefined();
            }));
  }

protected:
  /**
   * Returns the wrapped object, throwing if it has been disposed. Mirrors the
   * behaviour of the former JsiSkWrapping* base classes.
   */
  sk_sp<SkContourMeasure> getObject() const {
    if (_disposed.load(std::memory_order_acquire)) {
      throw std::runtime_error("Attempted to access a disposed object.");
    }
    return _object;
  }

  std::shared_ptr<RNSkPlatformContext> getContext() const { return _context; }

private:
  void release() {
    bool expected = false;
    if (_disposed.compare_exchange_strong(expected, true,
                                          std::memory_order_acq_rel)) {
      _object = nullptr;
    }
  }

  std::shared_ptr<RNSkPlatformContext> _context;
  sk_sp<SkContourMeasure> _object;
  std::atomic<bool> _disposed = {false};
};
} // namespace RNSkia
