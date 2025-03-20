#pragma once

#import <MetalKit/MetalKit.h>

#include "WindowContext.h"

class SkiaMetalContext;

class MetalWindowContext : public RNSkia::WindowContext {
public:
  MetalWindowContext(GrDirectContext *directContext, id<MTLDevice> device,
                     id<MTLCommandQueue> commandQueue, CALayer *layer,
                     int width, int height);
  ~MetalWindowContext() = default;

  sk_sp<SkSurface> getSurface() override;

  void present() override;

  int getWidth() override {
    return _layer.frame.size.width * _layer.contentsScale;
  };

  int getHeight() override {
    return _layer.frame.size.height * _layer.contentsScale;
  };

  void resize(int width, int height) override { _skSurface = nullptr; }

private:
  GrDirectContext *_directContext;
  id<MTLCommandQueue> _commandQueue;
  sk_sp<SkSurface> _skSurface = nullptr;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop
  id<CAMetalDrawable> _currentDrawable = nil;
};
