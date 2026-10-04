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

class Recorder;

/**
 * Draws either an SkPicture (imperative API, or a recording without shared
 * values, played once into a picture) or a Recorder (declarative <Canvas>
 * driven by Reanimated shared values). The recorder is owned by the
 * renderer, not by a JS wrapper: its commands hold every native resource the
 * canvas draws (images, pictures, paths), and tying their lifetime to the
 * garbage collector of a runtime that rarely allocates (the UI runtime) kept
 * them resident long after unmount. Here they are released as soon as the
 * recorder is replaced, or when the host view is torn down (see clear()).
 *
 * Threading: setPicture/setRecorder run on the JS thread (React commit),
 * applyUpdates on the UI thread (Reanimated mapper), drawInto on the main
 * thread (onscreen draws) or the JS thread (snapshots). _mutex only guards
 * the two pointers, so a commit never waits for a draw; the recorder
 * serializes its replay against its updates on its own.
 */
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

  void setPicture(sk_sp<SkPicture> picture) {
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _picture = picture;
      _recorder = nullptr;
    }
    _requestRedraw();
  }

  /**
   * Takes ownership of a recorder. A recording without shared values is
   * played once into a picture here (and its commands released): nothing
   * will ever update it, and drawing a picture on every redraw (resize,
   * foreground, ref.redraw(), snapshots) is cheaper than replaying commands.
   * The previous recorder (and the resources its commands reference) is
   * released here; Recorder's destructor moves the commands to the main
   * thread before destroying them so GPU-backed resources are freed on the
   * thread that used them. The initial redraw can be deferred until the
   * first shared-value update.
   */
  void setRecorder(std::shared_ptr<Recorder> recorder,
                   bool requestRedraw = true);

  /**
   * Drops the recorder and the picture without scheduling a redraw. Called
   * when the host view is torn down, so that the resources go away with the
   * view rather than with the garbage collection of its host object (on
   * Android the native view is only destroyed when the Java view is
   * finalized).
   */
  void clear() {
    std::shared_ptr<Recorder> retired;
    sk_sp<SkPicture> picture;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      retired = std::move(_recorder);
      picture = std::move(_picture);
    }
    // Both are destroyed here, outside the lock.
  }

  /**
   * Reads the shared values on the calling runtime into the recorder's
   * commands. Returns false when there is no recorder to update, or when the
   * view holds a different recording than recorderId (a stale mapper whose
   * values would otherwise land in the new recording's slots).
   */
  bool applyUpdates(jsi::Runtime &runtime, double recorderId,
                    const jsi::Array &values);

  /**
   * Same as applyUpdates(), for a recording that no view owns yet (one
   * queued in the view registry until its view registers).
   */
  static bool applyUpdatesTo(const std::shared_ptr<Recorder> &recorder,
                             jsi::Runtime &runtime, double recorderId,
                             const jsi::Array &values);

  /**
   * Draws the current content (recorder or picture) into the canvas, scaled
   * by the pixel density. Used for onscreen draws, snapshots and the Android
   * bitmap export.
   */
  void drawInto(SkCanvas *canvas, float pixelDensity) {
    // Copy the content under the lock and draw from the copies: a React
    // commit swapping the content must only ever wait for a pointer swap,
    // never for a draw. If the recorder is replaced mid-draw, this frame
    // finishes with the old one and the swap schedules the next frame.
    std::shared_ptr<Recorder> recorder;
    sk_sp<SkPicture> picture;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      recorder = _recorder;
      picture = _picture;
    }
    canvas->clear(SK_ColorTRANSPARENT);
    canvas->save();
    canvas->scale(pixelDensity, pixelDensity);
    if (recorder != nullptr) {
      replay(canvas, recorder.get());
    } else if (picture != nullptr) {
      canvas->drawPicture(picture);
    }
    canvas->restore();
  }

private:
  void replay(SkCanvas *canvas, Recorder *recorder);

  bool performDraw(std::shared_ptr<RNSkCanvasProvider> canvasProvider) {
    auto pd = _platformContext->getPixelDensity();
    return canvasProvider->renderToCanvas(
        [this, pd](SkCanvas *canvas) { drawInto(canvas, pd); });
  }

  std::shared_ptr<RNSkPlatformContext> _platformContext;
  mutable std::mutex _mutex;
  sk_sp<SkPicture> _picture;
  std::shared_ptr<Recorder> _recorder;
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
      std::unordered_map<std::string, RNJsi::ViewProperty> &props,
      bool requestRecorderRedraw = true) override {
    auto renderer =
        std::static_pointer_cast<RNSkPictureRenderer>(getRenderer());
    for (auto &prop : props) {
      if (prop.first == "picture") {
        renderer->setPicture(prop.second.isPicture() ? prop.second.getPicture()
                                                     : nullptr);
      } else if (prop.first == "recorder") {
        renderer->setRecorder(
            prop.second.isRecorder() ? prop.second.getRecorder() : nullptr,
            requestRecorderRedraw);
      }
    }
  }
};
} // namespace RNSkia
