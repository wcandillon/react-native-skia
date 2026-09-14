#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkRSXform.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkRSXform
    : public JsiSkWrappingSharedPtrNativeObject<JsiSkRSXform, SkRSXform> {
public:
  static constexpr const char *CLASS_NAME = "RSXform";

  JsiSkRSXform(std::shared_ptr<RNSkPlatformContext> context,
               const SkRSXform &rsxform)
      : JsiSkWrappingSharedPtrNativeObject<JsiSkRSXform, SkRSXform>(
            std::move(context), std::make_shared<SkRSXform>(rsxform)) {}

  double getScos() { return SkScalarToDouble(getObject()->fSCos); }
  double getSsin() { return SkScalarToDouble(getObject()->fSSin); }
  double getTx() { return SkScalarToDouble(getObject()->fTx); }
  double getTy() { return SkScalarToDouble(getObject()->fTy); }

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Woverloaded-virtual"
  void set(double scos, double ssin, double tx, double ty) {
    getObject()->set(scos, ssin, tx, ty);
  }
#pragma clang diagnostic pop

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installGetter(runtime, prototype, "scos", &JsiSkRSXform::getScos);
    installGetter(runtime, prototype, "ssin", &JsiSkRSXform::getSsin);
    installGetter(runtime, prototype, "tx", &JsiSkRSXform::getTx);
    installGetter(runtime, prototype, "ty", &JsiSkRSXform::getTy);
    installMethod(runtime, prototype, "set", &JsiSkRSXform::set);
  }

  /**
  Returns the underlying object from a host object of this type
 */
  static std::shared_ptr<SkRSXform> fromValue(jsi::Runtime &runtime,
                                              const jsi::Value &obj) {
    const auto &object = obj.asObject(runtime);
    auto rsxform = tryGetJsiObject<JsiSkRSXform>(runtime, object);
    if (rsxform) {
      return rsxform->getObject();
    } else {
      auto scos = object.getProperty(runtime, "scos").asNumber();
      auto ssin = object.getProperty(runtime, "ssin").asNumber();
      auto tx = object.getProperty(runtime, "tx").asNumber();
      auto ty = object.getProperty(runtime, "ty").asNumber();
      return std::make_shared<SkRSXform>(SkRSXform::Make(scos, ssin, tx, ty));
    }
  }

  /**
  Returns the jsi object from a host object of this type
 */
  static jsi::Value toValue(jsi::Runtime &runtime,
                            std::shared_ptr<RNSkPlatformContext> context,
                            const SkRSXform &rsxform) {
    return makeJsiObject(
        runtime, std::make_shared<JsiSkRSXform>(std::move(context), rsxform));
  }

  /**
   * Creates the function for construction a new instance of the SkRSXform
   * wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the SkRSXform
   * class
   */
  static const jsi::HostFunctionType
  createCtorFromRadians(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto rsxform = SkRSXform::MakeFromRadians(
          arguments[0].asNumber(), arguments[1].asNumber(),
          arguments[2].asNumber(), arguments[3].asNumber(),
          arguments[4].asNumber(), arguments[5].asNumber());
      // Return the newly constructed object
      return makeJsiObject(runtime,
                           std::make_shared<JsiSkRSXform>(std::move(context),
                                                          std::move(rsxform)));
    };
  }
  size_t getMemoryPressure() override {
    return std::max(sizeof(SkRSXform), kMinMemoryPressure);
  }

  /**
   * Creates the function for construction a new instance of the SkRSXform
   * wrapper
   * @param context platform context
   * @return A function for creating a new host object wrapper for the SkRSXform
   * class
   */
  static const jsi::HostFunctionType
  createCtor(std::shared_ptr<RNSkPlatformContext> context) {
    return JSI_HOST_FUNCTION_LAMBDA {
      auto rsxform =
          SkRSXform::Make(arguments[0].asNumber(), arguments[1].asNumber(),
                          arguments[2].asNumber(), arguments[3].asNumber());
      // Return the newly constructed object
      return makeJsiObject(runtime,
                           std::make_shared<JsiSkRSXform>(std::move(context),
                                                          std::move(rsxform)));
    };
  }
};
} // namespace RNSkia
