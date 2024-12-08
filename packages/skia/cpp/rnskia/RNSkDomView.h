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

#include "JsiDomRenderNode.h"
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
class JsiSkCanvas;
namespace jsi = facebook::jsi;

class RNSkDomRenderer : public RNSkRenderer,
                        public std::enable_shared_from_this<RNSkDomRenderer> {
public:
  RNSkDomRenderer(std::function<void()> requestRedraw,
                  std::shared_ptr<RNSkPlatformContext> context);

  ~RNSkDomRenderer();

  void
  renderImmediate(std::shared_ptr<RNSkCanvasProvider> canvasProvider) override;

  void setRoot(std::shared_ptr<JsiDomRenderNode> node);

private:
  void renderCanvas(SkCanvas *canvas, float scaledWidth, float scaledHeight);
  void renderDebugOverlays(SkCanvas *canvas);

  std::shared_ptr<RNSkPlatformContext> _platformContext;

  std::shared_ptr<std::timed_mutex> _renderLock;

  std::shared_ptr<JsiDomRenderNode> _root;
  std::shared_ptr<DrawingContext> _drawingContext;

  RNSkTimingInfo _renderTimingInfo;

  std::mutex _rootLock;
};

class RNSkDomView : public RNSkView {
public:
  /**
   * Constructor
   */
  RNSkDomView(std::shared_ptr<RNSkPlatformContext> context,
              std::shared_ptr<RNSkCanvasProvider> canvasProvider)
      : RNSkView(context, canvasProvider,
                 std::make_shared<RNSkDomRenderer>(
                     std::bind(&RNSkView::requestRedraw, this), context)) {}

  void setJsiProperties(
      std::unordered_map<std::string, ViewProperty> &props) override {

    for (auto &prop : props) {
      if (prop.first == "root") {
        // Save root
        if (prop.second.isNull()) {
          std::static_pointer_cast<RNSkDomRenderer>(getRenderer())
              ->setRoot(nullptr);
        } else {
          std::static_pointer_cast<RNSkDomRenderer>(getRenderer())
              ->setRoot(prop.second.getDomRenderNode());
        }

        // Request redraw
        requestRedraw();
      }
    }
  }
};
} // namespace RNSkia
