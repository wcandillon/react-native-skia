#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkView.h"
#include "jsi/ViewProperty.h"

#include "RNSkPlatformContext.h"
#include "api/JsiSkPicture.h"
#include "utils/RNSkLog.h"
#include "utils/RNSkTimingInfo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBBHFactory.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkPictureRecorder.h"

#pragma clang diagnostic pop

class SkPicture;
struct SkRect;
class SkImage;

namespace RNSkia {

namespace jsi = facebook::jsi;

class RNSkPictureRenderer
    : public RNSkRenderer,
      public std::enable_shared_from_this<RNSkPictureRenderer> {
public:
  RNSkPictureRenderer(std::function<void()> requestRedraw,
                      std::shared_ptr<RNSkPlatformContext> context)
      : RNSkRenderer(std::move(requestRedraw)),
        _platformContext(std::move(context)) {}

  virtual ~RNSkPictureRenderer() = default;

  void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) override {
    performDraw(canvasProvider);
  }

  // The picture is set from any thread (JS, a worklet, a producer thread)
  // and read on the render thread: the handoff is under a mutex so the
  // refcount of the previous picture is never torn.
  void setPicture(sk_sp<SkPicture> picture) {
    {
      std::lock_guard<std::mutex> lock(_pictureMutex);
      _picture = std::move(picture);
    }
    _requestRedraw();
  }

  sk_sp<SkPicture> getPicture() const {
    std::lock_guard<std::mutex> lock(_pictureMutex);
    return _picture;
  }

private:
  bool performDraw(std::shared_ptr<RNSkCanvasProvider> canvasProvider) {
    // A copy under the lock: _picture can be replaced from another thread
    // while we draw.
    sk_sp<SkPicture> picture = getPicture();
    auto pd = _platformContext->getPixelDensity();
    bool presented = canvasProvider->renderToCanvas([=](SkCanvas *canvas) {
      canvas->clear(SK_ColorTRANSPARENT);
      canvas->save();
      canvas->scale(pd, pd);
      if (picture != nullptr) {
        canvas->drawPicture(picture);
      }
      canvas->restore();
    });
    if (presented) {
      notePresented();
    }
    return presented;
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
  mutable std::mutex _pictureMutex;
  sk_sp<SkPicture> _picture;
};

class RNSkPictureView : public RNSkView {
public:
  /**
   * Constructor
   */
  RNSkPictureView(std::shared_ptr<RNSkPlatformContext> context,
                  std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : RNSkView(
            context, canvasProvider,
            std::make_shared<RNSkPictureRenderer>(
                std::bind(&RNSkPictureView::requestRedraw, this), context)) {}

  void setJsiProperties(
      std::unordered_map<std::string, RNJsi::ViewProperty> &props) override {
    // Base implementation
    for (auto &prop : props) {
      if (prop.first == "picture") {
        if (prop.second.isNull()) {
          // Clear picture
          std::static_pointer_cast<RNSkPictureRenderer>(getRenderer())
              ->setPicture(nullptr);
          continue;
        }
        if (!prop.second.isPicture()) {
          continue;
        }
        // Save picture
        std::static_pointer_cast<RNSkPictureRenderer>(getRenderer())
            ->setPicture(prop.second.getPicture());
      }
    }
  }
};
} // namespace RNSkia
