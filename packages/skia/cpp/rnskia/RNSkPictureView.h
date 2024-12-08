#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include <jsi/jsi.h>

#include "RNSkView.h"
#include "ViewProperty.h"

#include "JsiSkPicture.h"
#include "RNSkLog.h"
#include "RNSkPlatformContext.h"
#include "RNSkTimingInfo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBBHFactory.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkPictureRecorder.h"

#pragma clang diagnostic pop

class SkPicture;
class SkRect;
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

  void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) override {
    performDraw(canvasProvider);
  }

  void setPicture(sk_sp<SkPicture> picture) {
    _picture = picture;
    _requestRedraw();
  }

private:
  bool performDraw(std::shared_ptr<RNSkCanvasProvider> canvasProvider) {
    return canvasProvider->renderToCanvas([=](SkCanvas *canvas) {
      // Make sure to scale correctly
      auto pd = _platformContext->getPixelDensity();
      canvas->clear(SK_ColorTRANSPARENT);
      canvas->save();
      canvas->scale(pd, pd);
      if (_picture != nullptr) {
        canvas->drawPicture(_picture);
      }
      canvas->restore();
    });
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
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

    for (auto &prop : props) {
      if (prop.first == "picture") {
        if (prop.second.isNull()) {
          // Clear picture
          std::static_pointer_cast<RNSkPictureRenderer>(getRenderer())
              ->setPicture(nullptr);
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
