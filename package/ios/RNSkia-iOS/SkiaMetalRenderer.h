
#pragma once

#import "PlatformContext.h"
#import "RNSkRenderer.h"

#import <GrMtlBackendContext.h>
#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <SkCanvas.h>
#import <SkRefCnt.h>
#import <include/gpu/GrDirectContext.h>

#pragma clang diagnostic pop

class SkiaMetalRenderer: public RNSkia::RNSkRenderer {
public:
  SkiaMetalRenderer(std::shared_ptr<RNSkia::RNSkPlatformContext> context);
  ~SkiaMetalRenderer();
  
  CALayer* getLayer() { return _layer; }
  
  void setSize(int width, int height);

protected:
  float getScaledWidth() override { return _width * _context->getPixelDensity(); };
  float getScaledHeight() override { return _height * _context->getPixelDensity(); };
  void renderToSkCanvas(std::function<void(SkCanvas*)> cb) override;
  
private:
  
  float _width = -1;
  float _height = -1;

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop

  static id<MTLCommandQueue> _commandQueue;
  static id<MTLDevice> _device;
  static sk_sp<GrDirectContext> _skContext;

  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
};
