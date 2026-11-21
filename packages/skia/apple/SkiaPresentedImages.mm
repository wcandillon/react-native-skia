#import "SkiaPresentedImages.h"

// What an image's observers are told once its bitmap is published or fails.
typedef void (^SkiaPresentedImageOutcome)(
    id<SkiaPresentedImageObserver> observer);

// Main thread only, like the views that read them.
static NSMutableDictionary<NSNumber *, SkiaPresentedImageOutcome> *
presentedOutcomes() {
  static NSMutableDictionary<NSNumber *, SkiaPresentedImageOutcome> *outcomes =
      [NSMutableDictionary new];
  return outcomes;
}

static NSMutableDictionary<NSNumber *, NSHashTable *> *presentedObservers() {
  static NSMutableDictionary<NSNumber *, NSHashTable *> *observers =
      [NSMutableDictionary new];
  return observers;
}

@implementation SkiaPresentedImages

+ (void)publishImage:(CGImageRef)image forId:(uint32_t)imageId {
  id bitmap = (__bridge id)image;
  [self settleImageId:imageId
              outcome:^(id<SkiaPresentedImageObserver> observer) {
                [observer presentedImageDidPublish:(__bridge CGImageRef)bitmap];
              }];
}

+ (void)failImageForId:(uint32_t)imageId {
  [self settleImageId:imageId
              outcome:^(id<SkiaPresentedImageObserver> observer) {
                [observer presentedImageDidFail];
              }];
}

+ (void)discardImageForId:(uint32_t)imageId {
  [presentedOutcomes() removeObjectForKey:@(imageId)];
}

+ (void)observeImageId:(uint32_t)imageId
              observer:(id<SkiaPresentedImageObserver>)observer {
  NSNumber *key = @(imageId);
  NSHashTable *observers = presentedObservers()[key];
  if (observers == nil) {
    observers = [NSHashTable weakObjectsHashTable];
    presentedObservers()[key] = observers;
  }
  [observers addObject:observer];
  SkiaPresentedImageOutcome outcome = presentedOutcomes()[key];
  if (outcome != nil) {
    outcome(observer);
  }
}

+ (void)unobserveImageId:(uint32_t)imageId
                observer:(id<SkiaPresentedImageObserver>)observer {
  NSNumber *key = @(imageId);
  NSHashTable *observers = presentedObservers()[key];
  [observers removeObject:observer];
  // count also counts the slots of observers deallocated since.
  if (observers.allObjects.count == 0) {
    [presentedObservers() removeObjectForKey:key];
  }
}

+ (void)settleImageId:(uint32_t)imageId
              outcome:(SkiaPresentedImageOutcome)outcome {
  NSNumber *key = @(imageId);
  presentedOutcomes()[key] = outcome;
  for (id<SkiaPresentedImageObserver> observer in
       [presentedObservers()[key] allObjects]) {
    outcome(observer);
  }
}

@end
