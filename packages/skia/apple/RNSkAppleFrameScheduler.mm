#import "RNSkAppleFrameScheduler.h"

#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX
@interface RNSkFrameSchedulerTarget : NSObject
@property(nonatomic, assign) std::weak_ptr<RNSkAppleFrameScheduler> scheduler;
- (void)displayLinkFired:(CADisplayLink *)sender;
@end

@implementation RNSkFrameSchedulerTarget
- (void)displayLinkFired:(CADisplayLink *)sender {
  if (auto scheduler = _scheduler.lock()) {
    scheduler->onVsync();
  }
}
@end
#else
static CVReturn RNSkDisplayLinkCallback(CVDisplayLinkRef, const CVTimeStamp *,
                                        const CVTimeStamp *, CVOptionFlags,
                                        CVOptionFlags *, void *context) {
  auto *weakScheduler =
      static_cast<std::weak_ptr<RNSkAppleFrameScheduler> *>(context);
  auto scheduler = weakScheduler->lock();
  if (!scheduler) {
    return kCVReturnSuccess;
  }
  // CVDisplayLink fires on its own thread; presentation happens on main.
  dispatch_async(dispatch_get_main_queue(), ^{
    scheduler->onVsync();
  });
  return kCVReturnSuccess;
}
#endif

RNSkAppleFrameScheduler::RNSkAppleFrameScheduler(std::function<void()> onFrame)
    : _onFrame(std::move(onFrame)) {}

RNSkAppleFrameScheduler::~RNSkAppleFrameScheduler() {
#if !TARGET_OS_OSX
  // The view owning this scheduler may be released on any thread; the link
  // belongs to the main run loop.
  CADisplayLink *link = _displayLink;
  _displayLink = nullptr;
  _target = nullptr;
  if (link) {
    if ([NSThread isMainThread]) {
      [link invalidate];
    } else {
      dispatch_async(dispatch_get_main_queue(), ^{
        [link invalidate];
      });
    }
  }
#else
  if (_displayLink) {
    CVDisplayLinkStop(_displayLink);
    CVDisplayLinkRelease(_displayLink);
    _displayLink = nullptr;
  }
#endif
}

void RNSkAppleFrameScheduler::requestFrame() {
  {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_armed) {
      return;
    }
    _armed = true;
  }
  // The link is armed on the main thread: CADisplayLink must be added to the
  // main run loop, and pausing/unpausing from a worklet thread would race
  // with the callback.
  std::weak_ptr<RNSkAppleFrameScheduler> weakThis = shared_from_this();
  dispatch_async(dispatch_get_main_queue(), ^{
    if (auto strongThis = weakThis.lock()) {
      strongThis->armOnMainThread();
    }
  });
}

void RNSkAppleFrameScheduler::armOnMainThread() {
#if !TARGET_OS_OSX
  if (!_displayLink) {
    RNSkFrameSchedulerTarget *target = [[RNSkFrameSchedulerTarget alloc] init];
    target.scheduler = weak_from_this();
    _target = target;
    _displayLink =
        [CADisplayLink displayLinkWithTarget:target
                                    selector:@selector(displayLinkFired:)];
    // Ask for the display's full rate on ProMotion devices (120 Hz); the
    // system falls back to 60 elsewhere. On iPhone this also needs
    // CADisableMinimumFrameDurationOnPhone=YES in the app's Info.plist.
    if (@available(iOS 15.0, tvOS 15.0, *)) {
      _displayLink.preferredFrameRateRange = CAFrameRateRangeMake(80, 120, 120);
    }
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop]
                       forMode:NSRunLoopCommonModes];
  }
  _displayLink.paused = NO;
#else
  if (!_displayLink) {
    CVDisplayLinkCreateWithActiveCGDisplays(&_displayLink);
    // Leaked on purpose: the display link outlives nothing but this object,
    // whose destructor stops it before the pointer could be dereferenced.
    auto *weakThis =
        new std::weak_ptr<RNSkAppleFrameScheduler>(weak_from_this());
    CVDisplayLinkSetOutputCallback(_displayLink, &RNSkDisplayLinkCallback,
                                   weakThis);
  }
  if (!CVDisplayLinkIsRunning(_displayLink)) {
    CVDisplayLinkStart(_displayLink);
  }
#endif
}

void RNSkAppleFrameScheduler::onVsync() {
  {
    std::lock_guard<std::mutex> lock(_mutex);
    _armed = false;
  }
  // Disarm before running the frame: a request made during the callback
  // (another recording arrived) re-arms for the following vsync.
#if !TARGET_OS_OSX
  _displayLink.paused = YES;
#else
  if (_displayLink) {
    CVDisplayLinkStop(_displayLink);
  }
#endif
  _onFrame();
}
