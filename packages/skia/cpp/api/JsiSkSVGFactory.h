#pragma once

#include <memory>
#include <unordered_map>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkData.h"
#include "JsiSkNativeObjects.h"
#include "JsiSkSVG.h"
#include "JsiSkTypeface.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkStream.h"
#include "modules/skresources/include/SkResources.h"

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class SVGAssetProvider : public skresources::ResourceProvider {
public:
  using AssetMap = std::unordered_map<std::string, sk_sp<SkData>>;

  static sk_sp<SVGAssetProvider>
  Make(AssetMap assets, skresources::ImageDecodeStrategy strategy =
                            skresources::ImageDecodeStrategy::kPreDecode) {
    return sk_sp<SVGAssetProvider>(
        new SVGAssetProvider(std::move(assets), strategy));
  }

  // Override loadImageAsset() to handle image loading
  sk_sp<skresources::ImageAsset>
  loadImageAsset(const char[] /*path*/, const char name[],
                 const char[] /*id*/) const override {
    // Identify resources by name only
    auto it = fAssets.find(name);
    if (it != fAssets.end()) {
      // Create ImageAsset from SkData
      return skresources::MultiFrameImageAsset::Make(it->second, fStrategy);
    }
    return nullptr;
  }

private:
  explicit SVGAssetProvider(AssetMap assets,
                            skresources::ImageDecodeStrategy strategy)
      : fAssets(std::move(assets)), fStrategy(strategy) {}
  const AssetMap fAssets;
  const skresources::ImageDecodeStrategy fStrategy;
};

class JsiSkSVGFactory : public JsiSkNativeObject<JsiSkSVGFactory> {
public:
  static constexpr const char *CLASS_NAME = "SVGFactory";

  // Helper function to parse asset map from JS object
  static SVGAssetProvider::AssetMap parseAssetMap(jsi::Runtime &runtime,
                                                  const jsi::Value &jsValue) {
    SVGAssetProvider::AssetMap assets;

    if (!jsValue.isObject()) {
      return assets;
    }

    auto jsAssetMap = jsValue.asObject(runtime);

    // Convert JS object to C++ AssetMap
    auto propertyNames = jsAssetMap.getPropertyNames(runtime);
    size_t propertyCount = propertyNames.size(runtime);

    for (size_t i = 0; i < propertyCount; i++) {
      auto propertyName =
          propertyNames.getValueAtIndex(runtime, i).asString(runtime);
      auto key = propertyName.utf8(runtime);
      auto jsValue = jsAssetMap.getProperty(runtime, propertyName);

      // Skip null or undefined values
      if (jsValue.isNull() || jsValue.isUndefined()) {
        continue;
      }

      auto skData = tryGetJsiObject<JsiSkData>(runtime, jsValue);
      if (skData) {
        assets[key] = skData->getObject();
      }
    }

    return assets;
  }

private:
  jsi::Value makeSVGFromStream(jsi::Runtime &runtime,
                               std::unique_ptr<SkMemoryStream> stream,
                               sk_sp<SkFontMgr> fontMgr,
                               SVGAssetProvider::AssetMap assets) {
    auto builder = SkSVGDOM::Builder();

    if (fontMgr) {
      builder.setFontManager(fontMgr);
    }

    auto baseProvider = SVGAssetProvider::Make(
        std::move(assets), skresources::ImageDecodeStrategy::kPreDecode);
    auto provider = skresources::DataURIResourceProviderProxy::Make(
        std::move(baseProvider), skresources::ImageDecodeStrategy::kPreDecode,
        fontMgr);

    // TODO: this sk_sp subclassing issue needs to be fixed.
    provider->ref();
    builder.setResourceProvider(provider);

    auto svg_dom = builder.make(*stream);
    return makeJsiObject(
        runtime, std::make_shared<JsiSkSVG>(getContext(), std::move(svg_dom)));
  }

public:
  JSI_HOST_FUNCTION(MakeFromData) {
    auto data = JsiSkData::fromValue(runtime, arguments[0]);
    auto stream = SkMemoryStream::Make(data);

    // Parse fontMgr (second parameter)
    auto fontMgr = count > 1 && arguments[1].isObject()
                       ? JsiSkFontMgr::fromValue(runtime, arguments[1])
                       : nullptr;

    // Parse assets map (third parameter)
    auto assets = count > 2 ? parseAssetMap(runtime, arguments[2])
                            : SVGAssetProvider::AssetMap();

    return makeSVGFromStream(runtime, std::move(stream), fontMgr,
                             std::move(assets));
  }

  JSI_HOST_FUNCTION(MakeFromString) {
    auto svgText = arguments[0].asString(runtime).utf8(runtime);
    auto stream = SkMemoryStream::MakeDirect(svgText.c_str(), svgText.size());

    // Parse fontMgr (second parameter)
    auto fontMgr = count > 1 && arguments[1].isObject()
                       ? JsiSkFontMgr::fromValue(runtime, arguments[1])
                       : nullptr;

    // Parse assets map (third parameter)
    auto assets = count > 2 ? parseAssetMap(runtime, arguments[2])
                            : SVGAssetProvider::AssetMap();

    return makeSVGFromStream(runtime, std::move(stream), fontMgr,
                             std::move(assets));
  }

  size_t getMemoryPressure() override { return kMinMemoryPressure; }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installHostMethod(runtime, prototype, "MakeFromData",
                      &JsiSkSVGFactory::MakeFromData);
    installHostMethod(runtime, prototype, "MakeFromString",
                      &JsiSkSVGFactory::MakeFromString);
  }

  explicit JsiSkSVGFactory(std::shared_ptr<RNSkPlatformContext> context)
      : JsiSkNativeObject<JsiSkSVGFactory>(std::move(context)) {}
};

} // namespace RNSkia
