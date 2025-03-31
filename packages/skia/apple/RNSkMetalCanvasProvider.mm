#import "RNSkMetalCanvasProvider.h"

#import "RNSkLog.h"

#if defined(SK_GRAPHITE)
#import "DawnContext.h"
#else
#import "MetalContext.h"
#endif

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import "include/core/SkCanvas.h"
#import "include/core/SkColorSpace.h"
#import "include/core/SkSurface.h"

#import <include/gpu/ganesh/GrBackendSurface.h>
#import <include/gpu/ganesh/GrDirectContext.h>
#import <include/gpu/ganesh/SkSurfaceGanesh.h>

#pragma clang diagnostic pop

RNSkMetalCanvasProvider::RNSkMetalCanvasProvider(
    std::function<void()> requestRedraw,
    std::shared_ptr<RNSkia::RNSkPlatformContext> context)
    : RNSkCanvasProvider(requestRedraw), _context(context) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
}

RNSkMetalCanvasProvider::~RNSkMetalCanvasProvider() {}

/**
 Returns the scaled width of the view
 */
int RNSkMetalCanvasProvider::getScaledWidth() {
  return _ctx ? _ctx->getWidth() : -1;
};

/**
 Returns the scaled height of the view
 */
int RNSkMetalCanvasProvider::getScaledHeight() {
  return _ctx ? _ctx->getHeight() : -1;
};

/**
 Render to a canvas
 */
bool RNSkMetalCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  if (!_ctx) {
    return false;
  }

  // Make sure to NOT render or try any render operations while we're in the
  // background or inactive. This will cause an error that might clear the
  // CAMetalLayer so that the canvas is empty when the app receives focus again.
  // Reference: https://github.com/Shopify/react-native-skia/issues/1257
  // NOTE: UIApplication.sharedApplication.applicationState can only be
  // accessed from the main thread so we need to check here.
  if ([[NSThread currentThread] isMainThread]) {
#if !TARGET_OS_OSX
    auto state = UIApplication.sharedApplication.applicationState;
    bool appIsBackgrounded = (state == UIApplicationStateBackground);
#else
    bool appIsBackgrounded = !NSApplication.sharedApplication.isActive;
#endif // !TARGET_OS_OSX
    if (appIsBackgrounded) {
      // Request a redraw in the next run loop callback
      _requestRedraw();
      // and don't draw now since it might cause errors in the metal renderer if
      // we try to render while in the background. (see above issue)
      return false;
    }
  }
  // Wrap in auto release pool since we want the system to clean up after
  // rendering and not wait until later - we've seen some example of memory
  // usage growing very fast in the simulator without this.
  @autoreleasepool {
    auto surface = _ctx->getSurface();
    if (!surface) {
      return false;
    }
    auto canvas = surface->getCanvas();
    cb(canvas);
    _ctx->present();
  }
  return true;
};

void RNSkMetalCanvasProvider::setSize(int width, int height) {
  _layer.frame = CGRectMake(0, 0, width, height);
  auto w = width * _context->getPixelDensity();
  auto h = height * _context->getPixelDensity();
#if defined(SK_GRAPHITE)
  _ctx = RNSkia::DawnContext::getInstance().MakeWindow((__bridge void *)_layer,
                                                       w, h);
#else
  _ctx = MetalContext::getInstance().MakeWindow(_layer, w, h);
#endif
  _requestRedraw();
}

CALayer *RNSkMetalCanvasProvider::getLayer() { return _layer; }
