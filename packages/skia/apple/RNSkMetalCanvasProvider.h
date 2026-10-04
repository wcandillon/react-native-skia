#pragma once

#import "RNSkPlatformContext.h"
#import "RNSkView.h"

#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#include <mutex>
#include <vector>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <include/gpu/ganesh/GrDirectContext.h>

#pragma clang diagnostic pop

class RNSkMetalCanvasProvider : public RNSkia::RNSkCanvasProvider {
public:
  RNSkMetalCanvasProvider(std::function<void()> requestRedraw,
                          std::shared_ptr<RNSkia::RNSkPlatformContext> context,
                          bool useP3ColorSpace = true);

  ~RNSkMetalCanvasProvider();

  int getWidth() override;
  int getHeight() override;

  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override;

#if defined(SK_GRAPHITE)
  bool getGraphiteTargetInfo(RNSkia::RNSkGraphiteTargetInfo *info) override;

  bool presentRecordings(
      const std::vector<skgpu::graphite::Recording *> &recordings) override;
#endif

  void setSize(int width, int height);
  void setOpaque(bool opaque);
  void setUseP3ColorSpace(bool useP3ColorSpace);
  void setHighBitDepth(bool highBitDepth);
  CALayer *getLayer();

private:
  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
  std::unique_ptr<RNSkia::WindowContext> _ctx = nullptr;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
  bool _useP3ColorSpace = true;
  bool _highBitDepth = false;
  bool _opaque = false;
#if defined(SK_GRAPHITE)
  // A copy of the window's target description, readable from any thread
  // while the window itself belongs to the main thread.
  std::mutex _targetInfoMutex;
  RNSkia::RNSkGraphiteTargetInfo _targetInfo;
  bool _hasTargetInfo = false;
#endif
};
