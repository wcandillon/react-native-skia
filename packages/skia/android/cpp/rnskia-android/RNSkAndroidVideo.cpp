#include <memory>
#include <string>

#if __ANDROID_API__ >= 26
#include <android/hardware_buffer_jni.h>
#endif

#include "RNSkLog.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkColorSpace.h"
#include "include/core/SkImage.h"
#include "include/core/SkSize.h"

#pragma clang diagnostic pop

#include "DawnContext.h"
#include "RNSkAndroidVideo.h"

namespace RNSkia {

namespace jsi = facebook::jsi;
namespace jni = facebook::jni;

RNSkAndroidVideo::RNSkAndroidVideo(jni::global_ref<jobject> jniVideo)
    : _jniVideo(jniVideo) {
#if __ANDROID_API__ < 26
  throw std::runtime_error("Skia Videos are only support on API 26 and above");
#endif
}

RNSkAndroidVideo::~RNSkAndroidVideo() {}

sk_sp<SkImage> RNSkAndroidVideo::nextImage(double *timeStamp) {
#if __ANDROID_API__ >= 26
  JNIEnv *env = facebook::jni::Environment::current();
  // Get the Java class and method ID
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid =
      env->GetMethodID(cls, "nextImage", "()Landroid/hardware/HardwareBuffer;");
  if (mid == nullptr) {
    // Method not found, handle error
    RNSkLogger::logToConsole("nextImage method not found");
    return nullptr;
  }
  // Call the Java method
  jobject jHardwareBuffer = env->CallObjectMethod(_jniVideo.get(), mid);
  if (jHardwareBuffer == nullptr) {
    RNSkLogger::logToConsole("Buffer not found");
    // Null return, handle error
    return nullptr;
  }
  // Convert jobject to AHardwareBuffer
  AHardwareBuffer *buffer =
      AHardwareBuffer_fromHardwareBuffer(env, jHardwareBuffer);
  return DawnContext::getInstance().MakeImageFromBuffer(buffer);
#else
  return nullptr;
#endif
}

double RNSkAndroidVideo::duration() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "getDuration", "()D");
  if (!mid) {
    RNSkLogger::logToConsole("getDuration method not found");
    return 0.0;
  }
  return env->CallDoubleMethod(_jniVideo.get(), mid);
}

double RNSkAndroidVideo::framerate() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "getFrameRate", "()D");
  if (!mid) {
    RNSkLogger::logToConsole("getFrameRate method not found");
    return 0.0;
  }
  return env->CallDoubleMethod(_jniVideo.get(), mid);
}

void RNSkAndroidVideo::seek(double timestamp) {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "seek", "(D)V");
  if (!mid) {
    RNSkLogger::logToConsole("seek method not found");
    return;
  }
  env->CallVoidMethod(_jniVideo.get(), mid, static_cast<jdouble>(timestamp));
}

float RNSkAndroidVideo::getRotationInDegrees() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "getRotationDegrees", "()I");
  if (!mid) {
    RNSkLogger::logToConsole("getRotationDegrees method not found");
    return 0;
  }
  auto rotation = env->CallIntMethod(_jniVideo.get(), mid);
  return static_cast<float>(rotation);
}

SkISize RNSkAndroidVideo::getSize() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid =
      env->GetMethodID(cls, "getSize", "()Landroid/graphics/Point;");
  if (!mid) {
    RNSkLogger::logToConsole("getSize method not found");
    return SkISize::Make(0, 0);
  }
  jobject jPoint = env->CallObjectMethod(_jniVideo.get(), mid);
  jclass pointCls = env->GetObjectClass(jPoint);

  jfieldID xFid = env->GetFieldID(pointCls, "x", "I");
  jfieldID yFid = env->GetFieldID(pointCls, "y", "I");
  if (!xFid || !yFid) {
    RNSkLogger::logToConsole("Point class fields not found");
    return SkISize::Make(0, 0);
  }

  jint width = env->GetIntField(jPoint, xFid);
  jint height = env->GetIntField(jPoint, yFid);

  return SkISize::Make(width, height);
}

void RNSkAndroidVideo::play() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "play", "()V");
  if (!mid) {
    RNSkLogger::logToConsole("play method not found");
    return;
  }
  env->CallVoidMethod(_jniVideo.get(), mid);
}

void RNSkAndroidVideo::pause() {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "pause", "()V");
  if (!mid) {
    RNSkLogger::logToConsole("pause method not found");
    return;
  }
  env->CallVoidMethod(_jniVideo.get(), mid);
}

void RNSkAndroidVideo::setVolume(float volume) {
  JNIEnv *env = facebook::jni::Environment::current();
  jclass cls = env->GetObjectClass(_jniVideo.get());
  jmethodID mid = env->GetMethodID(cls, "setVolume", "(F)V");
  if (!mid) {
    RNSkLogger::logToConsole("setVolume method not found");
    return;
  }
  env->CallVoidMethod(_jniVideo.get(), mid, volume);
}
} // namespace RNSkia
