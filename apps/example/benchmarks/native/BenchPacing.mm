// Example-only measurement. No hooks in production Skia or its present thread.
#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>
#import <React/RCTLog.h>
#import <Metal/Metal.h>
#import <QuartzCore/CAMetalLayer.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#include <memory>
#include <mutex>
#include <vector>
#include <unistd.h>

namespace {
constexpr size_t kCapacity = 60000;
NSString *const kFile = @"skia-benchmark-pacing.json";
NSString *const kMarkerPrefix = @"[bench-pacing] ";

struct Frame {
  uint64_t id;
  double acquired;
  double presented = 0;
  double callback = 0;
  bool completed = false;
};
struct Capture {
  __weak CAMetalLayer *layer;
  NSString *fixture;
  NSString *session;
  NSMutableArray *markers;
  RCTLogFunction previousLogger;
  RCTLogFunction markerLogger;
  std::mutex mutex;
  std::vector<Frame> frames;
  size_t acquiring = 0, pending = 0, overflow = 0;
  bool accepting = true, interrupted = false, finishing = false;
  double stopped = 0;
  bool lowPowerAtStart;
  bool previousIdleTimerDisabled;
  NSProcessInfoThermalState thermalAtStart;
  Capture(CAMetalLayer *value, NSString *hash, NSString *owner)
      : layer(value), fixture([hash copy]), session([owner copy]),
        lowPowerAtStart(NSProcessInfo.processInfo.lowPowerModeEnabled),
        previousIdleTimerDisabled(UIApplication.sharedApplication.idleTimerDisabled),
        thermalAtStart(NSProcessInfo.processInfo.thermalState) {
    frames.reserve(kCapacity);
    markers = [NSMutableArray arrayWithCapacity:4096];
  }
};
std::mutex captureMutex;
std::shared_ptr<Capture> current;
IMP originalNextDrawable = nullptr;

NSString *outputPath() {
  return [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject
      stringByAppendingPathComponent:kFile];
}

// MARK: Observe only the selected Canvas layer, only while pacing runs.
#if TARGET_OS_IOS && !TARGET_OS_MACCATALYST
id<CAMetalDrawable> observedNextDrawable(CAMetalLayer *layer, SEL selector) {
  std::shared_ptr<Capture> capture;
  IMP original;
  {
    std::lock_guard<std::mutex> lock(captureMutex);
    capture = current;
    original = originalNextDrawable;
  }
  bool observe = false;
  if (capture && capture->layer == layer) {
    std::lock_guard<std::mutex> lock(capture->mutex);
    observe = capture->accepting;
    if (observe) ++capture->acquiring;
  }
  // Call the saved IMP, not a second method lookup: restoring the hook while
  // this call is in flight must not recurse or change which method it invokes.
  auto drawable = reinterpret_cast<id<CAMetalDrawable> (*)(id, SEL)>(original)(layer, selector);
  if (!observe) return drawable;
  size_t index = 0;
  bool attach = false;
  {
    std::lock_guard<std::mutex> lock(capture->mutex);
    --capture->acquiring;
    if (drawable != nil) {
      if (capture->frames.size() == kCapacity) {
        ++capture->overflow;
      } else {
        index = capture->frames.size();
        capture->frames.push_back({drawable.drawableID, CACurrentMediaTime()});
        ++capture->pending;
        attach = true;
      }
    }
  }
  if (attach) {
    [drawable addPresentedHandler:^(id<MTLDrawable> shown) {
      // Arrival can be late. The drawable's host-time feedback is the metric,
      // never this callback's arrival time or the CPU's present() return time.
      const double actual = shown.presentedTime;
      const double callback = CACurrentMediaTime();
      std::lock_guard<std::mutex> lock(capture->mutex);
      auto &frame = capture->frames[index];
      if (frame.completed) { capture->interrupted = true; return; }
      frame.presented = actual;
      frame.callback = callback;
      frame.completed = true;
      --capture->pending;
    }];
  }
  return drawable;
}
#endif

void stopObserving(const std::shared_ptr<Capture> &capture) {
  {
    std::lock_guard<std::mutex> lock(capture->mutex);
    capture->accepting = false;
    capture->stopped = CACurrentMediaTime();
  }
  if (RCTGetLogFunction() == capture->markerLogger) {
    RCTSetLogFunction(capture->previousLogger);
  } else {
    std::lock_guard<std::mutex> lock(capture->mutex);
    capture->interrupted = true;
  }
#if TARGET_OS_IOS && !TARGET_OS_MACCATALYST
  Method method = class_getInstanceMethod(CAMetalLayer.class, @selector(nextDrawable));
  if (method_getImplementation(method) == reinterpret_cast<IMP>(observedNextDrawable)) {
    method_setImplementation(method, originalNextDrawable);
  } else {
    // Do not overwrite an unrelated hook installed while this capture ran.
    std::lock_guard<std::mutex> lock(capture->mutex);
    capture->interrupted = true;
  }
#endif
}

void findView(UIView *view, NSString *testId, NSMutableArray<UIView *> *matches) {
  if ([view.accessibilityIdentifier isEqualToString:testId]) [matches addObject:view];
  for (UIView *child in view.subviews) findView(child, testId, matches);
}
void findLayers(CALayer *layer, NSMutableArray<CAMetalLayer *> *matches) {
  if ([layer isKindOfClass:CAMetalLayer.class]) [matches addObject:(CAMetalLayer *)layer];
  for (CALayer *child in layer.sublayers) findLayers(child, matches);
}
} // namespace

