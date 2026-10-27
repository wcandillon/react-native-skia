#include "RNSkManager.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "RNDawnContext.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkJsiViewApi.h"
#include "RNSkView.h"
#include "api/JsiSkApi.h"
#include "api/JsiSkPicture.h"
#include "api/recorder/JsiRecorder.h"
#include "jsi/BoxedNativeObject.h"
#include "jsi/ViewProperty.h"

namespace RNSkia {
namespace jsi = facebook::jsi;

RNSkManager::RNSkManager(
    jsi::Runtime *jsRuntime,
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker,
    std::shared_ptr<RNSkPlatformContext> platformContext)
    : _jsRuntime(jsRuntime), _platformContext(platformContext),
      _jsCallInvoker(jsCallInvoker),
      _viewApi(std::make_shared<RNSkJsiViewApi>(platformContext)) {
  // The GPU is probed now, once, rather than by whichever view or image call
  // comes first: a device without one (no Vulkan 1.1 on Android) is logged
  // and reported to JS as Skia.gpu, instead of failing in different places
  // depending on what the app does first. On a thread of its own: the
  // module installs during JS startup, which does not wait for the GPU.
  DawnContext::probeInBackground();
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
