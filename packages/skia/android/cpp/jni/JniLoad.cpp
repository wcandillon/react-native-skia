#include "JniPlatformContext.h"
#include "JniSkiaManager.h"
#include "JniSkiaPresentedImages.h"
#include "JniSkiaView.h"
#include <fbjni/fbjni.h>
#include <jni.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    RNSkia::JniSkiaManager::registerNatives();
    RNSkia::JniSkiaView::registerNatives();
    RNSkia::JniPlatformContext::registerNatives();
    // The image views' bitmaps are made and published on the images' worker,
    // a thread the JVM did not create, whose class loader does not know the
    // app's classes: their store's class is resolved here, with the app's
    // loader in use, as its native methods are registered.
    RNSkia::JniSkiaPresentedImages::registerNatives();
  });
}
