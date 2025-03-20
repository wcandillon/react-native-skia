#pragma once

#import "RNSkPlatformContext.h"
#import "RNSkView.h"

#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <include/gpu/ganesh/GrDirectContext.h>

#pragma clang diagnostic pop

class RNSkMetalCanvasProvider : public RNSkia::RNSkCanvasProvider {
public:
  RNSkMetalCanvasProvider(std::function<void()> requestRedraw,
                          std::shared_ptr<RNSkia::RNSkPlatformContext> context);

  ~RNSkMetalCanvasProvider();

  int getScaledWidth() override;
  int getScaledHeight() override;

  bool renderToCanvas(const std::function<void(SkCanvas *)> &cb) override;

  void setSize(int width, int height);
  CALayer *getLayer();

private:
  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
  std::unique_ptr<RNSkia::WindowContext> _ctx = nullptr;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
};
