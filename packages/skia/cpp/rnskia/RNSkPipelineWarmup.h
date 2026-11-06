#pragma once

#include <atomic>
#include <chrono>
#include <initializer_list>
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
#include "RNSkBlobCache.h"
#include "RNSkGpuActivity.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkBlendMode.h"
#include "include/core/SkColorSpace.h"
#include "include/core/SkColorType.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkSpan.h"
#include "include/core/SkTileMode.h"
#include "include/gpu/graphite/GraphiteTypes.h"
#include "include/gpu/graphite/PrecompileContext.h"
#include "include/gpu/graphite/precompile/PaintOptions.h"
#include "include/gpu/graphite/precompile/Precompile.h"
#include "include/gpu/graphite/precompile/PrecompileShader.h"

#pragma clang diagnostic pop

namespace RNSkia {

/**
 * Builds the pipelines of the library's common draws ahead of their first
 * use, on a thread of its own, as soon as a GPU device exists. Graphite
 * compiles a pipeline the first time a frame draws with it, on the thread
 * that records the frame, and the frame waits for the compile: hundreds of
 * milliseconds after a fresh install, seconds on a slow GPU, during which
 * the canvas shows nothing (#4384), and on Android, whose surface sync holds
 * a window's frames until a SurfaceView's first buffer arrives, the whole
 * screen freezes. A pipeline built here is found in Graphite's cache
 * instead; one that is not is still compiled inline, as before. Dawn's blob
 * cache on disk (see RNSkBlobCache) keeps the compiled shaders across
 * processes, so the warmup of a second launch is mostly reads.
 *
 * The warmup runs while the frames leave the device alone: from the moment
 * the device exists (on the first launch, while the bundle still loads)
 * until the first frame starts, and from then on only while no frame is
 * made or shown and none was for a moment (see RNSkGpuActivity). Each of
 * its compiles holds Dawn's device lock for its duration, so one that ran
 * alongside a frame would hold that frame up; a frame that comes in waits
 * for the compile in flight at most. Its pipelines serve the frames that
 * follow: the canvases the app mounts next, and the next launch through the
 * blob cache. A device lost meanwhile stops it: its pipelines are good for
 * nothing, and the replacement device starts a warmup of its own.
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
   warmup thread only, and released there. `lost` is the device's loss flag
   (see DawnContext::Generation), which outlives the warmup: set, the warmup
   stops at its next step. Any thread; returns at once.
   */
  static void start(std::unique_ptr<skgpu::graphite::PrecompileContext> context,
                    bool displayP3, const std::atomic<bool> *lost) {
    if (context == nullptr || lost == nullptr) {
      return;
    }
    auto *released = context.release();
    std::thread([released, displayP3, lost]() {
      std::unique_ptr<skgpu::graphite::PrecompileContext> owned(released);
      lowerPriority();
      // The entries no process uses any more are let go of here, on the
      // thread that reads the cache most, before it does.
      RNSkBlobCache::getInstance().prune();
      run(owned.get(), displayP3, *lost);
    }).detach();
  }

private:
  // How long the frames must have left the device alone before the warmup
  // compiles: longer than the interval of a frame at any display rate, so
  // that a canvas animating at 30 Hz is not interleaved with.
  static constexpr auto kIdle = std::chrono::milliseconds(100);

  // Behind the threads that record and present: a compile that is not
  // needed yet must not delay a frame that is.
  static void lowerPriority() {
#if defined(__ANDROID__)
    setpriority(PRIO_PROCESS, static_cast<id_t>(gettid()), 10);
#elif defined(__APPLE__)
    pthread_set_qos_class_self_np(QOS_CLASS_UTILITY, 0);
#endif
  }

  static void run(skgpu::graphite::PrecompileContext *context, bool displayP3,
                  const std::atomic<bool> &lost) {
    namespace graphite = skgpu::graphite;
    using graphite::DrawTypeFlags;
    using graphite::PaintOptions;
    using graphite::RenderPassProperties;

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
      passes[passCount++] = {graphite::DepthStencilFlags::kDepth,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ false};
      passes[passCount++] = {graphite::DepthStencilFlags::kDepthStencil,
                             DawnUtils::PreferedColorType, colorSpace,
                             /* fRequiresMSAA= */ true};
    }

