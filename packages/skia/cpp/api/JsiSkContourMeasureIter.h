#pragma once

#include <algorithm>
#include <atomic>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>

#include "JsiSkContourMeasure.h"
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
 */
class JsiSkContourMeasureIter
    : public rnwgpu::NativeObject<JsiSkContourMeasureIter> {
public:
  static constexpr const char *CLASS_NAME = "ContourMeasureIter";

  JsiSkContourMeasureIter(std::shared_ptr<RNSkPlatformContext> context,
                          const SkPath &path, bool forceClosed,
                          SkScalar resScale = 1)
      : rnwgpu::NativeObject<JsiSkContourMeasureIter>(CLASS_NAME),
        _context(std::move(context)),
        _object(std::make_shared<SkContourMeasureIter>(path, forceClosed,
                                                       resScale)) {}

  /**
   * Returns the next contour measure, or undefined when iteration is complete.
   *
   * This is a typed method (not a raw jsi::Value host function): returning a
   * std::shared_ptr<JsiSkContourMeasure> lets the JSIConverter / NativeObject
   * pipeline wrap it automatically via JsiSkContourMeasure::create(), which
   * attaches the native state and installs the shared prototype. The optional
   * maps a null result to `undefined`.
   */
  std::optional<std::shared_ptr<JsiSkContourMeasure>> next() {
    auto next = getObject()->next();
    if (next == nullptr) {
      return std::nullopt;
    }
    return std::make_shared<JsiSkContourMeasure>(getContext(),
                                                 std::move(next));
  }

  std::string getTypename() { return CLASS_NAME; }

  size_t getMemoryPressure() override {
    return std::max(sizeof(SkContourMeasureIter), rnwgpu::kMinMemoryPressure);
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installGetter(runtime, prototype, "__typename__",
                  &JsiSkContourMeasureIter::getTypename);
    installMethod(runtime, prototype, "next", &JsiSkContourMeasureIter::next);
    prototype.setProperty(
        runtime, "dispose",
        jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forUtf8(runtime, "dispose"), 0,
            [](jsi::Runtime &rt, const jsi::Value &thisValue,
               const jsi::Value * /*arguments*/,
               size_t /*count*/) -> jsi::Value {
              auto self = JsiSkContourMeasureIter::fromValue(rt, thisValue);
              self->release();
              if (thisValue.isObject()) {
                thisValue.getObject(rt).setExternalMemoryPressure(
                    rt, rnwgpu::kMinMemoryPressure);
              }
              return jsi::Value::undefined();
            }));
  }

  /**
   * Creates the function for constructing a new instance of the
   * SkContourMeasureIter wrapper. Installed in JsiSkApi as "ContourMeasureIter".
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto path = JsiSkPath::fromValue(runtime, arguments[0]);
      auto forceClosed = arguments[1].getBool();
      auto resScale = arguments[2].asNumber();
      // Return the newly constructed object
      auto iter = std::make_shared<JsiSkContourMeasureIter>(
          context, path->snapshot(), forceClosed, resScale);
      return JsiSkContourMeasureIter::create(runtime, iter);
    };
  }

protected:
  std::shared_ptr<SkContourMeasureIter> getObject() const {
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
  std::shared_ptr<SkContourMeasureIter> _object;
  std::atomic<bool> _disposed = {false};
};
} // namespace RNSkia
