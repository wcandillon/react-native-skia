#import "RNSkMetalCanvasProvider.h"

#import "DawnContext.h"
#import "RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import "include/core/SkCanvas.h"
#import "include/core/SkColorSpace.h"
#import "include/core/SkSurface.h"

#import <include/gpu/ganesh/GrBackendSurface.h>
#import <include/gpu/ganesh/GrDirectContext.h>
#import <include/gpu/ganesh/SkSurfaceGanesh.h>

#pragma clang diagnostic pop

// TODO: to delete, the canvas provider is now non-platform specific
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
float RNSkMetalCanvasProvider::getScaledWidth() { return _width; };

/**
 Returns the scaled height of the view
 */
float RNSkMetalCanvasProvider::getScaledHeight() { return _height; };

/**
 Render to a canvas
 */
bool RNSkMetalCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  if (_width <= 0 || _height <= 0) {
    return false;
  }

  // Make sure to NOT render or try any render operations while we're in the
  // background or inactive. This will cause an error that might clear the
  // CAMetalLayer so that the canvas is empty when the app receives focus again.
  // Reference: https://github.com/Shopify/react-native-skia/issues/1257
  // NOTE: UIApplication.sharedApplication.applicationState can only be
  // accessed from the main thread so we need to check here.
  if ([[NSThread currentThread] isMainThread]) {
    auto state = UIApplication.sharedApplication.applicationState;
    if (state == UIApplicationStateBackground) {
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
    id<CAMetalDrawable> currentDrawable = [_layer nextDrawable];
    if (currentDrawable == nullptr) {
      return false;
    }
    auto ctx = RNSkia::DawnContext::getInstance().MakeWindow(
        (__bridge void *)_layer, _width, _height);
    auto skSurface = ctx->getSurface();

    SkCanvas *canvas = skSurface->getCanvas();
    cb(canvas);

    if (auto dContext = GrAsDirectContext(skSurface->recordingContext())) {
      dContext->flushAndSubmit();
    }

    ctx->present();
  }
  return true;
};

void RNSkMetalCanvasProvider::setSize(int width, int height) {
  _layer.frame = CGRectMake(0, 0, width, height);
  _width = width * _context->getPixelDensity();
  _height = height * _context->getPixelDensity();
  _requestRedraw();
}

CALayer *RNSkMetalCanvasProvider::getLayer() { return _layer; }
