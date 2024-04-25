#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "JsiHostObject.h"
#include "JsiValueWrapper.h"
#include "RNSkPlatformContext.h"
#include "RNSkView.h"
#include <jsi/jsi.h>

namespace RNSkia {
namespace jsi = facebook::jsi;

using RNSkViewInfo = struct RNSkViewInfo {
  RNSkViewInfo() { view = nullptr; }
  std::shared_ptr<RNSkView> view;
  std::unordered_map<std::string, RNJsi::JsiValueWrapper> props;
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
    auto info = getEnsuredViewInfo(nativeId);

    std::lock_guard<std::mutex> lock(_mutex);
    info->props.insert_or_assign(arguments[1].asString(runtime).utf8(runtime),
                                 RNJsi::JsiValueWrapper(runtime, arguments[2]));

    // Now let's see if we have a view that we can update
    if (info->view != nullptr) {
      // Update view!
      info->view->setNativeId(nativeId);
      info->view->setJsiProperties(info->props);
      info->props.clear();
    }

    return jsi::Value::undefined();
  }

  /**
   Calls a custom command / method on a view by the view id.
   */
  JSI_HOST_FUNCTION(callJsiMethod) {
    if (count < 2) {
      _platformContext->raiseError(
          std::string("callCustomCommand: Expected at least 2 arguments, got " +
                      std::to_string(count) + "."));

      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError(
          "callCustomCommand: First argument must be a number");

      return jsi::Value::undefined();
    }

    if (!arguments[1].isString()) {
      _platformContext->raiseError("callCustomCommand: Second argument must be "
                                   "the name of the action to call.");

      return jsi::Value::undefined();
    }

    auto nativeId = arguments[0].asNumber();
    auto action = arguments[1].asString(runtime).utf8(runtime);

    auto info = getEnsuredViewInfo(nativeId);

    if (info->view == nullptr) {
      throw jsi::JSError(
          runtime, std::string("callCustomCommand: Could not call action " +
                               action + " on view - view not ready.")
                       .c_str());

      return jsi::Value::undefined();
    }

    // Get arguments
    size_t paramsCount = count - 2;
    const jsi::Value *params = paramsCount > 0 ? &arguments[2] : nullptr;
    return info->view->callJsiMethod(runtime, action, params, paramsCount);
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
    auto info = getEnsuredViewInfo(nativeId);
    if (info->view != nullptr) {
      if (count > 1 && !arguments[1].isUndefined() && !arguments[1].isNull()) {
        auto rect = JsiSkRect::fromValue(runtime, arguments[1]);
        image = info->view->makeImageSnapshot(rect.get());
      } else {
        image = info->view->makeImageSnapshot(nullptr);
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
    auto info = getEnsuredViewInfo(nativeId);
    auto context = _platformContext;
    auto bounds =
        count > 1 && !arguments[1].isUndefined() && !arguments[1].isNull()
            ? JsiSkRect::fromValue(runtime, arguments[1])
            : nullptr;
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime, [context = std::move(context), info, bounds](
                     jsi::Runtime &runtime,
                     std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
          context->runOnMainThread([&runtime, info = std::move(info),
                                    promise = std::move(promise),
                                    context = std::move(context), bounds]() {
            auto image = info->view->makeImageSnapshot(
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

  JSI_HOST_FUNCTION(getWGPUContext) {
    int nativeId = arguments[0].asNumber();
    auto info = getEnsuredViewInfo(nativeId);
    auto descriptor = _platformContext->getSurfaceDescriptor(nativeId);
    if (descriptor.get() == nullptr) {
      throw jsi::JSError(runtime, "No WGPU context available for view.");
      return jsi::Value::undefined();
    }
    
    return jsi::Value::null();
  }

  JSI_EXPORT_FUNCTIONS(JSI_EXPORT_FUNC(RNSkJsiViewApi, setJsiProperty),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, callJsiMethod),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, requestRedraw),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, makeImageSnapshotAsync),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, makeImageSnapshot),
                       JSI_EXPORT_FUNC(RNSkJsiViewApi, getWGPUContext))

  /**
   * Constructor
   * @param platformContext Platform context
   */
  explicit RNSkJsiViewApi(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiHostObject(), _platformContext(platformContext) {}

  /**
   * Invalidates the Skia View Api object
   */
  void invalidate() { unregisterAll(); }

  /**
   Call to remove all draw view infos
   */
  void unregisterAll() {
    // Unregister all views
    auto tempList = _viewInfos;
    for (const auto &info : tempList) {
      unregisterSkiaView(info.first);
    }
    std::lock_guard<std::mutex> lock(_mutex);
    _viewInfos.clear();
  }

  /**
   * Registers a skia view
   * @param nativeId Id of view to register
   * @param view View to register
   */
  void registerSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
    auto info = getEnsuredViewInfo(nativeId);
    std::lock_guard<std::mutex> lock(_mutex);
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
    if (_viewInfos.count(nativeId) == 0) {
      return;
    }
    auto info = getEnsuredViewInfo(nativeId);

    std::lock_guard<std::mutex> lock(_mutex);
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
    if (_viewInfos.find(nativeId) == _viewInfos.end()) {
      return;
    }
    auto info = getEnsuredViewInfo(nativeId);
    std::lock_guard<std::mutex> lock(_mutex);
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
      std::lock_guard<std::mutex> lock(_mutex);
      _viewInfos.emplace(nativeId, info);
    }
    return &_viewInfos.at(nativeId);
  }

  std::unordered_map<size_t, RNSkViewInfo> _viewInfos;
  std::shared_ptr<RNSkPlatformContext> _platformContext;
  std::mutex _mutex;
};
} // namespace RNSkia
