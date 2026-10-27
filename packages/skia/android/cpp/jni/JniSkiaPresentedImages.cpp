#include "JniSkiaPresentedImages.h"

#include <algorithm>
#include <thread>

#include <android/bitmap.h>

#include "rnskia/RNSkPixelHalving.h"

namespace RNSkia {

LockedBitmap JniSkiaPresentedImages::makeBitmap(const SkImageInfo &info) {
  jni::ThreadScope threadScope;
  static const auto method =
      javaClassStatic()->getStaticMethod<JBitmap::javaobject(jint, jint)>(
          "makeBitmap");
  auto bitmap = method(javaClassStatic(), info.width(), info.height());
  // The pixels are written straight into the bitmap's memory, in rows of its
  // own stride.
  auto *env = jni::Environment::current();
  AndroidBitmapInfo bitmapInfo;
  void *address = nullptr;
  if (AndroidBitmap_getInfo(env, bitmap.get(), &bitmapInfo) !=
          ANDROID_BITMAP_RESULT_SUCCESS ||
      AndroidBitmap_lockPixels(env, bitmap.get(), &address) !=
          ANDROID_BITMAP_RESULT_SUCCESS) {
    return {};
  }
  return {jni::make_global(bitmap), SkPixmap(info, address, bitmapInfo.stride)};
}

void JniSkiaPresentedImages::unlockBitmap(
    jni::alias_ref<JBitmap::javaobject> bitmap, bool written) {
  jni::ThreadScope threadScope;
  AndroidBitmap_unlockPixels(jni::Environment::current(), bitmap.get());
  if (written) {
    // Uploads the texture ahead of the first draw: the views pick their levels
    // only once the bitmap's size is published (see PresentedImage).
    static const auto prepareToDraw =
        JBitmap::javaClassStatic()->getMethod<void()>("prepareToDraw");
    prepareToDraw(bitmap);
  }
}

void JniSkiaPresentedImages::publish(
    uint32_t id, jni::alias_ref<JBitmap::javaobject> bitmap) {
  jni::ThreadScope threadScope;
  static const auto method =
      javaClassStatic()
          ->getStaticMethod<void(jlong, jni::alias_ref<JBitmap::javaobject>)>(
              "publish");
  method(javaClassStatic(), static_cast<jlong>(id), bitmap);
}

void JniSkiaPresentedImages::discard(uint32_t id) {
  jni::ThreadScope threadScope;
  static const auto method =
      javaClassStatic()->getStaticMethod<void(jlong)>("discard");
  method(javaClassStatic(), static_cast<jlong>(id));
}

void JniSkiaPresentedImages::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod("halve", JniSkiaPresentedImages::halve),
  });
}

namespace {

/** A bitmap's pixels, locked for the life of this object, unlocked however it
 * ends. */
class LockedPixels {
public:
  LockedPixels(JNIEnv *env, jobject bitmap) : _env(env), _bitmap(bitmap) {
    _result = AndroidBitmap_getInfo(env, bitmap, &_info);
    if (_result == ANDROID_BITMAP_RESULT_SUCCESS) {
      _result = AndroidBitmap_lockPixels(env, bitmap, &_pixels);
    }
    if (_result != ANDROID_BITMAP_RESULT_SUCCESS) {
      _pixels = nullptr;
    }
  }

  ~LockedPixels() {
    if (_pixels != nullptr) {
      AndroidBitmap_unlockPixels(_env, _bitmap);
    }
  }

  LockedPixels(const LockedPixels &) = delete;
  LockedPixels &operator=(const LockedPixels &) = delete;

  /**
   The pixels; throws OutOfMemoryError when there was no memory to lock them,
   IllegalStateException when they could not be locked otherwise.
   */
  void *pixels() const {
    if (_result == ANDROID_BITMAP_RESULT_ALLOCATION_FAILED) {
      jni::throwNewJavaException("java/lang/OutOfMemoryError",
                                 "no memory to lock the pixels of a level");
    }
    if (_pixels == nullptr) {
      jni::throwNewJavaException(
          "java/lang/IllegalStateException",
          "the pixels of a level could not be locked: %d", _result);
    }
    return _pixels;
  }

  const AndroidBitmapInfo &info() const { return _info; }

private:
  JNIEnv *_env;
  jobject _bitmap;
  AndroidBitmapInfo _info{};
  void *_pixels = nullptr;
  int _result;
};

} // namespace

void JniSkiaPresentedImages::halve(jni::alias_ref<jclass>,
                                   jni::alias_ref<JBitmap::javaobject> bitmap,
                                   jni::alias_ref<JBitmap::javaobject> half) {
  auto *env = jni::Environment::current();
  LockedPixels source(env, bitmap.get());
  auto *pixels = static_cast<const uint8_t *>(source.pixels());
  LockedPixels destination(env, half.get());
  auto *halfPixels = static_cast<uint8_t *>(destination.pixels());
  const auto &info = source.info();
  const auto &halfInfo = destination.info();
  if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888 ||
      halfInfo.format != ANDROID_BITMAP_FORMAT_RGBA_8888 ||
      halfInfo.width != std::max(1u, info.width / 2) ||
      halfInfo.height != std::max(1u, info.height / 2)) {
    jni::throwNewJavaException(
        "java/lang/IllegalArgumentException",
        "a level halves an RGBA_8888 bitmap into one of half its size, not "
        "%ux%u into %ux%u",
        info.width, info.height, halfInfo.width, halfInfo.height);
  }
  // A thread costs more than halving a small level takes.
  constexpr uint32_t kPixelsPerThread = 256 * 1024;
  const auto halfPixelCount =
      static_cast<uint64_t>(halfInfo.width) * halfInfo.height;
  const int threads = static_cast<int>(std::min<uint64_t>(
      {std::max(1u, std::thread::hardware_concurrency()), 4,
       std::max<uint64_t>(1, halfPixelCount / kPixelsPerThread)}));
  halvePixels(pixels, static_cast<int>(info.width),
              static_cast<int>(info.height), info.stride, halfPixels,
              halfInfo.stride, threads);
}

} // namespace RNSkia
