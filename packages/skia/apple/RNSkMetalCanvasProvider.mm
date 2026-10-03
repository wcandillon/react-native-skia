#import "RNSkMetalCanvasProvider.h"

#import "RNDawnContext.h"
#import "RNSkLog.h"

RNSkMetalCanvasProvider::RNSkMetalCanvasProvider(
    std::shared_ptr<RNSkia::RNSkPlatformContext> context)
    : _context(std::move(context)) {
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

bool RNSkMetalCanvasProvider::getTargetInfo(
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
    requestRedraw();
    return false;
  }
  return static_cast<RNSkia::DawnWindowContext *>(_ctx.get())
      ->presentRecordings(recordings);
}

void RNSkMetalCanvasProvider::setSize(int width, int height) {
  _layer.frame = CGRectMake(0, 0, width, height);
  auto w = width * _context->getPixelDensity();
  auto h = height * _context->getPixelDensity();
  _ctx = RNSkia::DawnContext::getInstance().MakeWindow((__bridge void *)_layer,
                                                       w, h, _highBitDepth);
  {
    auto *window = static_cast<RNSkia::DawnWindowContext *>(_ctx.get());
    std::lock_guard<std::mutex> lock(_targetInfoMutex);
    _targetInfo.width = window->getWidth();
    _targetInfo.height = window->getHeight();
    _targetInfo.colorType = window->getColorType();
    _targetInfo.textureInfo = window->getTextureInfo();
    _hasTargetInfo = true;
  }
  requestRedraw();
}

CALayer *RNSkMetalCanvasProvider::getLayer() { return _layer; }

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
