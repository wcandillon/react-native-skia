#include "RNSkManager.h"

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "RNDawnContext.h"
#include "RNSkGraphiteTarget.h"
#include "RNSkJsiViewApi.h"
#include "RNSkView.h"
#include "api/JsiSkApi.h"
#include "jsi/BoxedNativeObject.h"

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
  // Install bindings
  installBindings();
}

RNSkManager::~RNSkManager() {
  // The runtime that made the Graphite contexts is going away, with the
  // views of its bundle. Native ids start over with the next bundle, and a
  // target kept past this point would be bound by the first view reusing
  // its id.
  RNSkGraphiteTargetRegistry::getInstance().clear();
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
