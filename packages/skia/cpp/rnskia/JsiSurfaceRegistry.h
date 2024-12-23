#pragma once

#include <memory>

#include "JsiHostObject.h"
#include "RNSkPlatformContext.h"

#include <jsi/jsi.h>

namespace jsi = facebook::jsi;

namespace RNSkia {

class JsiSurfaceRegistry : public RNJsi::JsiHostObject  {
public:
  explicit JsiSurfaceRegistry(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiHostObject(), _platformContext(platformContext) {}

private:
  std::shared_ptr<RNSkPlatformContext> _platformContext;

};
} // namespace RNSkia
