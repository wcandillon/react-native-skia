#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkHostObjects.h"
#include "JsiTextureInfo.h"

#include "JsiSkCanvas.h"
#include "JsiSkImage.h"

#if defined(SK_GRAPHITE)
#include "DawnContext.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkSurface.h"
#include "include/gpu/ganesh/GrDirectContext.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkSurface : public JsiSkWrappingSkPtrHostObject<SkSurface> {
public:
  JsiSkSurface(std::shared_ptr<RNSkPlatformContext> context,
               sk_sp<SkSurface> surface)
      : JsiSkWrappingSkPtrHostObject<SkSurface>(std::move(context),
                                                std::move(surface)) {}

  EXPORT_JSI_API_TYPENAME(JsiSkSurface, Surface)

  // TODO-API: Properties?
  JSI_HOST_FUNCTION(width) { return static_cast<double>(getObject()->width()); }
  JSI_HOST_FUNCTION(height) {
    return static_cast<double>(getObject()->height());
  }

  JSI_HOST_FUNCTION(getCanvas) {
    return jsi::Object::createFromHostObject(
        runtime,
        std::make_shared<JsiSkCanvas>(getContext(), getObject()->getCanvas()));
  }

  JSI_HOST_FUNCTION(flush) {
    auto surface = getObject();
#if defined(SK_GRAPHITE)
    auto recording = surface->recorder()->snap();
    DawnContext::getInstance().submitRecording(recording.get());
#else
    if (auto dContext = GrAsDirectContext(surface->recordingContext())) {
      dContext->flushAndSubmit();
    }
#endif
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(makeImageSnapshot) {
    auto surface = getObject();
    sk_sp<SkImage> image;
    if (count == 1) {
      auto rect = JsiSkRect::fromValue(runtime, arguments[0]);
      image = surface->makeImageSnapshot(SkIRect::MakeXYWH(
          rect->x(), rect->y(), rect->width(), rect->height()));
    } else {
      image = surface->makeImageSnapshot();
    }
#if defined(SK_GRAPHITE)
    auto recording = surface->recorder()->snap();
    DawnContext::getInstance().submitRecording(recording.get());
#endif
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiSkImage>(getContext(), std::move(image)));
  }

  JSI_HOST_FUNCTION(getNativeTextureUnstable) {
    auto texInfo = getContext()->getTexture(getObject());
    return JsiTextureInfo::toValue(runtime, texInfo);
  }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(JsiSkSurface, width),
                       JSI_EXPORT_FUNC(JsiSkSurface, height),
                       JSI_EXPORT_FUNC(JsiSkSurface, getCanvas),
                       JSI_EXPORT_FUNC(JsiSkSurface, makeImageSnapshot),
                       JSI_EXPORT_FUNC(JsiSkSurface, flush),
                       JSI_EXPORT_FUNC(JsiSkSurface, getNativeTextureUnstable),
                       JSI_EXPORT_FUNC(JsiSkSurface, dispose))
};

} // namespace RNSkia