@interface BenchPacing : NSObject <RCTBridgeModule, RCTInvalidating> {
  NSUInteger _generation;
  NSString *_startingSession;
}
@end

@implementation BenchPacing
RCT_EXPORT_MODULE(BenchPacing)
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

// MARK: Start after Fabric has mounted the tagged benchmark Canvas.
RCT_EXPORT_METHOD(start:(NSString *)fixture
                  testId:(NSString *)testId
                  session:(NSString *)session
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
#if TARGET_OS_IOS && !TARGET_OS_MACCATALYST && !TARGET_OS_SIMULATOR
  if (fixture.length == 0 || testId.length == 0 || session.length == 0) {
    reject(@"invalid", @"Pacing fixture and Canvas testID are required", nil);
    return;
  }
  {
    std::lock_guard<std::mutex> lock(captureMutex);
    if (current || _startingSession) { reject(@"busy", @"A pacing capture is already active", nil); return; }
  }
  NSError *error = nil;
  if ([[NSFileManager defaultManager] fileExistsAtPath:outputPath()] &&
      ![[NSFileManager defaultManager] removeItemAtPath:outputPath() error:&error]) {
    reject(@"stale", @"Could not remove the previous capture", error);
    return;
  }
  _startingSession = [session copy];
  [self startWhenMounted:fixture testId:testId session:session generation:++_generation
                attempt:0 resolve:resolve reject:reject];
#else
  reject(@"unsupported", @"Pacing feedback requires a physical iPhone", nil);
#endif
}

- (void)startWhenMounted:(NSString *)fixture testId:(NSString *)testId
                session:(NSString *)session generation:(NSUInteger)generation
                attempt:(int)attempt resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  if (generation != _generation) {
    reject(@"cancelled", @"Pacing start was cancelled", nil);
    return;
  }
  NSMutableArray<UIView *> *views = [NSMutableArray new];
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class] || scene.activationState != UISceneActivationStateForegroundActive) continue;
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (!window.hidden) findView(window, testId, views);
    }
  }
  if (views.count == 0 && attempt < 20) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 50 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
      [self startWhenMounted:fixture testId:testId session:session generation:generation
                    attempt:attempt + 1 resolve:resolve reject:reject];
    });
    return;
  }
  NSMutableArray<CAMetalLayer *> *layers = [NSMutableArray new];
  if (views.count == 1) findLayers(views.firstObject.layer, layers);
  if (views.count != 1 || layers.count != 1) {
    _startingSession = nil;
    reject(@"canvas", @"Expected one visible benchmark Canvas and one Metal layer", nil);
    return;
  }
#if TARGET_OS_IOS && !TARGET_OS_MACCATALYST
  auto capture = std::make_shared<Capture>(layers.firstObject, fixture, session);
  capture->previousLogger = RCTGetLogFunction();
  // The workload calls RN's native host logger synchronously on UI. Capture
  // that boundary in the same host clock as presentedTime; no bridge hop,
  // Instruments process discovery or cross-clock alignment is needed.
  std::weak_ptr<Capture> weak = capture;
  RCTLogFunction previousLogger = capture->previousLogger;
  capture->markerLogger = ^(RCTLogLevel level, RCTLogSource source, NSString *file, NSNumber *line, NSString *message) {
    const double at = CACurrentMediaTime();
    if ([message hasPrefix:kMarkerPrefix]) {
      if (auto owner = weak.lock()) {
        NSData *json = [[message substringFromIndex:kMarkerPrefix.length] dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *event = [NSJSONSerialization JSONObjectWithData:json options:0 error:nil];
        if ([event isKindOfClass:NSDictionary.class] &&
            [event[@"session"] isEqual:owner->session] &&
            [event[@"fixture"] isEqual:owner->fixture]) {
          std::lock_guard<std::mutex> lock(owner->mutex);
          if (owner->accepting) {
            if (owner->markers.count == 10000) ++owner->overflow;
            else [owner->markers addObject:@[@(at), event]];
          }
        }
      }
    }
    if (previousLogger) previousLogger(level, source, file, line, message);
  };
  {
    std::lock_guard<std::mutex> lock(captureMutex);
    current = capture;
    Method method = class_getInstanceMethod(CAMetalLayer.class, @selector(nextDrawable));
    originalNextDrawable = method_getImplementation(method);
    method_setImplementation(method, reinterpret_cast<IMP>(observedNextDrawable));
  }
  RCTSetLogFunction(capture->markerLogger);
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(interrupted)
      name:UIApplicationWillResignActiveNotification object:nil];
  UIApplication.sharedApplication.idleTimerDisabled = YES;
  _startingSession = nil;
  resolve(@YES);
