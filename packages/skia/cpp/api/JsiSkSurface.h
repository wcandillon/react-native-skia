#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkDispatcher.h"
#include "JsiSkHostObjects.h"
#include "JsiTextureInfo.h"

#include "JsiSkCanvas.h"
#include "JsiSkImage.h"
#include "JsiSkRect.h"

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkImageInfo.h"
#include "include/core/SkSurface.h"
#include "include/gpu/ganesh/GrDirectContext.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkSurface : public JsiSkWrappingSkPtrHostObject<SkSurface> {
private:
  std::shared_ptr<Dispatcher> _dispatcher;

public:
  JsiSkSurface(std::shared_ptr<RNSkPlatformContext> context,
               sk_sp<SkSurface> surface)
      : JsiSkWrappingSkPtrHostObject<SkSurface>(std::move(context),
                                                std::move(surface)) {
    // Get the dispatcher for the current thread
    _dispatcher = Dispatcher::getDispatcher();
    // Process any pending operations
    _dispatcher->processQueue();
  }

  ~JsiSkSurface() override {
    // Queue deletion on the creation thread if needed
    auto surface = getObject();
    if (surface && _dispatcher) {
      _dispatcher->run([surface]() {
        // Surface will be deleted when this lambda is destroyed
      });
    }
    // Clear the object to prevent base class destructor from deleting it
    setObject(nullptr);
  }

  EXPORT_JSI_API_TYPENAME(JsiSkSurface, Surface)

  // TODO-API: Properties?
  JSI_HOST_FUNCTION(width) { return static_cast<double>(getObject()->width()); }
  JSI_HOST_FUNCTION(height) {
    return static_cast<double>(getObject()->height());
  }

  JSI_HOST_FUNCTION(getCanvas) {
    auto canvas =
        std::make_shared<JsiSkCanvas>(getContext(), getObject()->getCanvas());
    return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(runtime, canvas,
                                                       getContext());
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
    if (count > 0 && arguments[0].isObject()) {
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
    if (count > 1 && arguments[1].isObject()) {
      auto jsiImage =
          arguments[1].asObject(runtime).asHostObject<JsiSkImage>(runtime);
      jsiImage->setObject(image);
      return jsi::Value(runtime, arguments[1]);
    }
    auto hostObjectInstance =
        std::make_shared<JsiSkImage>(getContext(), std::move(image));
    return JSI_CREATE_HOST_OBJECT_WITH_MEMORY_PRESSURE(
        runtime, hostObjectInstance, getContext());
  }

  JSI_HOST_FUNCTION(getNativeTextureUnstable) {
    auto texInfo = getContext()->getTexture(getObject());
    return JsiTextureInfo::toValue(runtime, texInfo);
  }

  size_t getMemoryPressure() const override {
    auto surface = getObject();
    if (!surface)
      return 0;

    // Get the actual imageInfo from the surface to determine exact pixel format
    auto info = surface->imageInfo();
    size_t baseSize = info.computeMinByteSize();

    // Check if this is a GPU-backed surface
    if (surface->recordingContext()) {
      // GPU surfaces have significant additional overhead:
      // - Texture memory alignment and padding (~10-15%)
      // - Render target attachments (color, depth, stencil)
      // - Command buffer allocations
      // - Driver overhead
      baseSize = static_cast<size_t>(baseSize * 1.25);

      // Check for multisampling (MSAA)
      // Note: We can't directly query sample count from here, but we can
      // estimate based on the surface props if available
      // MSAA can multiply memory usage by the sample count (2x, 4x, 8x, etc.)
      // Conservative estimate: add 50% for potential MSAA overhead
      auto props = surface->props();
      if (props.isUseDeviceIndependentFonts()) {
        // This is a proxy for higher quality rendering that might use MSAA
        baseSize = static_cast<size_t>(baseSize * 1.5);
      }
    } else {
      // Raster surfaces have minimal overhead beyond pixel data
      // Add ~5% for SkSurface object overhead and row padding
      baseSize = static_cast<size_t>(baseSize * 1.05);
    }

    // Account for potential backing store or cache
    // Surfaces often maintain a cached image snapshot
    if (surface->getCanvas() && surface->getCanvas()->getSaveCount() > 1) {
      // If there are active save layers, add overhead for layer buffers
      baseSize = static_cast<size_t>(baseSize * 1.1);
    }

    return baseSize;
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
