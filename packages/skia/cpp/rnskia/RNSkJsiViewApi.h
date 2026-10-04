#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include "RNSkPictureView.h"
#include "RNSkPlatformContext.h"
#include "RNSkView.h"
#include "api/JsiSkNativeObjects.h"
#include "jsi/JsiPromises.h"
#include "jsi/ViewProperty.h"
#include <jsi/jsi.h>

#if defined(SK_GRAPHITE)
#include "RNSkGraphiteView.h"
#include "api/JsiSkGraphiteContext.h"
#endif

namespace RNSkia {

namespace jsi = facebook::jsi;

using RNSkViewInfo = struct RNSkViewInfo {
  RNSkViewInfo() { view = nullptr; }
  std::shared_ptr<RNSkView> view;
  std::unordered_map<std::string, RNJsi::ViewProperty> props;
  bool requestRecorderRedraw = true;
};

class ViewRegistry {
public:
  static ViewRegistry &getInstance() {
    static ViewRegistry instance;
    return instance;
  }

  ViewRegistry(const ViewRegistry &) = delete;
  ViewRegistry &operator=(const ViewRegistry &) = delete;

  void removeViewInfo(size_t id) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    _registry.erase(id);
    // Remember that this id was explicitly unregistered. Property updates
    // can arrive after unregistration (e.g. a Reanimated worklet setting the
    // picture racing with unmount); without a tombstone they would recreate
    // the entry and its props (an SkPicture retaining every image it draws)
    // would stay in this global registry forever.
    _unregistered.insert(id);
  }

  // Execute a function while holding the registry lock.
  // When `revive` is true (registration paths), a previously unregistered id
  // becomes valid again; otherwise calls for unregistered ids receive a
  // transient info object that is not stored in the registry.
  template <typename F>
  auto withViewInfo(size_t id, F &&func, bool revive = false)
      -> decltype(func(std::shared_ptr<RNSkViewInfo>())) {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    if (revive) {
      _unregistered.erase(id);
    }
    auto it = _registry.find(id);
    std::shared_ptr<RNSkViewInfo> info;
    if (it != _registry.end()) {
      info = it->second;
    } else {
      info = std::make_shared<RNSkViewInfo>();
      if (_unregistered.find(id) == _unregistered.end()) {
        _registry[id] = info;
      }
    }
    return func(info);
  }

  // Runs func on an existing entry under the registry's shared lock. Unlike
  // withViewInfo(), this never creates an entry: func is not called for an
  // unknown id. Other readers may hold the entry at the same time, so func
  // must not modify it; the objects its props reference may be modified
  // under their own lock.
  template <typename F> void withExistingViewInfo(size_t id, F &&func) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    if (it != _registry.end()) {
      func(it->second);
    }
  }

  // Read-only lookup: never creates a registry entry.
  std::shared_ptr<RNSkView> getView(size_t id) {
    std::shared_lock<std::shared_mutex> lock(_mutex);
    auto it = _registry.find(id);
    return it != _registry.end() ? it->second->view : nullptr;
  }

  void clear() {
    std::unique_lock<std::shared_mutex> lock(_mutex);
    _registry.clear();
    _unregistered.clear();
  }

private:
  ViewRegistry() = default;
  mutable std::shared_mutex _mutex;
  std::unordered_map<size_t, std::shared_ptr<RNSkViewInfo>> _registry;
  std::unordered_set<size_t> _unregistered;
};

class RNSkJsiViewApi : public JsiSkNativeObject<RNSkJsiViewApi> {
public:
  static constexpr const char *CLASS_NAME = "ViewApi";