#endif
}

- (void)interrupted {
  std::lock_guard<std::mutex> lock(captureMutex);
  if (current) {
    std::lock_guard<std::mutex> stateLock(current->mutex);
    current->interrupted = true;
  }
}

// MARK: Drain callbacks and write only after all measured windows finish.
RCT_EXPORT_METHOD(finish:(NSString *)session resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  std::shared_ptr<Capture> capture;
  { std::lock_guard<std::mutex> lock(captureMutex); capture = current; }
  if (!capture || ![capture->session isEqualToString:session] || capture->finishing) {
    reject(@"inactive", @"No matching pacing capture is active", nil); return;
  }
  capture->finishing = true;
  stopObserving(capture);
  [self finishWhenDrained:capture deadline:CACurrentMediaTime() + 2 resolve:resolve reject:reject];
}

- (void)finishWhenDrained:(std::shared_ptr<Capture>)capture deadline:(double)deadline
                 resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  {
    std::lock_guard<std::mutex> lock(captureMutex);
    if (current != capture) {
      reject(@"cancelled", @"Pacing capture was aborted", nil);
      return;
    }
  }
  bool pending;
  { std::lock_guard<std::mutex> lock(capture->mutex); pending = capture->pending != 0 || capture->acquiring != 0; }
  if (pending && CACurrentMediaTime() < deadline) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 10 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
      [self finishWhenDrained:capture deadline:deadline resolve:resolve reject:reject];
    });
    return;
  }
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  { std::lock_guard<std::mutex> lock(captureMutex); if (current == capture) current.reset(); }
  UIApplication.sharedApplication.idleTimerDisabled = capture->previousIdleTimerDisabled;
  if (pending || capture->interrupted || capture->overflow || capture->layer == nil) {
    reject(@"incomplete", @"Missing drawable feedback, capture interruption, lost layer or buffer overflow", nil);
    return;
  }
  NSMutableArray *rows = [NSMutableArray arrayWithCapacity:capture->frames.size()];
  for (const auto &frame : capture->frames) {
    [rows addObject:@[@(frame.id), @(frame.acquired), @(frame.presented), @(frame.callback)]];
  }
  NSDictionary *result = @{
    @"schema": @2, @"source": @"metal-drawable-presentedTime-v2",
    @"fixture": capture->fixture, @"session": capture->session, @"nativeHash": @BENCH_PACING_NATIVE_HASH,
    @"pid": @(getpid()), @"clock": @"CACurrentMediaTime", @"completed": @YES,
    @"overflow": @(capture->overflow), @"stoppedAt": @(capture->stopped),
    @"lowPowerAtStart": @(capture->lowPowerAtStart),
    @"lowPowerAtEnd": @(NSProcessInfo.processInfo.lowPowerModeEnabled),
    @"thermalAtStart": @(capture->thermalAtStart),
    @"thermalAtEnd": @(NSProcessInfo.processInfo.thermalState),
    @"markers": capture->markers,
    @"columns": @[@"drawableId", @"acquiredAt", @"presentedTime", @"callbackAt"], @"rows": rows
  };
  NSError *error = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:result options:0 error:&error];
  if (data == nil || ![data writeToFile:outputPath() options:NSDataWritingAtomic error:&error]) {
    reject(@"write", @"Could not save drawable presentation feedback", error);
  } else {
    resolve(kFile);
  }
}

- (void)invalidate {
  // Reload/unmount must not leave the global method observer installed.
  auto stop = ^{
    ++self->_generation;
    self->_startingSession = nil;
    std::shared_ptr<Capture> capture;
    { std::lock_guard<std::mutex> lock(captureMutex); capture = current; current.reset(); }
    if (capture) {
      stopObserving(capture);
      UIApplication.sharedApplication.idleTimerDisabled = capture->previousIdleTimerDisabled;
    }
    [[NSNotificationCenter defaultCenter] removeObserver:self];
  };
  if (NSThread.isMainThread) stop();
  else dispatch_async(dispatch_get_main_queue(), stop);
}
RCT_EXPORT_METHOD(abort:(NSString *)session) {
  // An old React effect's cleanup must not stop a newer capture.
  bool ownsCapture;
  { std::lock_guard<std::mutex> lock(captureMutex); ownsCapture = current && [current->session isEqualToString:session]; }
  if (ownsCapture || [_startingSession isEqualToString:session]) [self invalidate];
}
@end
