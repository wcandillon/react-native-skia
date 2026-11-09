#import "RNSkPresentThread.h"

#include <memory>
#include <utility>

@implementation RNSkPresentThread

static NSRunLoop *sPresentRunLoop = nil;

/** Starts the thread on first use. Any thread. */
static NSRunLoop *presentRunLoop() {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    dispatch_semaphore_t started = dispatch_semaphore_create(0);
    NSThread *thread = [[NSThread alloc] initWithBlock:^{
      sPresentRunLoop = [NSRunLoop currentRunLoop];
      // A port keeps the run loop running with nothing else on it.
      [sPresentRunLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
      dispatch_semaphore_signal(started);
      while (true) {
        @autoreleasepool {
          CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1.0e10, true);
        }
      }
    }];
    thread.name = @"RNSkia Present";
    // The priority of the main thread: a present is what the user waits for.
    thread.qualityOfService = NSQualityOfServiceUserInteractive;
    [thread start];
    dispatch_semaphore_wait(started, DISPATCH_TIME_FOREVER);
  });
  return sPresentRunLoop;
}

+ (void)post:(dispatch_block_t)task {
  CFRunLoopRef runLoop = [presentRunLoop() getCFRunLoop];
  CFRunLoopPerformBlock(runLoop, kCFRunLoopCommonModes, ^{
    @autoreleasepool {
      task();
    }
  });
  CFRunLoopWakeUp(runLoop);
}

+ (void)postTask:(std::function<void()>)task {
  auto shared = std::make_shared<std::function<void()>>(std::move(task));
  [self post:^{
    (*shared)();
  }];
}

@end
