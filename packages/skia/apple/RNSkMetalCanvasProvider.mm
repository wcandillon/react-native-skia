#import "RNSkMetalCanvasProvider.h"

#import "RNSkLog.h"

#if defined(SK_GRAPHITE)
#import "RNDawnContext.h"
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

namespace {
std::atomic<bool> gBackgrounded{false};

// Registered once, on first use (the main thread): the notifications are
// posted on the main thread and only flip the flag.
void observeAppState() {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
#if !TARGET_OS_OSX
    auto center = NSNotificationCenter.defaultCenter;
    gBackgrounded = UIApplication.sharedApplication.applicationState ==
                    UIApplicationStateBackground;
    [center addObserverForName:UIApplicationDidEnterBackgroundNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      gBackgrounded = true;
                    }];
    [center addObserverForName:UIApplicationWillEnterForegroundNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      gBackgrounded = false;
                    }];
#else
    gBackgrounded = NSApplication.sharedApplication.isHidden;
    auto center = NSNotificationCenter.defaultCenter;
    [center addObserverForName:NSApplicationDidHideNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      gBackgrounded = true;
                    }];
    [center addObserverForName:NSApplicationDidUnhideNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      gBackgrounded = false;
                    }];
#endif
  });
}
} // namespace

bool RNSkMetalCanvasProvider::isBackgrounded() { return gBackgrounded; }

RNSkMetalCanvasProvider::RNSkMetalCanvasProvider(
    std::function<void()> requestRedraw,
    std::shared_ptr<RNSkia::RNSkPlatformContext> context, bool useP3ColorSpace)
    : RNSkCanvasProvider(requestRedraw), _context(context),
      _useP3ColorSpace(useP3ColorSpace) {
  observeAppState();
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
}

RNSkMetalCanvasProvider::~RNSkMetalCanvasProvider() {}

/**
 Returns the scaled width of the view
 */
int RNSkMetalCanvasProvider::getWidth() {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  return _ctx ? _ctx->getWidth() : -1;
};

/**
 Returns the scaled height of the view
 */
int RNSkMetalCanvasProvider::getHeight() {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  return _ctx ? _ctx->getHeight() : -1;
};

/**
 Render to a canvas
 */
bool RNSkMetalCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
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
    bool appIsBackgrounded = NSApplication.sharedApplication.isHidden;
#endif // !TARGET_OS_OSX
    if (appIsBackgrounded) {
      // Request a redraw in the next run loop callback
      _requestRedraw();
      // and don't draw now since it might cause errors in the metal renderer if
      // we try to render while in the background. (see above issue)
      return false;
    }

    auto surface = _ctx->getSurface();
    if (!surface) {
      return false;
    }
    auto canvas = surface->getCanvas();
    cb(canvas);
    _ctx->present();
    return true;
  }
  return false;
};

#if defined(SK_GRAPHITE)
std::optional<RNSkia::RNSkDeferredTarget>
RNSkMetalCanvasProvider::getDeferredTarget() {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  if (!_ctx) {
    return std::nullopt;
  }
  return _ctx->getDeferredTarget();
}

bool RNSkMetalCanvasProvider::presentRecording(
    skgpu::graphite::Recording *recording) {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  if (!_ctx) {
    return false;
  }
  // Same background guard as renderToCanvas: presenting while backgrounded
  // can clear the CAMetalLayer (#1257). The frame stays pending and the
  // display link, which does not fire in the background, replays it on
  // foregrounding. Any thread: the state is tracked from notifications.
  if (isBackgrounded()) {
    _requestRedraw();
    return false;
  }
  return _ctx->presentRecording(recording);
}

bool RNSkMetalCanvasProvider::insertRecording(
    skgpu::graphite::Recording *recording) {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  if (!_ctx || isBackgrounded()) {
    return false;
  }
  return _ctx->insertRecording(recording);
}

bool RNSkMetalCanvasProvider::presentInserted() {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  return _ctx != nullptr && _ctx->presentInserted();
}
#endif

void RNSkMetalCanvasProvider::setSize(int width, int height) {
  std::lock_guard<std::recursive_mutex> lock(_ctxMutex);
  _layer.frame = CGRectMake(0, 0, width, height);
  auto w = width * _context->getPixelDensity();
  auto h = height * _context->getPixelDensity();
#if defined(SK_GRAPHITE)
  _ctx = RNSkia::DawnContext::getInstance().MakeWindow((__bridge void *)_layer,
                                                       w, h, _highBitDepth);
#else
  _ctx = MetalContext::getInstance().MakeWindow(_layer, w, h, _useP3ColorSpace,
                                                _highBitDepth);
#endif
  _requestRedraw();
}

CALayer *RNSkMetalCanvasProvider::getLayer() { return _layer; }

void RNSkMetalCanvasProvider::setUseP3ColorSpace(bool useP3ColorSpace) {
  _useP3ColorSpace = useP3ColorSpace;
}

void RNSkMetalCanvasProvider::setHighBitDepth(bool highBitDepth) {
  if (_highBitDepth == highBitDepth) {
    return;
  }
  _highBitDepth = highBitDepth;
  if (_ctx) {
    // Recreate the window context so the layer's pixel format matches the
    // new bit depth.
    setSize(_layer.frame.size.width, _layer.frame.size.height);
  }
}
