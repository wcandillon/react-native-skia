#import "ViewScreenshotService.h"

#import <CoreGraphics/CoreGraphics.h>
 #import <QuartzCore/QuartzCore.h>

@implementation ViewScreenshotService {
  RCTUIManager *_uiManager;
}

- (instancetype)initWithUiManager:(RCTUIManager *)uiManager {
  if (self = [super init]) {
    _uiManager = uiManager;
  }
  return self;
}

- (CVPixelBufferRef)pixelBufferOfViewWithTag:(NSNumber *)viewTag {
#if !TARGET_OS_OSX
  UIView *view = [_uiManager viewForReactTag:viewTag];
  if (view == nil) {
    RCTFatal(RCTErrorWithMessage(@"Could not find view with tag"));
    return NULL;
  }

  CGSize pointSize = view.frame.size;
  CGFloat scale = view.window.screen.scale;
  if (scale <= 0) {
    scale = [UIScreen mainScreen].scale;
  }
  NSUInteger pxW = (NSUInteger)(pointSize.width * scale);
  NSUInteger pxH = (NSUInteger)(pointSize.height * scale);
  if (pxW == 0 || pxH == 0) {
    return NULL;
  }

  NSDictionary *surfaceProps = @{
    (id)kIOSurfaceWidth : @(pxW),
    (id)kIOSurfaceHeight : @(pxH),
    (id)kIOSurfaceBytesPerElement : @4,
    (id)kIOSurfacePixelFormat : @((uint32_t)kCVPixelFormatType_32BGRA),
  };
  IOSurfaceRef surface = IOSurfaceCreate((__bridge CFDictionaryRef)surfaceProps);
  if (surface == NULL) {
    return NULL;
  }

  IOSurfaceLock(surface, 0, NULL);
  CGColorSpaceRef cs = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGContextRef ctx = CGBitmapContextCreate(
      IOSurfaceGetBaseAddress(surface), pxW, pxH, 8,
      IOSurfaceGetBytesPerRow(surface), cs,
      kCGBitmapByteOrder32Little | kCGImageAlphaPremultipliedFirst);
  CGColorSpaceRelease(cs);
  if (ctx == NULL) {
    IOSurfaceUnlock(surface, 0, NULL);
    CFRelease(surface);
    return NULL;
  }

  // CG origin is bottom-left, UIKit's drawViewHierarchyInRect: expects
  // top-left. Translate + flip + scale to retina in one CTM.
  CGContextTranslateCTM(ctx, 0, pxH);
  CGContextScaleCTM(ctx, scale, -scale);

  UIGraphicsPushContext(ctx);
  [view drawViewHierarchyInRect:(CGRect){CGPointZero, pointSize}
             afterScreenUpdates:YES];
  UIGraphicsPopContext();

  CGContextRelease(ctx);
  IOSurfaceUnlock(surface, 0, NULL);

  CVPixelBufferRef pixelBuffer = NULL;
  CVReturn r =
      CVPixelBufferCreateWithIOSurface(NULL, surface, NULL, &pixelBuffer);
  CFRelease(surface);
  if (r != kCVReturnSuccess || pixelBuffer == NULL) {
    return NULL;
  }
  return pixelBuffer;
#else
  (void)viewTag;
  return NULL;
#endif // !TARGET_OS_OSX
}

@end
