#import "SkiaPresentedImages.h"

// Main thread only, like the views that read them.
static NSMutableDictionary<NSNumber *, id> *presentedImages() {
  static NSMutableDictionary<NSNumber *, id> *images =
      [NSMutableDictionary new];
  return images;
}

static NSMutableDictionary<NSNumber *, NSHashTable *> *presentedObservers() {
  static NSMutableDictionary<NSNumber *, NSHashTable *> *observers =
      [NSMutableDictionary new];
  return observers;
}

@implementation SkiaPresentedImages

+ (void)publishImage:(CGImageRef)image forId:(uint32_t)imageId {
  NSNumber *key = @(imageId);
  presentedImages()[key] = (__bridge id)image;
  for (id<SkiaPresentedImageObserver> observer in
       [presentedObservers()[key] allObjects]) {
    [observer presentedImageDidPublish:image];
  }
}

+ (void)discardImageForId:(uint32_t)imageId {
  [presentedImages() removeObjectForKey:@(imageId)];
}

+ (CGImageRef)observeImageId:(uint32_t)imageId
                    observer:(id<SkiaPresentedImageObserver>)observer {
  NSNumber *key = @(imageId);
  NSHashTable *observers = presentedObservers()[key];
  if (observers == nil) {
    observers = [NSHashTable weakObjectsHashTable];
    presentedObservers()[key] = observers;
  }
  [observers addObject:observer];
  return (__bridge CGImageRef)presentedImages()[key];
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

@end
