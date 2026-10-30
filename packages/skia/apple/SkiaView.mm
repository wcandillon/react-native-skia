#import "SkiaView.h"

#import <QuartzCore/CADisplayLink.h>
#import <QuartzCore/CATransaction.h>

#import <React/RCTConversions.h>
#import <React/RCTConvert.h>
#import <React/RCTFabricComponentsPlugins.h>

#import <react/renderer/components/rnskia/ComponentDescriptors.h>
#import <react/renderer/components/rnskia/EventEmitters.h>
#import <react/renderer/components/rnskia/Props.h>
#import <react/renderer/components/rnskia/RCTComponentViewHelpers.h>

#import <QuartzCore/CAMetalLayer.h>

#include <atomic>
#include <cmath>
#include <memory>
#include <utility>
#include <variant>

#import "RNSkManager.h"
#import "RNSkOverloaded.h"
#import "RNSkPresentedFrame.h"
#import "RNSkView.h"
#import "RNSkWindowSurface.h"
#import "RNSkiaModule.h"
#import "SkiaPresentedImageLayer.h"

using namespace facebook::react;

// Whether the window can show a frame: not while the app is in the background
// (hidden on macOS), where GPU work is refused and can leave the canvas empty
// when the app comes back
// (https://github.com/Shopify/react-native-skia/issues/1257). Read once when
// the view is created; the application's notifications keep it up to date
// from then on (see appDidEnterBackground:). The application state is
// main-thread only, so this is answered there only.
static bool appIsBackgrounded() {
#if !TARGET_OS_OSX
  auto state = UIApplication.sharedApplication.applicationState;
  return state == UIApplicationStateBackground;
#else
  return NSApplication.sharedApplication.isHidden;
#endif // !TARGET_OS_OSX
}

// The color space the colorSpace prop asks for: "srgb" or "display-p3",
// else (the prop is not set) the display's: Display P3 on a wide color gamut
// display, sRGB otherwise (see RNSkPlatformContext::prefersP3ColorSpace).
static bool
usesP3ColorSpace(const std::string &colorSpace,
                 const std::shared_ptr<RNSkia::RNSkPlatformContext> &context) {
  if (colorSpace == "srgb") {
    return false;
  }
  if (colorSpace == "display-p3") {
    return true;
  }
  return context->prefersP3ColorSpace();
}

namespace {

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
// A view presenting through its window: the CAMetalLayer the window surface
// attaches to while the view is in a superview, none while it is out of one
// (see willMoveToSuperview:), and the display link that presents its frames.
struct WindowPresentation {
  CAMetalLayer *layer;
#if !TARGET_OS_OSX
  CADisplayLink *displayLink;
  // Whether the display link asked for the display's full rate yet (see
  // requestFullFrameRate:).
  bool fullFrameRateRequested = false;
#else
  bool presentAgainScheduled = false;
#endif
};
#pragma clang diagnostic pop

// A static canvas: its frames are presented as images on the worker (see
// RNSkView::presentAsImages), in a layer of its own, which stays across a
// change of superview, and shown there (see presentedFrameOf:).
struct ImagePresentation {
  SkiaPresentedImageLayer *imageLayer;
  std::shared_ptr<RNSkia::RNSkPresentedFrame> presentedFrame;
};

// How the native view presents, from its making until the view is recycled.
using Presentation =
    std::variant<std::monostate, WindowPresentation, ImagePresentation>;

} // namespace

