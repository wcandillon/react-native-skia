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
  if(_drawLoopId != 0) {
    _platformContext->endDrawLoop(_drawLoopId);
    _drawLoopId = 0;
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
  if (!_isInvalidated && _viewApi != nullptr) {
    _viewApi->setSkiaDrawView(nativeId, view);
    // This one can't be called from the ctor since it uses shared_from_this (weak referencing)
    installDrawLoop();
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

void RNSkManager::installDrawLoop() {
  if(_drawLoopId == 0) {
    _drawLoopId = _platformContext->beginDrawLoop([weakSelf = weak_from_this()](bool invalidated) {
      // This callback is called on the main thread. This
      // callback is responsible for going through all registered Skia Views
      // and let them render a Skia Picture (list of drawing operations) that
      // can be passed to the render thread and rendered on screen.
      auto self = weakSelf.lock();
      if (self) {

        // Let's begin with calling all render methods for all active views
       // self->getPlatformContext()->runOnJavascriptThread([self = std::move(self)]() {
          
          // Get all active views
          auto viewCallbacks = self->_viewApi->getCallbackInfos();

          // Set aside a list of pictures / drawing operations
          std::vector<std::tuple<sk_sp<SkPicture>, std::shared_ptr<RNSkDrawView>>> pics;

          // Call drawing ops on all views
          for (const auto &vinfo: viewCallbacks) {
            if (vinfo.second.view != nullptr) {
              auto pic = vinfo.second.view->performDraw();
              pics.push_back(std::make_tuple(pic, vinfo.second.view));
            }
          }

          //self->getPlatformContext()->runOnMainThread([viewCallbacks, pics = std::move(pics)]() {
            for (size_t i = 0; i < pics.size(); ++i) {
              if(std::get<0>(pics.at(i)) != nullptr) {
                std::get<1>(pics.at(i))->drawPicture(std::get<0>(pics.at(i)));
              }
           }
        // });
        //});
      }
    });
  }
}

} // namespace RNSkia
