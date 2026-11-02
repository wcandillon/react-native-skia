#pragma once

#include <cstdint>

#include <fbjni/fbjni.h>

#include "include/core/SkImageInfo.h"
#include "include/core/SkPixmap.h"

namespace RNSkia {

namespace jni = facebook::jni;

struct JBitmap : jni::JavaClass<JBitmap> {
  static constexpr auto kJavaDescriptor = "Landroid/graphics/Bitmap;";
};

/** A Java bitmap with its pixels locked, at `pixels`, for writing. */
struct LockedBitmap {
  jni::global_ref<JBitmap::javaobject> bitmap;
  SkPixmap pixels;
};

/**
 * The image views' bitmaps on the Java side (SkiaPresentedImages), a static
 * store the presented images make, publish and discard them through (see
 * RNSkPresentedImages): the worker makes and publishes them, the JS thread,
 * or the one tearing a runtime down, discards them. Its class is resolved
 * while the library loads (see JNI_OnLoad), since the worker is a thread the
 * JVM did not create.
 */
struct JniSkiaPresentedImages : jni::JavaClass<JniSkiaPresentedImages> {
  static constexpr auto kJavaDescriptor =
      "Lcom/reactnative/skia/SkiaPresentedImages;";

  /**
   A bitmap of `info`, premultiplied 8-bit RGBA, with its pixels locked for
   writing until unlockBitmap(); no bitmap when it could not be locked.
   */
  static LockedBitmap makeBitmap(const SkImageInfo &info);

  /**
   Unlocks the pixels of a bitmap makeBitmap() made, and readies it for
   drawing when it was written.
   */
  static void unlockBitmap(jni::alias_ref<JBitmap::javaobject> bitmap,
                           bool written);

  /** Shows `bitmap` in the image views showing `id`. */
  static void publish(uint32_t id, jni::alias_ref<JBitmap::javaobject> bitmap);

  /** Forgets the bitmap of `id`. */
  static void discard(uint32_t id);

  /** Registers the store's native methods (see halve). */
  static void registerNatives();

  /**
   SkiaPresentedImages.halve: writes the level below `bitmap` into `half`,
   each pixel the mean of the two by two block it covers (see halvePixels),
   across cores for a large one. Throws OutOfMemoryError when either bitmap's
   pixels cannot be locked.
   */
  static void halve(jni::alias_ref<jclass>,
                    jni::alias_ref<JBitmap::javaobject> bitmap,
                    jni::alias_ref<JBitmap::javaobject> half);
};

} // namespace RNSkia
