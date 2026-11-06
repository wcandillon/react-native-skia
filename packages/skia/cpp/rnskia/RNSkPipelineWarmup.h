#pragma once

#include <memory>
#include <thread>
#include <utility>

#if defined(__ANDROID__)
#include <sys/resource.h>
#include <sys/syscall.h>
#include <unistd.h>
#elif defined(__APPLE__)
#include <pthread/qos.h>
#endif

#include "RNDawnUtils.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBlendMode.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkColorType.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkTileMode.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/PrecompileContext.h"
#include "include/gpu/graphite/precompile/PaintOptions.h"
#include "include/gpu/graphite/precompile/Precompile.h"
#include "include/gpu/graphite/precompile/PrecompileImageFilter.h"
#include "include/gpu/graphite/precompile/PrecompileMaskFilter.h"
#include "include/gpu/graphite/precompile/PrecompileShader.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Builds the pipelines of the library's common draws ahead of their first
 * use, on a thread of its own, as soon as a GPU device exists. Graphite
 * compiles a pipeline the first time a frame draws with it, on the thread
 * that inserts the recording, and waits for the compile there: hundreds of
 * milliseconds after a fresh install, seconds on a slow GPU, during which
 * the canvas shows nothing (#4384), and on Android, whose surface sync holds
 * a window's frames until a SurfaceView's first buffer arrives, the whole
 * screen freezes. A pipeline built here is found in Graphite's cache
 * instead; one that is not is still compiled inline, as before. Dawn's blob
 * cache on disk (see RNSkBlobCache) keeps the compiled shaders across
 * processes, so the warmup of a second launch is mostly reads.
 *
 * The set is the paint options <Canvas> content draws with most (a solid
 * color, an image, a linear and a radial gradient, a blur, the atlas draw,
 * text), for the render passes of a window (see DawnUtils). It is a guess
 * to revise with data: ContextOptions::fPipelineCachingCallback lists what
 * Graphite compiles inline, and the cold mode of the benchmark (#4385)
 * measures the first mount.
 */
class RNSkPipelineWarmup {
public:
  /**
   Starts the warmup for the device the precompile context was made on (see
   Context::makePrecompileContext), in Display P3 as well as sRGB when asked
   (see DawnContext::setPrecompileDisplayP3). The context is used on the
   warmup thread only, and released there. Any thread; returns at once.
   */
  static void start(std::unique_ptr<skgpu::graphite::PrecompileContext> context,
                    bool displayP3) {
    if (context == nullptr) {
      return;
    }
    auto *released = context.release();
    std::thread([released, displayP3]() {
      std::unique_ptr<skgpu::graphite::PrecompileContext> owned(released);
      lowerPriority();
      run(owned.get(), displayP3);
    }).detach();
  }

private:
  // Behind the threads that record and present: a compile that is not
  // needed yet must not delay a frame that is.
  static void lowerPriority() {
#if defined(__ANDROID__)
    setpriority(PRIO_PROCESS, static_cast<id_t>(gettid()), 10);
#elif defined(__APPLE__)
    pthread_set_qos_class_self_np(QOS_CLASS_UTILITY, 0);
#endif
  }

  static void run(skgpu::graphite::PrecompileContext *context, bool displayP3) {
    using namespace skgpu::graphite;

    // The render passes of a window: single-sampled with a depth buffer for
    // the simple shapes, text and vertices, multisampled with depth and
    // stencil for the paths. In the window's format (see
    // DawnUtils::PreferedColorType), in sRGB and, on a wide gamut display,
    // in Display P3 too.
    RenderPassProperties passes[4];
    size_t passCount = 0;
    for (const bool p3 : {false, true}) {
      if (p3 && !displayP3) {
        continue;
      }
      const auto colorSpace = DawnUtils::viewColorSpace(p3);
      passes[passCount++] = {DepthStencilFlags::kDepth,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ false};
      passes[passCount++] = {DepthStencilFlags::kDepthStencil,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ true};
    }
    const SkSpan<const RenderPassProperties> passSpan(passes, passCount);

    constexpr auto kShapes = static_cast<DrawTypeFlags>(
        DrawTypeFlags::kSimpleShape | DrawTypeFlags::kNonSimpleShape);
    // Text, and the vertices the atlas draws with (see RNSkAtlas).
    constexpr auto kShapesTextAndVertices = static_cast<DrawTypeFlags>(
        kShapes | DrawTypeFlags::kBitmapText_Mask |
        DrawTypeFlags::kBitmapText_Color | DrawTypeFlags::kDrawVertices);

    const SkBlendMode blendModes[] = {SkBlendMode::kSrcOver};

    // A solid color, opaque or not.
    for (const bool opaque : {true, false}) {
      PaintOptions solid;
      solid.setBlendModes(blendModes);
      solid.setPaintColorIsOpaque(opaque);
      Precompile(context, solid, kShapesTextAndVertices, passSpan);
    }

    // An image (decoded to the platform's native format, premultiplied, in
    // sRGB, drawn clamped or with decal edges), a linear and a radial
    // gradient.
    {
      const SkColorInfo imageInfos[] = {SkColorInfo(
          kN32_SkColorType, kPremul_SkAlphaType, SkColorSpace::MakeSRGB())};
      const SkTileMode tileModes[] = {SkTileMode::kClamp, SkTileMode::kDecal};
      const sk_sp<PrecompileShader> shaders[] = {
          PrecompileShaders::Image(
              PrecompileShaders::ImageShaderFlags::kExcludeCubic, imageInfos,
              tileModes),
          PrecompileShaders::LinearGradient(
              PrecompileShaders::GradientShaderFlags::kNoLarge),
          PrecompileShaders::RadialGradient(
              PrecompileShaders::GradientShaderFlags::kNoLarge),
      };
      PaintOptions shaded;
      shaded.setShaders(shaders);
      shaded.setBlendModes(blendModes);
      Precompile(context, shaded, kShapesTextAndVertices, passSpan);
    }

    // A blur: the mask filter of a shadow, the image filter of <Blur>, and
    // the drop shadows Skia draws on its own.
    {
      const sk_sp<PrecompileMaskFilter> maskFilters[] = {
          PrecompileMaskFilters::Blur()};
      PaintOptions blurred;
      blurred.setMaskFilters(maskFilters);
      blurred.setBlendModes(blendModes);
      Precompile(context, blurred, kShapes, passSpan);

      const sk_sp<PrecompileImageFilter> imageFilters[] = {
          PrecompileImageFilters::Blur(nullptr)};
      PaintOptions filtered;
      filtered.setImageFilters(imageFilters);
      filtered.setBlendModes(blendModes);
      Precompile(context, filtered, kShapes, passSpan);

      PaintOptions shadows;
      Precompile(context, shadows, DrawTypeFlags::kDropShadows, passSpan);
    }
  }
};

} // namespace RNSkia
