
#pragma once

#include <android/native_window_jni.h>
#include <android/surface_texture.h>
#include <android/surface_texture_jni.h>

#define WEBGPU_CPP_IMPLEMENTATION

namespace RNSkia {

void runTriangleDemo(void *surface, int width, int height);

} // namespace RNSkia