#pragma once

#include <string>

#include "dawn/webgpu_cpp.h"

namespace RNSkia {

void installConstants(jsi::Runtime &runtime) {

  jsi::Object GPUBufferUsage(runtime);
  GPUBufferUsage.setProperty(
      runtime, "MAP_READ",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::MapRead)));
  GPUBufferUsage.setProperty(
      runtime, "MAP_WRITE",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::MapWrite)));
  GPUBufferUsage.setProperty(
      runtime, "COPY_SRC",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::CopySrc)));
  GPUBufferUsage.setProperty(
      runtime, "COPY_DST",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::CopyDst)));
  GPUBufferUsage.setProperty(
      runtime, "INDEX",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::Index)));
  GPUBufferUsage.setProperty(
      runtime, "VERTEX",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::Vertex)));
  GPUBufferUsage.setProperty(
      runtime, "UNIFORM",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::Uniform)));
  GPUBufferUsage.setProperty(
      runtime, "STORAGE",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::Storage)));
  GPUBufferUsage.setProperty(
      runtime, "INDIRECT",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::Indirect)));
  GPUBufferUsage.setProperty(
      runtime, "QUERY_RESOLVE",
      jsi::Value(static_cast<double>(wgpu::BufferUsage::QueryResolve)));
  runtime.global().setProperty(runtime, "GPUBufferUsage", GPUBufferUsage);

  jsi::Object GPUColorWrite(runtime);
  GPUBufferUsage.setProperty(
      runtime, "RED",
      jsi::Value(static_cast<double>(wgpu::ColorWriteMask::Red)));
  GPUBufferUsage.setProperty(
      runtime, "GREEN",
      jsi::Value(static_cast<double>(wgpu::ColorWriteMask::Green)));
  GPUBufferUsage.setProperty(
      runtime, "BLUE",
      jsi::Value(static_cast<double>(wgpu::ColorWriteMask::Blue)));
  GPUBufferUsage.setProperty(
      runtime, "ALPHA",
      jsi::Value(static_cast<double>(wgpu::ColorWriteMask::Alpha)));
  GPUBufferUsage.setProperty(
      runtime, "ALL",
      jsi::Value(static_cast<double>(wgpu::ColorWriteMask::All)));
  runtime.global().setProperty(runtime, "GPUColorWrite", GPUColorWrite);

  jsi::Object GPUMapMode(runtime);
  GPUBufferUsage.setProperty(
      runtime, "READ", jsi::Value(static_cast<double>(wgpu::MapMode::Read)));
  GPUBufferUsage.setProperty(
      runtime, "WRITE", jsi::Value(static_cast<double>(wgpu::MapMode::Write)));
  runtime.global().setProperty(runtime, "GPUMapMode", GPUMapMode);

  jsi::Object GPUShaderStage(runtime);
  GPUBufferUsage.setProperty(
      runtime, "VERTEX",
      jsi::Value(static_cast<double>(wgpu::ShaderStage::Vertex)));
  GPUBufferUsage.setProperty(
      runtime, "FRAGMENT",
      jsi::Value(static_cast<double>(wgpu::ShaderStage::Fragment)));
  GPUBufferUsage.setProperty(
      runtime, "COMPUTE",
      jsi::Value(static_cast<double>(wgpu::ShaderStage::Compute)));
  runtime.global().setProperty(runtime, "GPUShaderStage", GPUShaderStage);

  jsi::Object GPUTextureUsage(runtime);
  GPUBufferUsage.setProperty(
      runtime, "COPY_SRC",
      jsi::Value(static_cast<double>(wgpu::TextureUsage::CopySrc)));
  GPUBufferUsage.setProperty(
      runtime, "COPY_DST",
      jsi::Value(static_cast<double>(wgpu::TextureUsage::CopyDst)));
  GPUBufferUsage.setProperty(
      runtime, "TEXTURE_BINDING",
      jsi::Value(static_cast<double>(wgpu::TextureUsage::TextureBinding)));
  GPUBufferUsage.setProperty(
      runtime, "STORAGE_BINDING",
      jsi::Value(static_cast<double>(wgpu::TextureUsage::StorageBinding)));
  GPUBufferUsage.setProperty(
      runtime, "RENDER_ATTACHMENT",
      jsi::Value(static_cast<double>(wgpu::TextureUsage::RenderAttachment)));
  runtime.global().setProperty(runtime, "GPUTextureUsage", GPUTextureUsage);
}

} // namespace RNSkia