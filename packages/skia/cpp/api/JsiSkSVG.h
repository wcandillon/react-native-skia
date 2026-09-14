#pragma once

#include <memory>
#include <utility>

#include <jsi/jsi.h>

#include "JsiSkNativeObjects.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include <modules/svg/include/SkSVGDOM.h>

#pragma clang diagnostic pop

namespace RNSkia {

namespace jsi = facebook::jsi;

class JsiSkSVG : public JsiSkWrappingSkPtrNativeObject<JsiSkSVG, SkSVGDOM> {
public:
  static constexpr const char *CLASS_NAME = "SVG";

  JsiSkSVG(std::shared_ptr<RNSkPlatformContext> context, sk_sp<SkSVGDOM> svgdom,
           sk_sp<skresources::ResourceProvider> resourceProvider = nullptr)
      : JsiSkWrappingSkPtrNativeObject<JsiSkSVG, SkSVGDOM>(std::move(context),
                                                           std::move(svgdom)) {}

  ~JsiSkSVG() = default;

  double width() {
    return static_cast<double>(getObject()->containerSize().width());
  }

  double height() {
    return static_cast<double>(getObject()->containerSize().height());
  }

  static void definePrototype(jsi::Runtime &runtime, jsi::Object &prototype) {
    installCommon(runtime, prototype);
    installMethod(runtime, prototype, "width", &JsiSkSVG::width);
    installMethod(runtime, prototype, "height", &JsiSkSVG::height);
  }

  /**
    Returns the underlying object from a host object of this type
   */
  static sk_sp<SkSVGDOM> fromValue(jsi::Runtime &runtime,
                                   const jsi::Value &obj) {
    return getJsiObject<JsiSkSVG>(runtime, obj)->getObject();
  }

  size_t getMemoryPressure() override {
    auto svgdom = getObject();
    if (!svgdom) {
      return 1024; // Base size if no SVG
    }

    auto containerSize = svgdom->containerSize();

    // Estimate memory usage based on SVG dimensions
    // SVG rendering typically requires:
    // - Vector data storage (base overhead)
    // - Potential rasterization buffer (width * height * 4 bytes per pixel)
    size_t rasterBufferSize =
        static_cast<size_t>(containerSize.width() * containerSize.height() * 4);

    // Add base overhead for SVG DOM structure, paths, and vector data
    size_t baseOverhead = 32 * 1024; // 32KB for SVG DOM, paths, styles, etc.

    // SVGs are typically lighter than raster images but heavier than simple
    // vectors Use a fraction of full raster size plus base overhead
    return (rasterBufferSize / 4) +
           baseOverhead; // Quarter of full raster + overhead
  }
};

} // namespace RNSkia
