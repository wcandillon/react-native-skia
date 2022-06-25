#include "RNSkManager.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include <JsiSkApi.h>
#include <RNSkJsiViewApi.h>
#include <RNSkDrawView.h>
#include <RNSkValueApi.h>

namespace RNSkia {
using namespace facebook;

RNSkManager::RNSkManager(
    jsi::Runtime *jsRuntime,
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker,
    std::shared_ptr<RNSkPlatformContext> platformContext)
    : _jsRuntime(jsRuntime), _jsCallInvoker(jsCallInvoker),
      _platformContext(platformContext),
      _viewApi(std::make_shared<RNSkJsiViewApi>(platformContext)) {

  // Install bindings
  installBindings();
}

RNSkManager::~RNSkManager() {
  invalidate();
  // Free up any references
  _viewApi = nullptr;
  _jsRuntime = nullptr;
  _platformContext = nullptr;
  _jsCallInvoker = nullptr;
}

void RNSkManager::invalidate() {
  if(_isInvalidated) {
    return;
  }
  _isInvalidated = true;
  
  // Remove draw loop
  if(_drawingLoopId != 0) {
    _platformContext->endDrawLoop(_drawingLoopId);
    _drawingLoopId = 0;
  }

  // Invalidate members
  _viewApi->invalidate();
  _platformContext->invalidate();
}

void RNSkManager::registerSkiaDrawView(size_t nativeId, std::shared_ptr<RNSkDrawView> view) {
  if (!_isInvalidated && _viewApi != nullptr)
    _viewApi->registerSkiaDrawView(nativeId, view);
}

void RNSkManager::unregisterSkiaDrawView(size_t nativeId) {
  if (!_isInvalidated && _viewApi != nullptr)
    _viewApi->unregisterSkiaDrawView(nativeId);
}

void RNSkManager::setSkiaDrawView(size_t nativeId, std::shared_ptr<RNSkDrawView> view) {
  if (!_isInvalidated && _viewApi != nullptr)
    _viewApi->setSkiaDrawView(nativeId, view);
  
  if(_drawingLoopId == 0) {
    _drawingLoopId = _platformContext->beginDrawLoop([weakSelf = weak_from_this()](bool invalidated) {
      // This callback is called on the main thread. This
      // callback is responsible for going through all registered Skia Views
      // and let them render a Skia Picture (list of drawing operations) that
      // can be passed to the render thread and rendered on screen.
      auto self = weakSelf.lock();
      if (self) {

        // Get all active views
        auto viewCallbacks = self->_viewApi->getCallbackInfos();
        
        // Call drawing ops on all views
        for (const auto &vinfo: viewCallbacks) {
          if (vinfo.second.view != nullptr && vinfo.second.view->isWorkletBased()) {
            vinfo.second.view->performDirectDraw();
          }
        }        
      }
    });
  }
}

void RNSkManager::installBindings() {
  // Create the API objects and install it on the global object in the
  // provided runtime.

  auto skiaApi = std::make_shared<JsiSkApi>(*_jsRuntime, _platformContext);
  _jsRuntime->global().setProperty(
      *_jsRuntime, "SkiaApi",
      jsi::Object::createFromHostObject(*_jsRuntime, std::move(skiaApi)));

  _jsRuntime->global().setProperty(
      *_jsRuntime, "SkiaViewApi",
      jsi::Object::createFromHostObject(*_jsRuntime, _viewApi));

  auto skiaValueApi = std::make_shared<RNSkValueApi>(_platformContext);
  _jsRuntime->global().setProperty(
    *_jsRuntime, "SkiaValueApi",
    jsi::Object::createFromHostObject(*_jsRuntime, std::move(skiaValueApi)));
}
} // namespace RNSkia
