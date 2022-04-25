#import <RNSkDrawViewImpl.h>
#import <RNSkLog.h>
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import <SkSurface.h>
#import <SkCanvas.h>

#pragma clang diagnostic pop

#import <RNSkLog.h>

// These static class members are used by all Skia Views
id<MTLDevice> RNSkDrawViewImpl::_device = MTLCreateSystemDefaultDevice();
id<MTLCommandQueue> RNSkDrawViewImpl::_commandQueue = id<MTLCommandQueue>(CFRetain((GrMTLHandle)[_device newCommandQueue]));

sk_sp<GrDirectContext> RNSkDrawViewImpl::_skContext = nullptr;

RNSkDrawViewImpl::RNSkDrawViewImpl(CALayer* parentLayer,
                                   std::shared_ptr<RNSkia::RNSkPlatformContext> context):
  _context(context), RNSkia::RNSkDrawView(context) {
    
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
    
  _layer.framebufferOnly = NO;
  _layer.device = _device;
  _layer.opaque = false;
  _layer.contentsScale = _context->getPixelDensity();
  _layer.pixelFormat = MTLPixelFormatBGRA8Unorm;
  
  // Add layer to parent layer
  [parentLayer addSublayer:_layer];
}

RNSkDrawViewImpl::~RNSkDrawViewImpl() {
  [_layer removeFromSuperlayer];
}

void RNSkDrawViewImpl::setSize(int width, int height) {
  _width = width;
  _height = height;
  _layer.frame = CGRectMake(0, 0, width, height);
  _layer.drawableSize = CGSizeMake(width * _context->getPixelDensity(),
                                   height* _context->getPixelDensity());
  
  requestRedraw();
}

void RNSkDrawViewImpl::drawPicture(const sk_sp<SkPicture> picture) {
  if(_width == -1 && _height == -1) {
    return;
  }
  
  if(_layer == nullptr) {
    return;
  }
  
  if(_skContext == nullptr) {
    GrContextOptions grContextOptions;
    _skContext = GrDirectContext::MakeMetal((__bridge void*)_device,
                                            (__bridge void*)_commandQueue,
                                            grContextOptions);
  }
  
  // Wrap in auto release pool since we want the system to clean up after rendering
  // and not wait until later - we've seen some example of memory usage growing very
  // fast in the simulator without this.
  @autoreleasepool
  {
    id<CAMetalDrawable> currentDrawable = [_layer nextDrawable];
    if(currentDrawable == nullptr) {
      return;
    }
    
    GrMtlTextureInfo fbInfo;
    fbInfo.fTexture.retain((__bridge void*)currentDrawable.texture);
    
    GrBackendRenderTarget backendRT(_layer.drawableSize.width,
                                    _layer.drawableSize.height,
                                    1,
                                    fbInfo);

    auto skSurface = SkSurface::MakeFromBackendRenderTarget(_skContext.get(),
                                                            backendRT,
                                                            kTopLeft_GrSurfaceOrigin,
                                                            kBGRA_8888_SkColorType,
                                                            nullptr,
                                                            nullptr);
    
    if(skSurface == nullptr || skSurface->getCanvas() == nullptr) {
      RNSkia::RNSkLogger::logToConsole("Skia surface could not be created from parameters.");
      return;
    }
    
    skSurface->getCanvas()->clear(SK_AlphaTRANSPARENT);
    skSurface->getCanvas()->drawPicture(picture);
    
    id<MTLCommandBuffer> commandBuffer([_commandQueue commandBuffer]);
    [commandBuffer presentDrawable:currentDrawable];
    [commandBuffer commit];
  }
}
