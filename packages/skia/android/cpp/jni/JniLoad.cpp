#include "JniPlatformContext.h"
#include "JniSkiaManager.h"
#include "JniSkiaView.h"
#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <jni.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    RNSkia::JniSkiaManager::registerNatives();
    RNSkia::JniSkiaView::registerNatives();
    RNSkia::JniPlatformContext::registerNatives();
    // A view posts to the thread it presents on through a NativeRunnable (see
    // JniSkiaView), from the render thread pool among others. A thread the
    // JVM did not create has only the system class loader, which does not
    // know the app's classes, so the lookup fails there. Making one here,
    // with the app's loader in use, resolves every class on that path once;
    // fbjni keeps them.
    facebook::jni::JNativeRunnable::newObjectCxxArgs([] {});
  });
}
