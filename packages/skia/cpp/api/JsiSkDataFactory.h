#pragma once

#include <memory>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "api/third_party/base64.h"
#include "rnskia/RNSkAsync.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkDataFactory : public JsiSkNativeObject<JsiSkDataFactory> {
public:
  static constexpr const char *CLASS_NAME = "DataFactory";

  // Resolves to the bytes at the URI, loaded on a thread of the platform's
  // (see RNSkPlatformContext::performStreamOperation); rejects when they
  // cannot be loaded. Settled on the calling runtime (RNSkAsync).
  JSI_HOST_FUNCTION(fromURI) {
    auto uri = arguments[0].asString(runtime).utf8(runtime);
    auto context = getContext();
    return RNSkAsync::run(
        runtime, context,
        [context, uri](jsi::Runtime &, RNSkAsync::Promise &,
                       RNSkAsync::Complete complete) {
          context->performStreamOperation(
              uri, [context, uri, complete = std::move(complete)](
                       std::unique_ptr<SkStreamAsset> stream) {
                auto data = stream == nullptr
                                ? nullptr
                                : SkData::MakeFromStream(stream.get(),
                                                         stream->getLength());
                complete([context, uri,
                          data = std::move(data)](jsi::Runtime &runtime,
                                                  RNSkAsync::Promise &promise) {
                  if (data == nullptr) {
                    promise.reject("fromURI: could not load " + uri);
                    return;
                  }
                  promise.resolve(makeJsiObject(
                      runtime, std::make_shared<JsiSkData>(context, data)));
                });
              });
        });
  };

  JSI_HOST_FUNCTION(fromBytes) {
    auto array = arguments[0].asObject(runtime);
    jsi::ArrayBuffer buffer =
        array.getProperty(runtime, jsi::PropNameID::forAscii(runtime, "buffer"))
            .asObject(runtime)
            .getArrayBuffer(runtime);

    auto data =
        SkData::MakeWithCopy(buffer.data(runtime), buffer.size(runtime));
    return makeJsiObject(
        runtime, std::make_shared<JsiSkData>(getContext(), std::move(data)));
  }

  std::shared_ptr<JsiSkData> fromBase64(std::string base64Str) {
    auto size = base64Str.size();

    // Calculate length
    size_t len;
    auto err = Base64::Decode(base64Str.c_str(), size, nullptr, &len);
    if (err != Base64::Error::kNone) {
      throw std::runtime_error("Error decoding base64 string");
    }

    // Create data object and decode
    auto data = SkData::MakeUninitialized(len);
    err = Base64::Decode(base64Str.c_str(), size, data->writable_data(), &len);
    if (err != Base64::Error::kNone) {
      throw std::runtime_error("Error decoding base64 string");
    }

    return std::make_shared<JsiSkData>(getContext(), std::move(data));
  }

  size_t getMemoryPressure() override { return 1024; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "fromURI",
                      &JsiSkDataFactory::fromURI);
    installHostMethod(runtime, prototype, "fromBytes",
                      &JsiSkDataFactory::fromBytes);
    installMethod(runtime, prototype, "fromBase64",
                  &JsiSkDataFactory::fromBase64);
  }

  explicit JsiSkDataFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkDataFactory>(std::move(context)) {}
};

} // namespace RNSkia