    // One step per set of paint options, draw type and render pass: a few
    // pipelines, between which the warmup waits for the frames to leave
    // the device alone, and stops for a device lost meanwhile. False once
    // stopped.
    auto &activity = RNSkGpuActivity::getInstance();
    const auto precompile =
        [&](const PaintOptions &options,
            std::initializer_list<DrawTypeFlags> drawTypes) {
          for (const auto drawType : drawTypes) {
            for (size_t i = 0; i < passCount; i++) {
              if (!activity.waitForIdle(kIdle, lost)) {
                return false;
              }
              graphite::Precompile(
                  context, options, drawType,
                  SkSpan<const RenderPassProperties>(&passes[i], 1));
            }
          }
          return true;
        };

    // The render steps of the shapes, the text, and the vertices the atlas
    // draws with (see RNSkAtlas): the parts of kSimpleShape one at a time,
    // a render step each, and the paths (kNonSimpleShape, a dozen render
    // steps, the longest step of the warmup) last.
    const std::initializer_list<DrawTypeFlags> kShapesTextAndVertices = {
        DrawTypeFlags::kAnalyticRRect,    DrawTypeFlags::kPerEdgeAAQuad,
        DrawTypeFlags::kNonAAFillRect,    DrawTypeFlags::kBitmapText_Mask,
        DrawTypeFlags::kBitmapText_Color, DrawTypeFlags::kDrawVertices,
        DrawTypeFlags::kNonSimpleShape};

    const SkBlendMode blendModes[] = {SkBlendMode::kSrcOver};

    // A solid color, opaque or not: the most common draws first, so that
    // the time before the first frame goes to them.
    for (const bool opaque : {true, false}) {
      PaintOptions solid;
      solid.setBlendModes(blendModes);
      solid.setPaintColorIsOpaque(opaque);
      if (!precompile(solid, kShapesTextAndVertices)) {
        return;
      }
    }

    // An image (decoded to the platform's native format, premultiplied, in
    // sRGB, drawn clamped, then with decal edges), a linear and a radial
    // gradient: one shader per set, so that a step stays a few pipelines.
    {
      const SkColorInfo imageInfos[] = {SkColorInfo(
          kN32_SkColorType, kPremul_SkAlphaType, SkColorSpace::MakeSRGB())};
      const SkTileMode clamp[] = {SkTileMode::kClamp};
      const SkTileMode decal[] = {SkTileMode::kDecal};
      const sk_sp<graphite::PrecompileShader> shaders[] = {
          graphite::PrecompileShaders::Image(
              graphite::PrecompileShaders::ImageShaderFlags::kExcludeCubic,
              imageInfos, clamp),
          graphite::PrecompileShaders::Image(
              graphite::PrecompileShaders::ImageShaderFlags::kExcludeCubic,
              imageInfos, decal),
          graphite::PrecompileShaders::LinearGradient(
              graphite::PrecompileShaders::GradientShaderFlags::kNoLarge),
          graphite::PrecompileShaders::RadialGradient(
              graphite::PrecompileShaders::GradientShaderFlags::kNoLarge),
      };
      for (const auto &shader : shaders) {
        const sk_sp<graphite::PrecompileShader> one[] = {shader};
        PaintOptions shaded;
        shaded.setShaders(one);
        shaded.setBlendModes(blendModes);
        if (!precompile(shaded, kShapesTextAndVertices)) {
          return;
        }
      }
    }

    // The drop shadows Skia draws on its own. Not the blurs (the mask
    // filter of a shadow, the image filter of <Blur>): their precompile
    // expands to dozens of pipelines, which held the device lock for 12 s
    // on a Pixel 8 against 70 to 400 ms for any step above, and a blur is
    // compiled inline for the sigma it is drawn with anyway.
    {
      PaintOptions shadows;
      precompile(shadows, {DrawTypeFlags::kDropShadows});
    }
  }
};

} // namespace RNSkia
