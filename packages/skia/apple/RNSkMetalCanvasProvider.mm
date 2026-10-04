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

RNSkMetalCanvasProvider::RNSkMetalCanvasProvider(
    std::function<void()> requestRedraw,
    std::shared_ptr<RNSkia::RNSkPlatformContext> context, bool useP3ColorSpace)
    : RNSkCanvasProvider(requestRedraw), _context(context),
      _useP3ColorSpace(useP3ColorSpace) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  _layer = [CAMetalLayer layer];
  _layer.opaque = NO;
#pragma clang diagnostic pop
}

RNSkMetalCanvasProvider::~RNSkMetalCanvasProvider() {}

/**
 Returns the scaled width of the view
 */
int RNSkMetalCanvasProvider::getWidth() {
  return _ctx ? _ctx->getWidth() : -1;
};

/**
 Returns the scaled height of the view
 */
int RNSkMetalCanvasProvider::getHeight() {
  return _ctx ? _ctx->getHeight() : -1;
};

// Whether rendering must be skipped: drawing while the app is in the
// background can clear the CAMetalLayer, leaving the canvas empty when the app
// comes back (https://github.com/Shopify/react-native-skia/issues/1257). The
// application state is main-thread only, so this is answered there only.
static bool appIsBackgrounded() {
#if !TARGET_OS_OSX
  auto state = UIApplication.sharedApplication.applicationState;
  return state == UIApplicationStateBackground;
#else
  return NSApplication.sharedApplication.isHidden;
#endif // !TARGET_OS_OSX
}

/**
 Render to a canvas
 */
bool RNSkMetalCanvasProvider::renderToCanvas(
    const std::function<void(SkCanvas *)> &cb) {
  if (!_ctx) {
    return false;
  }

  if ([[NSThread currentThread] isMainThread]) {
    if (appIsBackgrounded()) {
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
bool RNSkMetalCanvasProvider::getGraphiteTargetInfo(
    RNSkia::RNSkGraphiteTargetInfo *info) {
  std::lock_guard<std::mutex> lock(_targetInfoMutex);
  if (!_hasTargetInfo) {
    return false;
  }
  *info = _targetInfo;
  return true;
}

bool RNSkMetalCanvasProvider::presentRecordings(
    const std::vector<skgpu::graphite::Recording *> &recordings) {
  if (!_ctx || ![[NSThread currentThread] isMainThread]) {
    return false;
  }
  if (appIsBackgrounded()) {
    _requestRedraw();
    return false;
  }
  return static_cast<RNSkia::DawnWindowContext *>(_ctx.get())
      ->presentRecordings(recordings);
}
#endif

void RNSkMetalCanvasProvider::setSize(int width, int height) {
  _layer.frame = CGRectMake(0, 0, width, height);
  auto w = width * _context->getPixelDensity();
  auto h = height * _context->getPixelDensity();
#if defined(SK_GRAPHITE)
  _ctx = RNSkia::DawnContext::getInstance().MakeWindow((__bridge void *)_layer,
                                                       w, h, _highBitDepth,
                                                       _opaque);
  {
    auto *window = static_cast<RNSkia::DawnWindowContext *>(_ctx.get());
    std::lock_guard<std::mutex> lock(_targetInfoMutex);
    _targetInfo.width = window->getWidth();
    _targetInfo.height = window->getHeight();
    _targetInfo.colorType = window->getColorType();
    _targetInfo.textureInfo = window->getTextureInfo();
    _hasTargetInfo = true;
  }
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

void RNSkMetalCanvasProvider::setOpaque(bool opaque) {
  if (_opaque == opaque) {
    return;
  }
  _opaque = opaque;
  _layer.opaque = opaque;
#if defined(SK_GRAPHITE)
  if (_ctx) {
    // Dawn applies the surface alpha mode to the layer when configuring it.
    setSize(_layer.frame.size.width, _layer.frame.size.height);
  }
#endif
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
