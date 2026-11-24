#include "JniSkiaPresentedImages.h"

#include <algorithm>
#include <memory>
#include <thread>

#include <android/bitmap.h>
#include <android/hardware_buffer_jni.h>

#include "JniPresentThread.h"
#include "RNSkAndroidPlatformContext.h"
#include "RNSkPresentedImages.h"
#include "rnskia/RNSkPixelHalving.h"

#include "include/core/SkColorSpace.h"

namespace RNSkia {

namespace {

jni::local_ref<JBitmap::javaobject> wrapBuffer(AHardwareBuffer *buffer) {
  auto hardwareBuffer = jni::adopt_local(
      static_cast<JHardwareBuffer::javaobject>(AHardwareBuffer_toHardwareBuffer(
          jni::Environment::current(), buffer)));
  if (!hardwareBuffer) {
    jni::throwPendingJniExceptionAsCppException();
    return nullptr;
  }
  static const auto method =
      JniSkiaPresentedImages::javaClassStatic()
          ->getStaticMethod<JBitmap::javaobject(
              jni::alias_ref<JHardwareBuffer::javaobject>)>(
              "wrapHardwareBuffer");
  return method(JniSkiaPresentedImages::javaClassStatic(), hardwareBuffer);
}

// Locked for the life of this object.
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

LockedBitmap JniSkiaPresentedImages::makeBitmap(const SkImageInfo &info) {
  jni::ThreadScope threadScope;
  jni::local_ref<JBitmap::javaobject> bitmap;
  callJavaFromPresentThread([&]() {
    static const auto method =
        javaClassStatic()->getStaticMethod<JBitmap::javaobject(jint, jint)>(
            "makeBitmap");
    bitmap = method(javaClassStatic(), info.width(), info.height());
  });
  if (!bitmap) {
    return {};
  }
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
    jni::alias_ref<JBitmap::javaobject> bitmap) {
  jni::ThreadScope threadScope;
  AndroidBitmap_unlockPixels(jni::Environment::current(), bitmap.get());
}

jni::global_ref<JBitmap::javaobject>
JniSkiaPresentedImages::hardwareBitmapOf(AHardwareBuffer *buffer) {
  jni::ThreadScope threadScope;
  auto bitmap = wrapBuffer(buffer);
  return bitmap ? jni::make_global(bitmap) : nullptr;
}

void JniSkiaPresentedImages::publish(
    uint32_t id, jni::alias_ref<JBitmap::javaobject> bitmap) {
  jni::ThreadScope threadScope;
  callJavaFromPresentThread([&]() {
    static const auto method =
        javaClassStatic()
            ->getStaticMethod<void(jlong, jni::alias_ref<JBitmap::javaobject>)>(
                "publish");
    method(javaClassStatic(), static_cast<jlong>(id), bitmap);
  });
}

void JniSkiaPresentedImages::discard(uint32_t id) {
  jni::ThreadScope threadScope;
  callJavaFromPresentThread([&]() {
    static const auto method =
        javaClassStatic()->getStaticMethod<void(jlong)>("discard");
    method(javaClassStatic(), static_cast<jlong>(id));
  });
}

void JniSkiaPresentedImages::fail(uint32_t id) {
  jni::ThreadScope threadScope;
  callJavaFromPresentThread([&]() {
    static const auto method =
        javaClassStatic()->getStaticMethod<void(jlong)>("fail");
    method(javaClassStatic(), static_cast<jlong>(id));
  });
}

void JniSkiaPresentedImages::gpuDeviceReplaced() {
  jni::ThreadScope threadScope;
  callJavaFromPresentThread([&]() {
    static const auto method =
        javaClassStatic()->getStaticMethod<void()>("gpuDeviceReplaced");
    method(javaClassStatic());
  });
}

void JniSkiaPresentedImages::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod("halve", JniSkiaPresentedImages::halve),
      makeNativeMethod("drawHalfOf", JniSkiaPresentedImages::drawHalfOf),
  });
}

// Never removed: the library stays loaded for the life of the process.
void JniSkiaPresentedImages::followGpuDeviceReplacements() {
  DawnContext::addLossListener([](const DawnContext::LossInfo &) {
    if (!DawnContext::isDeviceLost()) {
      gpuDeviceReplaced();
    }
  });
}

void JniSkiaPresentedImages::halve(jni::alias_ref<jclass>,
                                   jni::alias_ref<JBitmap::javaobject> rows,
                                   jni::alias_ref<JBitmap::javaobject> half,
                                   jint halfRow) {
  auto *env = jni::Environment::current();
  LockedPixels source(env, rows.get());
  auto *pixels = static_cast<const uint8_t *>(source.pixels());
  LockedPixels destination(env, half.get());
  auto *halfPixels = static_cast<uint8_t *>(destination.pixels());
  const auto &info = source.info();
  const auto &halfInfo = destination.info();
  const uint32_t halfRows = std::max(1u, info.height / 2);
  if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888 ||
      halfInfo.format != ANDROID_BITMAP_FORMAT_RGBA_8888 ||
      halfInfo.width != std::max(1u, info.width / 2) || halfRow < 0 ||
      static_cast<uint32_t>(halfRow) + halfRows > halfInfo.height) {
    jni::throwNewJavaException(
        "java/lang/IllegalArgumentException",
        "a level halves RGBA_8888 rows into the rows of one of half their "
        "width, not %ux%u into %ux%u from row %d",
        info.width, info.height, halfInfo.width, halfInfo.height, halfRow);
  }
  // A thread costs more than halving a small level takes.
  constexpr uint32_t kPixelsPerThread = 256 * 1024;
  const auto halfPixelCount = static_cast<uint64_t>(halfInfo.width) * halfRows;
  const int threads = static_cast<int>(std::min<uint64_t>(
      {std::max(1u, std::thread::hardware_concurrency()), 4,
       std::max<uint64_t>(1, halfPixelCount / kPixelsPerThread)}));
  halvePixels(pixels, static_cast<int>(info.width),
              static_cast<int>(info.height), info.stride,
              halfPixels + static_cast<size_t>(halfRow) * halfInfo.stride,
              halfInfo.stride, threads);
}

jni::local_ref<JBitmap::javaobject> JniSkiaPresentedImages::drawHalfOf(
    jni::alias_ref<jclass>,
    jni::alias_ref<JHardwareBuffer::javaobject> buffer) {
  // Valid while the caller holds the Java buffer.
  auto *source = AHardwareBuffer_fromHardwareBuffer(jni::Environment::current(),
                                                    buffer.get());
  AHardwareBuffer_Desc description{};
  AHardwareBuffer_describe(source, &description);
  const auto sourceSize = SkISize::Make(static_cast<int>(description.width),
                                        static_cast<int>(description.height));
  const auto halfInfo = SkImageInfo::Make(
      std::max(1, sourceSize.width() / 2), std::max(1, sourceSize.height() / 2),
      kRGBA_8888_SkColorType, kPremul_SkAlphaType, SkColorSpace::MakeSRGB());
  auto half = AndroidPresentedBuffer::make(halfInfo);
  if (half == nullptr) {
    jni::throwNewJavaException("java/lang/OutOfMemoryError",
                               "no memory for a level of %dx%d",
                               halfInfo.width(), halfInfo.height());
  }
  if (!RNSkPresentedImages::drawHalf(
          [source](const wgpu::Device &device) {
            return importHardwareBuffer(device, source);
          },
          sourceSize, *half)) {
    return nullptr;
  }
  auto bitmap = half->hardwareBitmap();
  return bitmap ? jni::make_local(bitmap) : nullptr;
}

} // namespace RNSkia