@implementation SkiaView {
  // The native view and its window surface, from the view's first superview
  // until it is recycled, and how it presents (see willMoveToSuperview:).
  std::shared_ptr<RNSkia::RNSkView> _view;
  std::shared_ptr<RNSkia::RNSkWindowSurface> _surface;
  Presentation _presentation;
  // Owned by the module (see finalizeUpdates:). A view can outlive its
  // manager: on a reload the module is invalidated on the JS thread while
  // Fabric still holds the views of the old bundle, which it deallocates
  // afterwards on the main thread. The weak reference makes that late
  // unregistration a no-op, and a concurrent one keep the manager alive for
  // the duration of the call.
  std::weak_ptr<RNSkia::RNSkManager> _manager;
  size_t _nativeId;
  bool _highBitDepth;
  // The colorSpace prop, see usesP3ColorSpace.
  std::string _colorSpace;
  // Whether the native view presents as images, a static canvas: read from
  // the props when the native view is made.
  bool _staticPresentation;
  // Advanced each time the view lets go of its frames (see releaseShownFrame):
  // an image the worker sent for frames let go of is not shown.
  uint64_t _presentedFrameGeneration;
  // Whether the window can show a frame (see appIsBackgrounded). Written on
  // the main thread, read where the view presents.
  std::shared_ptr<std::atomic<bool>> _canPresent;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _manager = [RNSkiaModule latestActiveSkManager];
    _nativeId = 0;
    _highBitDepth = false;
    _staticPresentation = false;
    _presentedFrameGeneration = 0;
    _canPresent = std::make_shared<std::atomic<bool>>(!appIsBackgrounded());
    static const auto defaultProps = std::make_shared<const SkiaViewProps>();
    _props = defaultProps;
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
#if !TARGET_OS_OSX
    [center addObserver:self
               selector:@selector(appDidEnterBackground:)
                   name:UIApplicationDidEnterBackgroundNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(appWillEnterForeground:)
                   name:UIApplicationWillEnterForegroundNotification
                 object:nil];
#else
    [center addObserver:self
               selector:@selector(appDidEnterBackground:)
                   name:NSApplicationDidHideNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(appWillEnterForeground:)
                   name:NSApplicationDidUnhideNotification
                 object:nil];
#endif
  }
  return self;
}

#pragma mark - Lifecycle

// The native view is created when the view first gets a superview and lives
// until the view is recycled, as on Android: what it shows stays with it
// while the view is out of its superview, where a scroll view that clips its
// subviews keeps the rows scrolled away. The window goes then, the layer with
// its drawables included, so that a view out of the hierarchy holds none; a
// static canvas has no window, and keeps its image.
#if !TARGET_OS_OSX
- (void)willMoveToSuperview:(UIView *)newSuperView {
  [super willMoveToSuperview:newSuperView];
#else
- (void)viewWillMoveToSuperview:(NSView *)newSuperView {
  [super viewWillMoveToSuperview:newSuperView];
#endif // !TARGET_OS_OSX
  auto manager = _manager.lock();
  if (newSuperView == nullptr || manager == nullptr) {
    return;
  }
  if (_view == nullptr) {
    [self makeNativeView:manager];
    return;
  }
  std::visit(RNSkia::Overloaded{
                 [](std::monostate) {},
                 [&](WindowPresentation &window) {
                   if (window.layer == nil) {
                     [self putBackWindow:window];
                   }
                 },
                 [](ImagePresentation &) {},
             },
             _presentation);
}

// The native view, its window surface and how it presents, as the props ask:
// read once, like the backing view on Android. What waits in the background
// is presented once the app is back (see appWillEnterForeground:).
- (void)makeNativeView:(const std::shared_ptr<RNSkia::RNSkManager> &)manager {
  auto context = manager->getPlatformContext();
  _surface = std::make_shared<RNSkia::RNSkWindowSurface>();
  _surface->setUseP3ColorSpace(usesP3ColorSpace(_colorSpace, context));
  auto canPresent = _canPresent;
  if (_staticPresentation) {
    // The images are 8-bit whatever the prop says, and the frames are
    // recorded for them from the first. The worker presents them.
    _surface->setHighBitDepth(false);
    _surface->setCanPresent([canPresent]() { return canPresent->load(); });
    _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
    _view->presentAsImages();
    ImagePresentation images{[SkiaPresentedImageLayer layer], nullptr};
    [self.layer addSublayer:images.imageLayer];
    _presentation = std::move(images);
  } else {
    // The window belongs to the main thread.
    _surface->setHighBitDepth(_highBitDepth);
    _surface->setCanPresent([canPresent]() {
      return [[NSThread currentThread] isMainThread] && canPresent->load();
    });
    _view = std::make_shared<RNSkia::RNSkView>(context, _surface);
    // The display link presents whatever is waiting on its next tick, a frame
    // for a resized window included: nothing shows before it anyway.
    __weak SkiaView *weakSelf = self;
    _view->setFrameScheduler(
        [weakSelf](bool /* forResizedWindow */) { [weakSelf scheduleFrame]; });
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
    WindowPresentation window{[CAMetalLayer layer]};
#pragma clang diagnostic pop
    [self.layer addSublayer:window.layer];
    _presentation = std::move(window);
  }
  if (_nativeId != 0) {
    manager->registerSkiaView(_nativeId, _view);
  }
  // AppKit lays out a view put in a superview only when asked: the layout
  // attaches the window's surface to the layer, or a static canvas's image
  // presenter (see layoutSubviews).
  [self setNeedsLayout];
}

// A view put back gets a new layer, with its last frame on it now: the layout
// comes after the Core Animation commit that carries the layer, which would
// show it empty for a frame or two.
- (void)putBackWindow:(WindowPresentation &)window {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
  window.layer = [CAMetalLayer layer];
#pragma clang diagnostic pop
  [self.layer addSublayer:window.layer];
  [self setNeedsLayout];
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  window.layer.frame =
      CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height);
  [self attachWindow:window];
  [CATransaction commit];
  if (!_surface->showsFrame()) {
    _view->redraw();
  }
}

