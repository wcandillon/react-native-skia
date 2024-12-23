#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "JsiHostObject.h"
#include "RNSkPlatformContext.h"
#include "RNSkView.h"
#include "ViewProperty.h"
#include <jsi/jsi.h>

namespace RNSkia {
namespace jsi = facebook::jsi;

using RNSkViewInfo = struct RNSkViewInfo {
  RNSkViewInfo() { view = nullptr; }
  std::shared_ptr<RNSkView> view;
  std::unordered_map<std::string, RNJsi::ViewProperty> props;
};

class RNSkJsiViewApi : public RNJsi::JsiHostObject,
                       public std::enable_shared_from_this<RNSkJsiViewApi> {
public:
  /**
   Sets a custom property on a view given a view id. The property name/value
   will be stored in a map alongside the id of the view and propagated to the
   view when needed.
   */
  JSI_HOST_FUNCTION(setJsiProperty) {
    if (count != 3) {
      _platformContext->raiseError(
          std::string("setJsiProperty: Expected 3 arguments, got " +
                      std::to_string(count) + "."));
      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError(
          "setJsiProperty: First argument must be a number");
      return jsi::Value::undefined();
    }

    if (!arguments[1].isString()) {
      _platformContext->raiseError("setJsiProperty: Second argument must be "
                                   "the name of the property to set.");

      return jsi::Value::undefined();
    }

    auto nativeId = arguments[0].asNumber();
    std::lock_guard<std::mutex> lock(_mutex);
    auto info = getEnsuredViewInfo(nativeId);

    info->props.insert_or_assign(arguments[1].asString(runtime).utf8(runtime),
                                 RNJsi::ViewProperty(runtime, arguments[2]));

    // Now let's see if we have a view that we can update
    if (info->view != nullptr) {
      // Update view!
      info->view->setNativeId(nativeId);
      info->view->setJsiProperties(info->props);
      info->props.clear();
    }

    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(requestRedraw) {
    if (count != 1) {
      _platformContext->raiseError(
          std::string("requestRedraw: Expected 1 arguments, got " +
                      std::to_string(count) + "."));

      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError(
          "requestRedraw: First argument must be a number");

      return jsi::Value::undefined();
    }

    // find Skia View
    int nativeId = arguments[0].asNumber();
    std::lock_guard<std::mutex> lock(_mutex);
    auto info = getEnsuredViewInfo(nativeId);
    if (info->view != nullptr) {
      info->view->requestRedraw();
    }
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(makeImageSnapshot) {
    if (count < 1) {
      _platformContext->raiseError(
          std::string("makeImageSnapshot: Expected at least 1 argument, got " +
                      std::to_string(count) + "."));
      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError(
          "makeImageSnapshot: First argument must be a number");
      return jsi::Value::undefined();
    }

    // find Skia view
    int nativeId = arguments[0].asNumber();
    sk_sp<SkImage> image;
    std::shared_ptr<RNSkView> view;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      auto info = getEnsuredViewInfo(nativeId);
      view = info->view;
    }
    if (view != nullptr) {
      if (count > 1 && !arguments[1].isUndefined() && !arguments[1].isNull()) {
        auto rect = JsiSkRect::fromValue(runtime, arguments[1]);
        image = view->makeImageSnapshot(rect.get());
      } else {
        image = view->makeImageSnapshot(nullptr);
      }
      if (image == nullptr) {
        throw jsi::JSError(runtime,
                           "Could not create image from current surface.");
        return jsi::Value::undefined();
      }
      return jsi::Object::createFromHostObject(
          runtime, std::make_shared<JsiSkImage>(_platformContext, image));
    }
    throw jsi::JSError(runtime, "No Skia View currently available.");
    return jsi::Value::undefined();
  }

  JSI_HOST_FUNCTION(makeImageSnapshotAsync) {
    if (count < 1) {
      _platformContext->raiseError(std::string(
          "makeImageSnapshotAsync: Expected at least 1 argument, got " +
          std::to_string(count) + "."));
      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError(
          "makeImageSnapshot: First argument must be a number");
      return jsi::Value::undefined();
    }

    // find Skia view
    int nativeId = arguments[0].asNumber();
    std::shared_ptr<RNSkView> view;
    {
      std::lock_guard<std::mutex> lock(_mutex);
      auto info = getEnsuredViewInfo(nativeId);
      view = info->view;
    }
    auto context = _platformContext;
    auto bounds =
        count > 1 && !arguments[1].isUndefined() && !arguments[1].isNull()
            ? JsiSkRect::fromValue(runtime, arguments[1])
            : nullptr;
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [context = std::move(context), view, bounds](
                     jsi::Runtime &runtime,
                     std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
          context->runOnMainThread([&runtime, view = std::move(view),
                                    promise = std::move(promise),
                                    context = std::move(context), bounds]() {
            auto image = view->makeImageSnapshot(
                bounds == nullptr ? nullptr : bounds.get());
            context->runOnJavascriptThread(
                [&runtime, context = std::move(context),
                 promise = std::move(promise), image = std::move(image)]() {
                  if (image == nullptr) {
                    promise->reject("Failed to make snapshot from view.");
                    return;
                  }
                  promise->resolve(jsi::Object::createFromHostObject(
                      runtime, std::make_shared<JsiSkImage>(std::move(context),
                                                            std::move(image))));
                });
          });
        });
  }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkJsiViewApi, setJsiProperty),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, requestRedraw),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, makeImageSnapshotAsync),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, makeImageSnapshot))

  /**
   * Constructor
   * @param platformContext Platform context
   */
  explicit RNSkJsiViewApi(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiHostObject(), _platformContext(platformContext) {}

  /**
   Call to remove all draw view infos
   */
  void unregisterAll() {
    std::lock_guard<std::mutex> lock(_mutex);
    _viewInfos.clear();
  }

  /**
   * Registers a skia view
   * @param nativeId Id of view to register
   * @param view View to register
   */
  void registerSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto info = getEnsuredViewInfo(nativeId);
    info->view = view;
    info->view->setNativeId(nativeId);
    info->view->setJsiProperties(info->props);
    info->props.clear();
  }

  /**
   * Unregisters a Skia draw view
   * @param nativeId View id
   */
  void unregisterSkiaView(size_t nativeId) {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_viewInfos.count(nativeId) == 0) {
      return;
    }
    auto info = getEnsuredViewInfo(nativeId);

    info->view = nullptr;
    _viewInfos.erase(nativeId);
  }

  /**
   Sets a skia draw view for the given id. This function can be used
   to mark that an underlying SkiaView is not available (it could be
   removed due to ex. a transition). The view can be set to a nullptr
   or a valid view, effectively toggling the view's availability.
   */
  void setSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto info = getEnsuredViewInfo(nativeId);
    if (view != nullptr) {
      info->view = view;
      info->view->setNativeId(nativeId);
      info->view->setJsiProperties(info->props);
      info->props.clear();
    } else if (view == nullptr) {
      info->view = view;
    }
  }

private:
  /**
   * Creates or returns the callback info object for the given view
   * @param nativeId View id
   * @return The callback info object for the requested view
   */
  RNSkViewInfo *getEnsuredViewInfo(size_t nativeId) {
    if (_viewInfos.count(nativeId) == 0) {
      RNSkViewInfo info;
      _viewInfos.emplace(nativeId, info);
    }
    return &_viewInfos.at(nativeId);
  }

  std::unordered_map<size_t, RNSkViewInfo> _viewInfos;
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::mutex _mutex;
};
} // namespace RNSkia
