
#pragma once

#include <JsiHostObject.h>
#include <RNSkPlatformContext.h>
#include <RNSkValue.h>
#include <RNSkDerivedValue.h>
#include <RNSkAnimation.h>
#include <jsi/jsi.h>

namespace RNSkia {
using namespace facebook;

class RNSkValueApi : public JsiHostObject {
public:
  /**
   * Constructor
   * @param platformContext Platform context
   */
  RNSkValueApi(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiHostObject(), _platformContext(platformContext) {
      }

  /**
   * Destructor
   */
  ~RNSkValueApi() {    
  }
  
  JSI_HOST_FUNCTION(createValue) {
    return jsi::Object::createFromHostObject(runtime,
      std::make_shared<RNSkValue>(_platformContext, runtime, arguments, count));
  }
  
  JSI_HOST_FUNCTION(createDerivedValue) {
    // Creation and initialization is done in two steps to be able to use weak references when setting
    // up dependencies - since weak_from_this needs our instance to be a shared_ptr before calling
    // weak_from_this().
    auto derivedValue = std::make_shared<RNSkDerivedValue>(_platformContext, runtime, arguments, count);
    derivedValue->initializeDependencies(runtime, arguments, count);
    return jsi::Object::createFromHostObject(runtime, derivedValue);
  }
  
  JSI_HOST_FUNCTION(createAnimation) {
    return jsi::Object::createFromHostObject(runtime,
      std::make_shared<RNSkAnimation>(_platformContext,
                                      runtime,
                                      arguments,
                                      count));
  }
  
  JSI_HOST_FUNCTION(createClockValue) {
    return jsi::Object::createFromHostObject(runtime,
      std::make_shared<RNSkClockValue>(_platformContext,
                                      runtime,
                                      arguments,
                                      count));
  }
  
  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkValueApi, createValue),
                       JSI_EXPORT_FUNC(RNSkValueApi, createDerivedValue),
                       JSI_EXPORT_FUNC(RNSkValueApi, createClockValue),
                       JSI_EXPORT_FUNC(RNSkValueApi, createAnimation))

private:
  // Platform context
  std::shared_ptr<RNSkPlatformContext> _platformContext;
};
} // namespace RNSkia