- (void)removeFromSuperview {
  std::visit(RNSkia::Overloaded{
                 [](std::monostate) {},
                 [&](WindowPresentation &window) {
                   [self stopDisplayLink];
                   _surface->detach();
                   [window.layer removeFromSuperlayer];
                   window.layer = nil;
                 },
                 [](ImagePresentation &) {},
             },
             _presentation);
  [super removeFromSuperview];
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self stopDisplayLink];
  [self releaseShownFrame];
  [self unregisterView];
}

#pragma mark - Static presentation

// The frames a static canvas presents on the worker, which the layer shows on
// the main thread by image id, keeping the previous one until the next one's
// pixels arrive (see RNSkPresentedFrame).
- (std::shared_ptr<RNSkia::RNSkPresentedFrame>)presentedFrameOf:
    (ImagePresentation &)images {
  if (images.presentedFrame == nullptr) {
    __weak SkiaView *weakSelf = self;
    const auto generation = ++_presentedFrameGeneration;
    images.presentedFrame = std::make_shared<RNSkia::RNSkPresentedFrame>(
        _view->getPlatformContext(), [weakSelf, generation](uint32_t imageId) {
          dispatch_async(dispatch_get_main_queue(), ^{
            [weakSelf showPresentedImage:imageId ofGeneration:generation];
          });
        });
  }
  return images.presentedFrame;
}

- (void)showPresentedImage:(uint32_t)imageId ofGeneration:(uint64_t)generation {
  auto *images = std::get_if<ImagePresentation>(&_presentation);
  if (images != nullptr && _presentedFrameGeneration == generation) {
    [images->imageLayer showImageId:imageId];
  }
}

// Gives back the frames a static canvas holds: it is recycled or
// deallocated.
- (void)releaseShownFrame {
  auto *images = std::get_if<ImagePresentation>(&_presentation);
  if (images == nullptr) {
    return;
  }
  if (images->presentedFrame != nullptr) {
    images->presentedFrame->close();
    images->presentedFrame = nullptr;
    ++_presentedFrameGeneration;
  }
  [images->imageLayer showImageId:0];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [self stopDisplayLink];
  [self releaseShownFrame];
  // Unregistered first, so that the native view is destroyed here rather than
  // under the registry's lock.
  [self unregisterView];
  std::visit(RNSkia::Overloaded{
                 [](std::monostate) {},
                 [](WindowPresentation &window) {
                   [window.layer removeFromSuperlayer];
                 },
                 [](ImagePresentation &images) {
                   [images.imageLayer removeFromSuperlayer];
                 },
             },
             _presentation);
  _presentation = std::monostate{};
  _view = nullptr;
  _surface = nullptr;
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  if (updateMask == RNComponentViewUpdateMaskAll) {
    // this flag is only set when the view is inserted and we want to set the
    // manager here since the view could be recycled or the app could be
    // refreshed and we would have a stale manager then
    _manager = [RNSkiaModule latestActiveSkManager];
  }
}

// Once: a recycled view takes its next id from its props, and a pooled one
// must not unregister an id another view may have since.
- (void)unregisterView {
  auto manager = _manager.lock();
  if (manager != nullptr && _nativeId != 0) {
    manager->unregisterSkiaView(_nativeId);
  }
  _nativeId = 0;
}

#pragma mark - Application state

// The app went to the background (was hidden on macOS): frames wait there.
- (void)appDidEnterBackground:(NSNotification *)notification {
  _canPresent->store(false);
}

// The app is coming back: what waited is presented on the view's next frame.
- (void)appWillEnterForeground:(NSNotification *)notification {
  _canPresent->store(true);
  if (_view != nullptr) {
    _view->onCanPresent();
  }
}

#pragma mark - Frames

