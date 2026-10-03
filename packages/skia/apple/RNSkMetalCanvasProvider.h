#pragma once

#import "RNSkCanvasProvider.h"
#import "RNSkPlatformContext.h"

#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#include <memory>
#include <mutex>
#include <vector>

/**
 * The CAMetalLayer a SkiaView presents into. The layer is configured as a
 * Dawn surface (see DawnWindowContext) when the view gets a size.
 */
class RNSkMetalCanvasProvider : public RNSkia::RNSkCanvasProvider {
public:
  explicit RNSkMetalCanvasProvider(
      std::shared_ptr<RNSkia::RNSkPlatformContext> context);

  ~RNSkMetalCanvasProvider();

  int getWidth() override;
  int getHeight() override;

  bool getTargetInfo(RNSkia::RNSkGraphiteTargetInfo *info) override;

  bool getLayoutSize(int *width, int *height) override;

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override;

  bool presentImage(const sk_sp<SkImage> &image) override;

  void setSize(int width, int height);
  void setHighBitDepth(bool highBitDepth);
  CALayer *getLayer();

private:
  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
  std::unique_ptr<RNSkia::WindowContext> _ctx = nullptr;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
  bool _highBitDepth = false;
  // A copy of the window's target description, readable from any thread
  // while the window itself belongs to the main thread.
  std::mutex _targetInfoMutex;
  RNSkia::RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
  int _layoutWidth = 0;
  int _layoutHeight = 0;
};
