#pragma once

#include <memory>
#include <optional>

#include "JsiSkConverters.h"
#include "JsiSkData.h"
#include "JsiSkDispatcher.h"
#include "JsiSkMatrix.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkRect.h"
#include "JsiSkShader.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkPicture.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkPicture
    : public JsiSkWrappingSkPtrNativeObject<JsiSkPicture, SkPicture> {
private:
  std::shared_ptr<Dispatcher> _dispatcher;

public:
  static constexpr const char *CLASS_NAME = "Picture";

  JsiSkPicture(std::shared_ptr<RNSkPlatformContext> context,
               const sk_sp<SkPicture> picture)
      : JsiSkWrappingSkPtrNativeObject<JsiSkPicture, SkPicture>(context,
                                                                picture) {
    // Get the dispatcher for the current thread
    _dispatcher = Dispatcher::getDispatcher();
    // Process any pending operations
    _dispatcher->processQueue();
  }

public:
  ~JsiSkPicture() override {
    if (!isDisposed()) {
      // This JSI Object is being deleted from a GC, which might happen
      // on a separate Thread. GPU resources (like SkPicture) must be deleted
      // on the same Thread they were created on, so in this case we schedule
      // deletion to run on the Thread this Object was created on.
      auto picture = getObjectUnchecked();
      if (picture && _dispatcher) {
        _dispatcher->run([picture]() {
          // Picture will be deleted when this lambda is destroyed, on the
          // original Thread.
        });
      }
      releaseResources();
    }
  }

  std::shared_ptr<JsiSkShader>
  makeShader(double tmx, double tmy, double fm,
             std::optional<std::shared_ptr<SkMatrix>> m,
             std::optional<std::shared_ptr<SkRect>> tr) {
    auto shader = getObject()->makeShader(
        static_cast<SkTileMode>(tmx), static_cast<SkTileMode>(tmy),
        static_cast<SkFilterMode>(fm), m.has_value() ? m->get() : nullptr,
        tr.has_value() ? tr->get() : nullptr);
    return std::make_shared<JsiSkShader>(getContext(), shader);
  }

  JSI_HOST_FUNCTION(serialize) {
    auto data = getObject()->serialize();
    auto arrayCtor =
        runtime.global().getPropertyAsFunction(runtime, "Uint8Array");
    size_t size = data->size();

    jsi::Object array =
        arrayCtor.callAsConstructor(runtime, static_cast<double>(size))
            .getObject(runtime);
    jsi::ArrayBuffer buffer =
        array.getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);

    auto bfrPtr = reinterpret_cast<uint8_t *>(buffer.data(runtime));
    memcpy(bfrPtr, data->bytes(), size);
    return array;
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkPicture> fromValue(jsi::Runtime &runtime,
                                    const jsi::Value &obj) {
    return getJsiObject<JsiSkPicture>(runtime, obj)->getObject();
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "makeShader", &JsiSkPicture::makeShader);
    installHostMethod(runtime, prototype, "serialize",
                      &JsiSkPicture::serialize);
  }

  size_t getMemoryPressure() override {
    if (isDisposed()) {
      return 0;
    }
    auto picture = getObjectUnchecked();
    if (!picture) {
      return 0;
    }
    // SkPicture provides approximateBytesUsed() method to estimate memory usage
    auto bytesUsed = picture->approximateBytesUsed();
    return bytesUsed;
  }
};
} // namespace RNSkia