// Presents on the display link: armed when a recording is submitted, paused
// again once the queue is empty. macOS has no CADisplayLink on the minimum
// deployment target, so frames are presented as soon as the main thread gets
// to them there, and tried again a frame later while some are left (more were
// submitted meanwhile, or the window could not take one).
- (void)scheduleFrame {
  auto *window = std::get_if<WindowPresentation>(&_presentation);
  // Without a window the frames wait: attaching one redraws them.
  if (window == nullptr || !_surface->isAttached()) {
    return;
  }
#if !TARGET_OS_OSX
  if (window->displayLink == nil) {
    window->displayLink =
        [CADisplayLink displayLinkWithTarget:self selector:@selector(onFrame:)];
    [window->displayLink addToRunLoop:[NSRunLoop mainRunLoop]
                              forMode:NSRunLoopCommonModes];
  }
  [self requestFullFrameRate:*window];
  window->displayLink.paused = NO;
#else
  if (_view->presentFrame() & RNSkia::RNSkView::kMoreQueued) {
    [self presentAgainLater:*window];
  }
#endif
}

#if !TARGET_OS_OSX
// A display link fires at 60 Hz until it asks for more, also while the
// display already runs at 120 Hz for another link (Reanimated asks for 120):
// a 120 Hz producer would then be presented every other frame. Ask for the
// display's full rate once the view knows its screen. On iPhone this needs
// CADisableMinimumFrameDurationOnPhone in the app's Info.plist too, else iOS
// caps every link at 60 Hz. The link is paused while nothing is queued, so an
// idle view does not keep the display at its full rate.
- (void)requestFullFrameRate:(WindowPresentation &)window {
#if !TARGET_OS_VISION
  if (window.fullFrameRateRequested) {
    return;
  }
  UIScreen *screen = self.window.screen;
  if (screen == nil) {
    return;
  }
  window.fullFrameRateRequested = true;
  const float maxFps = (float)screen.maximumFramesPerSecond;
  if (maxFps > 60) {
    window.displayLink.preferredFrameRateRange =
        CAFrameRateRangeMake(60, maxFps, maxFps);
  }
#endif
}

- (void)onFrame:(CADisplayLink *)link {
  if (_view == nullptr ||
      !(_view->presentFrame() & RNSkia::RNSkView::kMoreQueued)) {
    link.paused = YES;
  }
}
#else
- (void)presentAgainLater:(WindowPresentation &)window {
  if (window.presentAgainScheduled) {
    return;
  }
  window.presentAgainScheduled = true;
  __weak SkiaView *weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC / 60),
                 dispatch_get_main_queue(), ^{
                   [weakSelf presentAgain];
                 });
}

- (void)presentAgain {
  auto *window = std::get_if<WindowPresentation>(&_presentation);
  if (window == nullptr) {
    return;
  }
  window->presentAgainScheduled = false;
  [self scheduleFrame];
}
#endif

- (void)stopDisplayLink {
#if !TARGET_OS_OSX
  auto *window = std::get_if<WindowPresentation>(&_presentation);
  if (window == nullptr) {
    return;
  }
  [window->displayLink invalidate];
  window->displayLink = nil;
#endif
}

#pragma mark - Render

- (void)drawRect:(CGRect)rect {
  // The OS asked for a draw: a window presents what the view holds right
  // away; a static canvas's layer keeps the image it shows, and its frames
  // are presented on the worker.
  if (std::holds_alternative<WindowPresentation>(_presentation)) {
    _view->redraw();
  }
}

#pragma mark - Layout

- (void)layoutSubviews {
  [super layoutSubviews];
  const CGRect frame =
      CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height);
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  std::visit(RNSkia::Overloaded{
                 [](std::monostate) {},
                 [&](WindowPresentation &window) {
                   // Out of a superview the view has no layer to attach.
                   if (window.layer != nil) {
                     window.layer.frame = frame;
                     [self attachWindow:window];
                   }
                 },
                 [&](ImagePresentation &images) {
                   images.imageLayer.frame = frame;
                   [self attachImagePresenter:images];
                 },
             },
             _presentation);
  [CATransaction commit];
}

// The view's size in pixels. The layout is on the pixel grid: rounded rather
// than truncated, a product like 1169.9999 gives the pixel size it means.
- (std::pair<int, int>)pixelSize {
  const float pd = _view->getPlatformContext()->getPixelDensity();
  return {static_cast<int>(std::lround(self.bounds.size.width * pd)),
          static_cast<int>(std::lround(self.bounds.size.height * pd))};
}

