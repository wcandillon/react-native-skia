#pragma once

#import "PlatformContext.h"
#import "RNSKDrawView.h"
#import <CoreFoundation/CoreFoundation.h>
#import <UIKit/UIKit.h>

#import <GrMtlBackendContext.h>
#import <MetalKit/MetalKit.h>
#import <QuartzCore/CAMetalLayer.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <SkPicture.h>
#import <SkRefCnt.h>
#import <include/gpu/GrDirectContext.h>

#pragma clang diagnostic pop

class RNSkDrawViewImpl : public RNSkia::RNSkDrawView {
public:
  RNSkDrawViewImpl(CALayer* parentLayer, std::shared_ptr<RNSkia::RNSkPlatformContext> context);
  virtual ~RNSkDrawViewImpl();
  
  void setSize(int width, int height);    

protected:
  int getWidth() override { return _width * _context->getPixelDensity(); };
  int getHeight() override { return _height * _context->getPixelDensity(); };
  
  void drawPicture(const sk_sp<SkPicture>) override;
  
private:
  void drawFrame(const sk_sp<SkPicture> picture);
  bool createSkiaSurface();

  int _nativeId;
  int _width = -1;
  int _height = -1;

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  CAMetalLayer *_layer;
#pragma clang diagnostic pop

  static id<MTLDevice> _device;
  static id<MTLCommandQueue> _commandQueue;
  static sk_sp<GrDirectContext> _skContext;
  
  std::shared_ptr<RNSkia::RNSkPlatformContext> _context;
};
