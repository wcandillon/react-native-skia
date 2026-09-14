#pragma once

#include <memory>
#include <string>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "api/third_party/base64.h"
#include "jsi/JsiPromises.h"

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkDataFactory : public JsiSkNativeObject<JsiSkDataFactory> {
public:
  static constexpr const char *CLASS_NAME = "DataFactory";

  JSI_HOST_FUNCTION(fromURI) {
    auto jsiLocalUri = arguments[0].asString(runtime);
    auto localUri = jsiLocalUri.utf8(runtime);
    auto context = getContext();
    return RNJsi::JsiPromises::createPromiseAsJSIValue(
        runtime,
        [context = std::move(context), localUri = std::move(localUri)](
            jsi::Runtime &runtime,
            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
          // Create a stream operation - this will be run in a
          // separate thread
          context->performStreamOperation(
              localUri,
              [&runtime, context = std::move(context),
               promise = std::move(promise)](
                  std::unique_ptr<SkStreamAsset> stream) -> void {
                // Schedule drawCallback on the Javascript thread
                auto result =
                    SkData::MakeFromStream(stream.get(), stream->getLength());
                context->runOnJavascriptThread([&runtime,
                                                context = std::move(context),
                                                promise = std::move(promise),
                                                result = std::move(result)]() {
                  promise->resolve(makeJsiObject(
                      runtime,
                      std::make_shared<JsiSkData>(context, std::move(result))));
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
