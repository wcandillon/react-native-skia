#include "RNSkManager.h"

#include <functional>
#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "RNDawnContext.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkJsiViewApi.h"
#include "RNSkRuntimeScheduler.h"
#include "RNSkThreadPool.h"
#include "RNSkThreadTrims.h"
#include "RNSkView.h"
#include "api/JsiSkApi.h"
#include "api/JsiSkDispatcher.h"
#include "api/JsiSkPicture.h"
#include "api/recorder/JsiRecorder.h"
#include "jsi/BoxedNativeObject.h"
#include "jsi/ViewProperty.h"
#include "utils/RNSkLog.h"

namespace RNSkia {
namespace jsi = facebook::jsi;

namespace {

// On Android the post calls into Java, and fbjni rethrows what Java throws;
// the main thread's scheduler must not throw (see Dispatcher::Scheduler).
bool postToMainThread(
    const std::shared_ptr<RNSkPlatformContext> &platformContext,
    std::function<void()> task) {
  try {
    platformContext->runOnMainThread(std::move(task));
  } catch (const std::exception &error) {
    RNSkLogger::logToConsole("Could not post to the main thread: %s",
                             error.what());
    return false;
  }
  return true;
}

} // namespace

RNSkManager::RNSkManager(
    jsi::Runtime *jsRuntime,
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker,
    std::shared_ptr<RNSkPlatformContext> platformContext)
    : _jsRuntime(jsRuntime), _platformContext(platformContext),
      _jsCallInvoker(jsCallInvoker),
      _viewApi(std::make_shared<RNSkJsiViewApi>(platformContext)) {
  // A lost GPU device is replaced by a new one (see DawnContext), on which
  // the windows hold nothing yet: every view records its content again for
  // it. The redraw waits for the main thread, and for the window to be able
  // to show a frame (the app may be in the background, where the device was
  // lost); it then configures the window on the new device. The listener
  // only reaches the registry, which outlives this manager.
  _lossListener =
      DawnContext::addLossListener([](const DawnContext::LossInfo &) {
        for (const auto &view : ViewRegistry::getInstance().getViews()) {
          view->requestRedraw();
        }
      });
  // A surface collected or disposed off the thread that made it is destroyed
  // on that thread (see Dispatcher): the JS thread, which installs the
  // module, and the main thread, where the UI runtime runs, destroy it when
  // their loop runs the queue. The main thread is bound by a task posted to it.
  // A binding keeps the context it posts through: the thread outlives this
  // manager, and another instance may still let go, from another thread, of
  // the surfaces its UI runtime made on the main thread, until the next
  // install binds the thread again.
  Dispatcher::bindCurrentThread(
      [platformContext](Dispatcher::Operation operation) {
        platformContext->runOnJavascriptThread(std::move(operation));
        return true;
      });
  postToMainThread(platformContext, [platformContext]() {
    Dispatcher::bindCurrentThread(
        [platformContext](Dispatcher::Operation operation) {
          return postToMainThread(platformContext, std::move(operation));
        });
  });
  // Those threads, and every other one outside the render pool that runs GPU
  // work, trim their recorders on themselves through their dispatchers (see
  // RNSkThreadTrims), with the task the render threads run (see
  // RNSkGraphiteProducer).
  RNSkThreadTrims::getInstance().setIdleTask(&DawnContext::trimThreadRecorders);
  // A texture the image cache lets go of goes back to the upload recorder of
  // the thread that uploaded it, a render thread or any other, also in an app
  // that never shows a canvas.
  ImageProvider::setReleaseListener([]() {
    RNSkThreadPool::requestIdleTaskIfStarted();
    RNSkThreadTrims::getInstance().requestAll();
  });
  // Install bindings
  installBindings();
}

RNSkManager::~RNSkManager() {
  DawnContext::removeLossListener(_lossListener);
  // The runtime that made the Graphite contexts is going away, with the
  // views of its bundle: nothing binds to or draws into a target kept past
  // this point (the next bundle's views get ids of their own, see
  // ViewRegistry::allocateId).
  RNSkGraphiteTargetRegistry::getInstance().clear();
  // Likewise for the view registry: Fabric tears the bundle's views down with
  // no ordering against this destructor, and their late unregistrations are
  // no-ops (the views only hold the manager weakly). Dropped here, the
  // entries of views torn down after this point, and the tombstones of the
  // ones torn down before it, do not stay for the life of the process.
  ViewRegistry::getInstance().clear();
  // Free up any references
  _viewApi = nullptr;
  _jsRuntime = nullptr;
  _platformContext = nullptr;
  _jsCallInvoker = nullptr;
}

void RNSkManager::registerSkiaView(size_t nativeId,
                                   std::shared_ptr<RNSkView> view) {
  _viewApi->registerSkiaView(nativeId, std::move(view));
}

void RNSkManager::unregisterSkiaView(size_t nativeId) {
  _viewApi->unregisterSkiaView(nativeId);
}

void RNSkManager::setSkiaView(size_t nativeId, std::shared_ptr<RNSkView> view) {
  _viewApi->setSkiaView(nativeId, std::move(view));
}

void RNSkManager::installBindings() {
  // The runtime the bindings go on is the React Native runtime, reached
  // through the CallInvoker: promises made on it settle that way (see
  // RNSkRuntimeScheduler).
  RNSkRuntimeScheduler::install(*_jsRuntime, _platformContext);
  // Create the API objects and install it on the global object in the
  // provided runtime.
  auto skiaApi = std::make_shared<JsiSkApi>(_platformContext);
  _jsRuntime->global().setProperty(
      *_jsRuntime, "SkiaApi", makeJsiObject(*_jsRuntime, std::move(skiaApi)));

  _jsRuntime->global().setProperty(*_jsRuntime, "SkiaViewApi",
                                   makeJsiObject(*_jsRuntime, _viewApi));

  // The native half of the worklet serializer (see
  // src/skia/SkiaWorkletSerialization.ts). The serializer worklets capture it
  // by closure and worklets passes a HostObject to every runtime by reference,
  // so the main runtime is the only place it needs installing.
  _jsRuntime->global().setProperty(
      *_jsRuntime, "__skiaWorkletHelpers",
      jsi::Object::createFromHostObject(
          *_jsRuntime, std::make_shared<RNJsi::NativeObjectWorkletHelpers>()));

  // The WebGPU JS API (RNWebGPU, navigator.gpu, constants, createImageBitmap)
  // is no longer installed here: react-native-webgpu is the single WebGPU API
  // surface for React Native. Graphite keeps Dawn as an internal
  // implementation detail only.
}
} // namespace RNSkia

namespace RNJsi {

// Probing for a recorder needs the complete recorder types. Parsing the
// recorder headers costs about 1.5 GB of compiler memory, so the probe lives
// in this translation unit, which parses them already. A separate translation
// unit would compile in parallel and add to the peak memory of the build.
ViewProperty::ViewProperty(jsi::Runtime &runtime, const jsi::Value &value) {
  if (auto picture =
          RNSkia::tryGetJsiObject<RNSkia::JsiSkPicture>(runtime, value)) {
    _value = picture->getObject();
  } else if (auto recorder =
                 RNSkia::tryGetJsiObject<RNSkia::JsiRecorder>(runtime, value)) {
    _value = recorder->getObject();
  }
}

} // namespace RNJsi