// Configures the layer as the Dawn surface of the view at its current size:
// on every layout, and again when the bit depth or the color space changes so
// that the layer's pixel format and color space follow.
- (void)attachWindow:(WindowPresentation &)window {
  const auto [width, height] = [self pixelSize];
  _surface->setLayoutSize(width, height);
  if (width == 0 || height == 0) {
    // Dawn refuses an empty surface: without one the frames wait for a size.
    _surface->detach();
    return;
  }
  // The layer is owned by the view: nothing to release with the window.
  _surface->attach((__bridge void *)window.layer, width, height, _highBitDepth,
                   usesP3ColorSpace(_colorSpace, _view->getPlatformContext()),
                   nullptr);
}

// A static canvas presents into images of the view's size, and keeps the last
// one while it has no size.
- (void)attachImagePresenter:(ImagePresentation &)images {
  const auto [width, height] = [self pixelSize];
  _surface->setLayoutSize(width, height);
  if (width == 0 || height == 0) {
    return;
  }
  if (!_surface->isAttached()) {
    [self attachImagePresenter:images width:width height:height];
  } else if (_surface->getWidth() != width || _surface->getHeight() != height) {
    _surface->resize(width, height);
  }
}

// The presenter of a static canvas's images, at a size in pixels and in the
// color space the props ask for.
- (void)attachImagePresenter:(ImagePresentation &)images
                       width:(int)width
                      height:(int)height {
  auto presentedFrame = [self presentedFrameOf:images];
  _surface->attachImagePresenter(
      width, height, usesP3ColorSpace(_colorSpace, _view->getPlatformContext()),
      [presentedFrame](const sk_sp<SkImage> &frame) {
        presentedFrame->present(frame);
      });
}

#pragma mark - Props

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<SkiaViewComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props
           oldProps:(const Props::Shared &)oldProps {
  const auto &newProps = *std::static_pointer_cast<const SkiaViewProps>(props);
  [super updateProps:props oldProps:oldProps];
  int nativeId =
      [[RCTConvert NSString:RCTNSStringFromString(newProps.nativeId)] intValue];
  [self bindNativeId:nativeId];
  // Read when the native view is made, like the backing view on Android.
  if (_view == nullptr) {
    _staticPresentation = newProps.staticPresentation;
  }
  [self setHighBitDepth:newProps.highBitDepth];
  [self setColorSpace:newProps.colorSpace];
  // The android* props (backing view, opacity, z-order) select and set up the
  // backing view on Android; a CAMetalLayer composites like any other layer.
}

// Not setNativeId:, which is the setter of RCTViewComponentView's nativeId
// (the string Fabric assigns from the nativeID prop).
- (void)bindNativeId:(size_t)nativeId {
  _nativeId = nativeId;
  auto manager = _manager.lock();
  if (_view != nullptr && manager != nullptr) {
    manager->registerSkiaView(nativeId, _view);
  }
}

- (void)setHighBitDepth:(bool)highBitDepth {
  if (_highBitDepth == highBitDepth) {
    return;
  }
  _highBitDepth = highBitDepth;
  // A static canvas's images keep the 8-bit format.
  auto *window = std::get_if<WindowPresentation>(&_presentation);
  if (window == nullptr) {
    return;
  }
  // The layer is re-attached with the new format; until then (or without a
  // size), frames are recorded for it.
  _surface->setHighBitDepth(highBitDepth);
  if (_surface->isAttached()) {
    [self attachWindow:*window];
  }
}

- (void)setColorSpace:(const std::string &)colorSpace {
  if (_colorSpace == colorSpace) {
    return;
  }
  _colorSpace = colorSpace;
  if (_surface == nullptr) {
    return;
  }
  // The window, or a static canvas's image presenter, is attached again in
  // the new color space: now if it is attached, else when it next is.
  _surface->setUseP3ColorSpace(
      usesP3ColorSpace(_colorSpace, _view->getPlatformContext()));
  if (!_surface->isAttached()) {
    return;
  }
  std::visit(
      RNSkia::Overloaded{
          [](std::monostate) {},
          [&](WindowPresentation &window) { [self attachWindow:window]; },
          [&](ImagePresentation &images) {
            [self attachImagePresenter:images
                                 width:_surface->getWidth()
                                height:_surface->getHeight()];
          },
      },
      _presentation);
}

@end

Class<RCTComponentViewProtocol> SkiaViewCls(void) { return SkiaView.class; }
