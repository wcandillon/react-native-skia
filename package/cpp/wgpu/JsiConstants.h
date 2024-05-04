#pragma once

#include <string>

#include "dawn/webgpu_cpp.h"

namespace RNSkia {

void installConstants(jsi::Runtime &runtime) {

  jsi::Object GPUBufferUsage(runtime);
  GPUBufferUsage.setProperty(runtime, "MAP_READ", jsi::Value(1));
  GPUBufferUsage.setProperty(runtime, "MAP_WRITE", jsi::Value(2));
  GPUBufferUsage.setProperty(runtime, "COPY_SRC", jsi::Value(4));
  GPUBufferUsage.setProperty(runtime, "COPY_DST", jsi::Value(8));
  GPUBufferUsage.setProperty(runtime, "INDEX", jsi::Value(16));
  GPUBufferUsage.setProperty(runtime, "VERTEX", jsi::Value(32));
  GPUBufferUsage.setProperty(runtime, "UNIFORM", jsi::Value(64));
  GPUBufferUsage.setProperty(runtime, "STORAGE", jsi::Value(128));
  GPUBufferUsage.setProperty(runtime, "INDIRECT", jsi::Value(256));
  GPUBufferUsage.setProperty(runtime, "QUERY_RESOLVE", jsi::Value(512));
  runtime.global().setProperty(runtime, "GPUBufferUsage", GPUBufferUsage);

  jsi::Object GPUColorWrite(runtime);
  GPUColorWrite.setProperty(runtime, "RED", jsi::Value(1));
  GPUColorWrite.setProperty(runtime, "GREEN", jsi::Value(2));
  GPUColorWrite.setProperty(runtime, "BLUE", jsi::Value(4));
  GPUColorWrite.setProperty(runtime, "ALPHA", jsi::Value(8));
  GPUColorWrite.setProperty(runtime, "ALL", jsi::Value(15));
  runtime.global().setProperty(runtime, "GPUColorWrite", GPUColorWrite);

  jsi::Object GPUMapMode(runtime);
  GPUMapMode.setProperty(runtime, "READ", jsi::Value(1));
  GPUMapMode.setProperty(runtime, "WRITE", jsi::Value(2));
  runtime.global().setProperty(runtime, "GPUMapMode", GPUMapMode);

  jsi::Object GPUShaderStage(runtime);
  GPUShaderStage.setProperty(runtime, "VERTEX", jsi::Value(1));
  GPUShaderStage.setProperty(runtime, "FRAGMENT", jsi::Value(2));
  GPUShaderStage.setProperty(runtime, "COMPUTE", jsi::Value(4));
  runtime.global().setProperty(runtime, "GPUShaderStage", GPUShaderStage);

  jsi::Object GPUTextureUsage(runtime);
  GPUTextureUsage.setProperty(runtime, "COPY_SRC", jsi::Value(1));
  GPUTextureUsage.setProperty(runtime, "COPY_DST", jsi::Value(2));
  GPUTextureUsage.setProperty(runtime, "TEXTURE_BINDING", jsi::Value(4));
  GPUTextureUsage.setProperty(runtime, "STORAGE_BINDING", jsi::Value(8));
  GPUTextureUsage.setProperty(runtime, "RENDER_ATTACHMENT", jsi::Value(16));
  runtime.global().setProperty(runtime, "GPUTextureUsage", GPUTextureUsage);
}

} // namespace RNSkia