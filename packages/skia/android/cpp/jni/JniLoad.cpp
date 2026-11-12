#include "JniPlatformContext.h"
#include "JniSkiaManager.h"
#include "JniSkiaView.h"
#include <fbjni/fbjni.h>
#include <jni.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    RNSkia::JniSkiaManager::registerNatives();
    RNSkia::JniSkiaView::registerNatives();
    RNSkia::JniPlatformContext::registerNatives();
  });
}
