#pragma once

#include <cstdint>

#include <android/hardware_buffer.h>
#include <fbjni/fbjni.h>

#include "include/core/SkImageInfo.h"
#include "include/core/SkPixmap.h"

namespace RNSkia {

namespace jni = facebook::jni;

struct JBitmap : jni::JavaClass<JBitmap> {
  static constexpr auto kJavaDescriptor = "Landroid/graphics/Bitmap;";
};

struct JHardwareBuffer : jni::JavaClass<JHardwareBuffer> {
  static constexpr auto kJavaDescriptor = "Landroid/hardware/HardwareBuffer;";
};

/** A Java bitmap with its pixels locked, at `pixels`, for writing. */
struct LockedBitmap {
  jni::global_ref<JBitmap::javaobject> bitmap;
  SkPixmap pixels;
};

/**
 * SkiaPresentedImages, the image views' bitmaps on the Java side. Its class is
 * resolved while the library loads, as the worker is a thread the JVM did not
 * create. A Java exception from publish, discard or fail is reported as
 * uncaught: one may come from a destructor (see ~RNSkJsiViewApi).
 */
struct JniSkiaPresentedImages : jni::JavaClass<JniSkiaPresentedImages> {
  static constexpr auto kJavaDescriptor =
      "Lcom/reactnative/skia/SkiaPresentedImages;";

  /** Locked until unlockBitmap(); none when there was no memory for it. */
  static LockedBitmap makeBitmap(const SkImageInfo &info);

  static void unlockBitmap(jni::alias_ref<JBitmap::javaobject> bitmap);

  /** Rethrows a Java exception, out of memory among them, as a JniException. */
  static jni::global_ref<JBitmap::javaobject>
  hardwareBitmapOf(AHardwareBuffer *buffer);

  static void publish(uint32_t id, jni::alias_ref<JBitmap::javaobject> bitmap);

  static void discard(uint32_t id);

  static void fail(uint32_t id);

  /** See SkiaPresentedImages#gpuDeviceReplaced. */
  static void gpuDeviceReplaced();

  static void registerNatives();

  /** Calls gpuDeviceReplaced once each replacement of a lost device is in
   * place. */
  static void followGpuDeviceReplacements();

private:
  /** SkiaPresentedImages.halve (see halvePixels). */
  static void halve(jni::alias_ref<jclass>,
                    jni::alias_ref<JBitmap::javaobject> rows,
                    jni::alias_ref<JBitmap::javaobject> half, jint halfRow);

  /** SkiaPresentedImages.drawHalfOf (see RNSkPresentedImages::drawHalf). */
  static jni::local_ref<JBitmap::javaobject>
  drawHalfOf(jni::alias_ref<jclass>,
             jni::alias_ref<JHardwareBuffer::javaobject> buffer);
};

} // namespace RNSkia