  /**
   Sets a custom property on a view given a view id. The property name/value
   will be stored in a map alongside the id of the view and propagated to the
   view when needed. An optional fourth boolean defers a recorder's initial
   redraw until its shared values are applied.
   */
  JSI_HOST_FUNCTION(setJsiProperty) {
    if (count != 3 && count != 4) {
      _platformContext->raiseError(
          std::string("setJsiProperty: Expected 3 or 4 arguments, got " +
                      std::to_string(count) + "."));
      return jsi::Value::undefined();
    }
    if (count == 4 && !arguments[3].isBool()) {
      _platformContext->raiseError(
          "setJsiProperty: Fourth argument must be a boolean");
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
    auto requestRecorderRedraw = count != 4 || arguments[3].getBool();

    // Safely execute operations while holding the registry lock
    ViewRegistry::getInstance().withViewInfo(
        nativeId, [&](std::shared_ptr<RNSkViewInfo> info) {
          auto name = arguments[1].asString(runtime).utf8(runtime);
          info->props.insert_or_assign(
              name, RNJsi::ViewProperty(runtime, arguments[2]));
          if (name == "recorder") {
            info->requestRecorderRedraw = requestRecorderRedraw;
          }
          // Now let's see if we have a view that we can update
          if (info->view != nullptr) {
            // Update view!
            info->view->setNativeId(nativeId);
            info->view->setJsiProperties(info->props,
                                         info->requestRecorderRedraw);
            info->props.clear();
            info->requestRecorderRedraw = true;
          }
          return nullptr; // Return type for template deduction
        });

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
    auto view = ViewRegistry::getInstance().getView(nativeId);
    if (view != nullptr) {
      view->requestRedraw();
    }
    return jsi::Value::undefined();
  }

  /**
   Reads the given shared values into the recording held for the view and
   schedules a redraw. Called from the Reanimated mapper on every frame; the
   only things crossing runtimes are the view id, the recording id and the
   shared values. The recording is either owned by the view or, until the
   view registers, queued for it in the registry. Updates for a recording
   that is neither (a stale mapper, a view that has been torn down) are
   ignored.
   */
  JSI_HOST_FUNCTION(applyUpdates) {
    if (count != 3 || !arguments[0].isNumber() || !arguments[1].isNumber() ||
        !arguments[2].isObject() ||
        !arguments[2].asObject(runtime).isArray(runtime)) {
      _platformContext->raiseError(
          "applyUpdates: expected (nativeId: number, recorderId: number, "
          "values: SharedValue[])");
      return jsi::Value::undefined();
    }
    int nativeId = arguments[0].asNumber();
    auto recorderId = arguments[1].asNumber();
    auto values = arguments[2].asObject(runtime).asArray(runtime);
    std::shared_ptr<RNSkView> view;
    ViewRegistry::getInstance().withExistingViewInfo(
        nativeId, [&](const std::shared_ptr<RNSkViewInfo> &info) {
          view = info->view;
          if (view != nullptr) {
            return;
          }
          // The view has not registered yet (or is detached, which on iOS
          // destroys it): the recording waits in the registry and is drawn,
          // with whatever values it holds by then, once a view registers.
          // Keep it current, under the registry lock so that a registration
          // cannot slip in between; the first frame would otherwise show
          // the values from recording time until the next change.
          auto it = info->props.find("recorder");
          if (it != info->props.end() && it->second.isRecorder()) {
            RNSkPictureRenderer::applyUpdatesTo(it->second.getRecorder(),
                                                runtime, recorderId, values);
          }
        });
    if (view == nullptr) {
      return jsi::Value::undefined();
    }
    // Outside the registry lock: the update must not hold up the commits
    // and registrations of other views.
    auto renderer =
        std::static_pointer_cast<RNSkPictureRenderer>(view->getRenderer());
    if (renderer->applyUpdates(runtime, recorderId, values)) {
      view->requestRedraw();
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
    std::shared_ptr<RNSkView> view =
        ViewRegistry::getInstance().getView(nativeId);
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
      return makeJsiObject(
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
    std::shared_ptr<RNSkView> view =
        ViewRegistry::getInstance().getView(nativeId);
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
                  promise->resolve(makeJsiObject(
                      runtime, std::make_shared<JsiSkImage>(std::move(context),
                                                            std::move(image))));
                });
          });
        });
  }

  JSI_HOST_FUNCTION(size) {
    if (count != 1) {
      _platformContext->raiseError(std::string(
          "size: Expected 1 argument, got " + std::to_string(count) + "."));
      return jsi::Value::undefined();
    }

    if (!arguments[0].isNumber()) {
      _platformContext->raiseError("size: First argument must be a number");
      return jsi::Value::undefined();
    }

    // find Skia View
    int nativeId = arguments[0].asNumber();
    std::shared_ptr<RNSkView> view =
        ViewRegistry::getInstance().getView(nativeId);
    if (view != nullptr) {
      auto pixelDensity = _platformContext->getPixelDensity();
      auto sizeObj = jsi::Object(runtime);
      sizeObj.setProperty(runtime, "width",
                          view->getScaledWidth() / pixelDensity);
      sizeObj.setProperty(runtime, "height",
                          view->getScaledHeight() / pixelDensity);
      return sizeObj;
    }

    // Return default size if view not found
    auto sizeObj = jsi::Object(runtime);
    sizeObj.setProperty(runtime, "width", 0);
    sizeObj.setProperty(runtime, "height", 0);
    return sizeObj;
  }

  /**
   Returns the recording side of a SkiaGraphiteView: (nativeId, width,
   height, opaque, highBitDepth), the size in points as laid out and the
   props the surface format follows from. The view may not exist yet; the
   context binds to it by id when it does.
   */
  JSI_HOST_FUNCTION(makeGraphiteContext) {
#if defined(SK_GRAPHITE)
    if (count < 3 || !arguments[0].isNumber() || !arguments[1].isNumber() ||
        !arguments[2].isNumber()) {
      throw jsi::JSError(runtime, "makeGraphiteContext: expected (nativeId, "
                                  "width, height, opaque, highBitDepth)");
    }
    auto nativeId = static_cast<size_t>(arguments[0].asNumber());
    auto width = static_cast<float>(arguments[1].asNumber());
    auto height = static_cast<float>(arguments[2].asNumber());
    bool opaque = count > 3 && arguments[3].isBool() && arguments[3].getBool();
    bool highBitDepth =
        count > 4 && arguments[4].isBool() && arguments[4].getBool();
    auto target = RNSkGraphiteTargetRegistry::getInstance().getOrCreate(
        nativeId, _platformContext);
    target->setLayout(width, height, opaque, highBitDepth);
    return makeJsiObject(runtime, std::make_shared<JsiSkGraphiteContext>(
                                      _platformContext, std::move(target)));
#else
    throw jsi::JSError(runtime,
                       "SkiaGraphiteView requires the Graphite backend. "
                       "Rebuild with SK_GRAPHITE enabled.");
#endif
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "setJsiProperty",
                      &RNSkJsiViewApi::setJsiProperty);
    installHostMethod(runtime, prototype, "requestRedraw",
                      &RNSkJsiViewApi::requestRedraw);
    installHostMethod(runtime, prototype, "applyUpdates",
                      &RNSkJsiViewApi::applyUpdates);
    installHostMethod(runtime, prototype, "makeImageSnapshotAsync",
                      &RNSkJsiViewApi::makeImageSnapshotAsync);
    installHostMethod(runtime, prototype, "makeImageSnapshot",
                      &RNSkJsiViewApi::makeImageSnapshot);
    installHostMethod(runtime, prototype, "size", &RNSkJsiViewApi::size);
    installHostMethod(runtime, prototype, "makeGraphiteContext",
                      &RNSkJsiViewApi::makeGraphiteContext);
  }

  /**
   * Constructor
   * @param platformContext Platform context
   */
  explicit RNSkJsiViewApi(std::shared_ptr<RNSkPlatformContext> platformContext)
      : JsiSkNativeObject<RNSkJsiViewApi>(platformContext),
        _platformContext(platformContext) {}

  /**
   Call to remove all draw view infos
   */
  void unregisterAll() { ViewRegistry::getInstance().clear(); }

  /**
   * Registers a skia view
   * @param nativeId Id of view to register
   * @param view View to register
   */
  void registerSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
    ViewRegistry::getInstance().withViewInfo(
        nativeId,
        [&](std::shared_ptr<RNSkViewInfo> info) {
          info->view = view;
          info->view->setNativeId(nativeId);

          info->view->setJsiProperties(info->props,
                                       info->requestRecorderRedraw);
          info->props.clear();
          info->requestRecorderRedraw = true;

          return nullptr;
        },
        /* revive= */ true);
  }

  /**
   * Unregisters a Skia draw view
   * @param nativeId View id
   */
  void unregisterSkiaView(size_t nativeId) {
    ViewRegistry::getInstance().removeViewInfo(nativeId);
  }

  /**
   Sets a skia draw view for the given id. This function can be used
   to mark that an underlying SkiaView is not available (it could be
   removed due to ex. a transition). The view can be set to a nullptr
   or a valid view, effectively toggling the view's availability.
   */
  void setSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
    ViewRegistry::getInstance().withViewInfo(
        nativeId,
        [&](std::shared_ptr<RNSkViewInfo> info) {
          if (view != nullptr) {
            info->view = view;
            info->view->setNativeId(nativeId);
            info->view->setJsiProperties(info->props,
                                         info->requestRecorderRedraw);
            info->props.clear();
            info->requestRecorderRedraw = true;
          } else {
            info->view = view; // Set to nullptr
          }
          return nullptr;
        },
        /* revive= */ view != nullptr);
  }

private:
  std::shared_ptr<RNSkPlatformContext> _platformContext;
};
} // namespace RNSkia
