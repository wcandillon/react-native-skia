#pragma once

#if __ANDROID_API__ >= 26
#include <android/hardware_buffer.h>
#endif
#include <algorithm>
#include <cstdint>
#include <exception>
#include <functional>
#include <memory>
#include <string>

#if defined(SK_GRAPHITE)
#include "RNDawnContext.h"
#else
#include "OpenGLContext.h"
#endif

#include "AHardwareBufferUtils.h"
#include "JniPlatformContext.h"
#include "RNSkAndroidVideo.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/ports/SkFontMgr_android.h"
#include "include/ports/SkFontScanner_FreeType.h"

#pragma clang diagnostic pop

namespace RNSkia {

class RNSkAndroidPlatformContext : public RNSkPlatformContext {
public:
  RNSkAndroidPlatformContext(
      JniPlatformContext *jniPlatformContext,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
      : RNSkPlatformContext(std::move(jsCallInvoker),
                            jniPlatformContext->getPixelDensity()),
        _jniPlatformContext(jniPlatformContext) {}

  ~RNSkAndroidPlatformContext() override = default;

  void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) override {
    _jniPlatformContext->performStreamOperation(sourceUri, op);
  }

  void raiseError(const std::exception &err) override {
    _jniPlatformContext->raiseError(err);
  }

  sk_sp<SkSurface> makeOffscreenSurface(int width, int height,
                                        bool useP3ColorSpace = false) override {
#if defined(SK_GRAPHITE)
    return DawnContext::getInstance().MakeOffscreen(width, height,
                                                    useP3ColorSpace);
#else
    return OpenGLContext::getInstance().MakeOffscreen(width, height,
                                                      useP3ColorSpace);
#endif
  }

  sk_sp<SkImage> makeImageFromNativeBuffer(void *buffer) override {
#if defined(SK_GRAPHITE)
    return DawnContext::getInstance().MakeImageFromBuffer(buffer);
#else
    return OpenGLContext::getInstance().MakeImageFromBuffer(buffer);
#endif
  }

#if !defined(SK_GRAPHITE)
  sk_sp<SkImage> makeImageFromNativeTexture(const TextureInfo &texInfo,
                                            int width, int height,
                                            bool mipMapped) override {
    GrGLTextureInfo textureInfo;
    textureInfo.fTarget = (GrGLenum)texInfo.glTarget;
    textureInfo.fID = (GrGLuint)texInfo.glID;
    textureInfo.fFormat = (GrGLenum)texInfo.glFormat;
    textureInfo.fProtected =
        texInfo.glProtected ? skgpu::Protected::kYes : skgpu::Protected::kNo;

    OpenGLContext::getInstance().makeCurrent();
    if (glIsTexture(textureInfo.fID) == GL_FALSE) {
      throw std::runtime_error("Invalid textureInfo");
    }

    GrBackendTexture backendTexture = GrBackendTextures::MakeGL(
        width, height,
        mipMapped ? skgpu::Mipmapped::kYes : skgpu::Mipmapped::kNo,
        textureInfo);
    return SkImages::BorrowTextureFrom(
        OpenGLContext::getInstance().getDirectContext(), backendTexture,
        kTopLeft_GrSurfaceOrigin, kRGBA_8888_SkColorType, kUnpremul_SkAlphaType,
        nullptr);
  }
#endif

  std::shared_ptr<RNSkVideo> createVideo(const std::string &url) override {
    auto jniVideo = _jniPlatformContext->createVideo(url);
    return std::make_shared<RNSkAndroidVideo>(jniVideo);
  }

  void releaseNativeBuffer(uint64_t pointer) override {
#if __ANDROID_API__ >= 26
    auto *buffer = reinterpret_cast<AHardwareBuffer *>(pointer);
    AHardwareBuffer_release(buffer);
#endif
  }

  uint64_t makeNativeBuffer(sk_sp<SkImage> image) override {
#if __ANDROID_API__ >= 26
#if defined(SK_GRAPHITE)
    // A Graphite GPU texture can't be read with readPixels(nullptr); read it
    // back to a raster image first or the buffer ends up uninitialized/black.
    if (image && image->isTextureBacked()) {
      image = DawnContext::getInstance().MakeRasterImage(image);
    }
#endif
    auto bytesPerPixel = image->imageInfo().bytesPerPixel();
    int bytesPerRow = image->width() * bytesPerPixel;
    auto buf = SkData::MakeUninitialized(image->width() * image->height() *
                                         bytesPerPixel);
    SkImageInfo info =
        SkImageInfo::Make(image->width(), image->height(), image->colorType(),
                          image->alphaType());
    image->readPixels(nullptr, info, const_cast<void *>(buf->data()),
                      bytesPerRow, 0, 0);
    const void *pixelData = buf->data();

    // Define the buffer description
    AHardwareBuffer_Desc desc = {};
    // TODO: use image info here
    desc.width = image->width();
    desc.height = image->height();
    desc.layers = 1; // Single image layer
    desc.format = GetBufferFormatFromSkColorType(
        image->colorType()); // Assuming the image
                             // is in this format
    desc.usage = AHARDWAREBUFFER_USAGE_CPU_READ_OFTEN |
                 AHARDWAREBUFFER_USAGE_CPU_WRITE_OFTEN |
                 AHARDWAREBUFFER_USAGE_GPU_COLOR_OUTPUT |
                 AHARDWAREBUFFER_USAGE_GPU_SAMPLED_IMAGE;
    desc.stride = bytesPerRow; // Stride in pixels, not in bytes

    // Allocate the buffer
    AHardwareBuffer *buffer = nullptr;
    if (AHardwareBuffer_allocate(&desc, &buffer) != 0) {
      // Handle allocation failure
      return 0;
    }

    // Map the buffer to gain access to its memory
    void *mappedBuffer = nullptr;
    AHardwareBuffer_lock(buffer, AHARDWAREBUFFER_USAGE_CPU_WRITE_OFTEN, -1,
                         nullptr, &mappedBuffer);
    if (mappedBuffer == nullptr) {
      // Handle mapping failure
      AHardwareBuffer_release(buffer);
      return 0;
    }

    // Copy the image data to the buffer
    memcpy(mappedBuffer, pixelData, desc.height * bytesPerRow);

    // Unmap the buffer
    AHardwareBuffer_unlock(buffer, nullptr);

    // Return the buffer pointer as a uint64_t. It's the caller's responsibility
    // to manage this buffer.
    return reinterpret_cast<uint64_t>(buffer);
#else
    return 0;
#endif
  }

  uint64_t makeTestNativeBuffer(int width, int height) override {
#if __ANDROID_API__ >= 26
    // Allocate an RGBA8 AHardwareBuffer and fill it with a procedural test
    // pattern (RGB gradient + diagonal stripes), entirely on the CPU. We read
    // the buffer's actual row stride after locking (the allocator may pad it),
    // so the upload is correct regardless of width alignment.
    AHardwareBuffer_Desc desc = {};
    desc.width = static_cast<uint32_t>(width);
    desc.height = static_cast<uint32_t>(height);
    desc.layers = 1;
    desc.format = AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM;
    desc.usage = AHARDWAREBUFFER_USAGE_CPU_WRITE_RARELY |
                 AHARDWAREBUFFER_USAGE_CPU_READ_RARELY |
                 AHARDWAREBUFFER_USAGE_GPU_SAMPLED_IMAGE;

    AHardwareBuffer *buffer = nullptr;
    if (AHardwareBuffer_allocate(&desc, &buffer) != 0) {
      return 0;
    }

    AHardwareBuffer_Desc allocated = {};
    AHardwareBuffer_describe(buffer, &allocated);
    const size_t rowBytes = static_cast<size_t>(allocated.stride) * 4;

    void *mappedBuffer = nullptr;
    AHardwareBuffer_lock(buffer, AHARDWAREBUFFER_USAGE_CPU_WRITE_RARELY, -1,
                         nullptr, &mappedBuffer);
    if (mappedBuffer == nullptr) {
      AHardwareBuffer_release(buffer);
      return 0;
    }

    auto *base = static_cast<uint8_t *>(mappedBuffer);
    for (int y = 0; y < height; ++y) {
      uint8_t *row = base + y * rowBytes;
      for (int x = 0; x < width; ++x) {
        uint8_t r = static_cast<uint8_t>((x * 255) / std::max(width - 1, 1));
        uint8_t g = static_cast<uint8_t>((y * 255) / std::max(height - 1, 1));
        uint8_t b = static_cast<uint8_t>(((x + y) & 0x20) ? 220 : 30);
        row[x * 4 + 0] = r; // RGBA byte order
        row[x * 4 + 1] = g;
        row[x * 4 + 2] = b;
        row[x * 4 + 3] = 0xFF;
      }
    }

    AHardwareBuffer_unlock(buffer, nullptr);
    return reinterpret_cast<uint64_t>(buffer);
#else
    return 0;
#endif
  }

#if !defined(SK_GRAPHITE)
  GrDirectContext *getDirectContext() override {
    return OpenGLContext::getInstance().getDirectContext();
  }

  const TextureInfo getTexture(sk_sp<SkImage> image) override {
    GrBackendTexture texture;
    if (!SkImages::GetBackendTextureFromImage(image, &texture, true)) {
      throw std::runtime_error("Couldn't get backend texture from image.");
    }
    return getTextureInfo(texture);
  }

  const TextureInfo getTexture(sk_sp<SkSurface> surface) override {
    GrBackendTexture texture = SkSurfaces::GetBackendTexture(
        surface.get(), SkSurface::BackendHandleAccess::kFlushRead);
    return getTextureInfo(texture);
  }

  static TextureInfo getTextureInfo(const GrBackendTexture &texture) {

    if (!texture.isValid()) {
      throw std::runtime_error("invalid backend texture");
    }
    GrGLTextureInfo textureInfo;
    if (!GrBackendTextures::GetGLTextureInfo(texture, &textureInfo)) {
      throw std::runtime_error("couldn't get OpenGL texture");
    }

    OpenGLContext::getInstance().makeCurrent();
    glFlush();

    TextureInfo texInfo;
    texInfo.glProtected = textureInfo.isProtected();
    texInfo.glID = textureInfo.fID;
    texInfo.glFormat = textureInfo.fFormat;
    texInfo.glTarget = textureInfo.fTarget;
    return texInfo;
  }
#endif

  sk_sp<SkFontMgr> createFontMgr() override {
    return SkFontMgr_New_Android(nullptr, SkFontScanner_Make_FreeType());
  }

  void runOnMainThread(std::function<void()> task) override {
    _jniPlatformContext->runTaskOnMainThread(std::move(task));
  }

  sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) override {
    return _jniPlatformContext->takeScreenshotFromViewTag(tag);
  }

private:
  JniPlatformContext *_jniPlatformContext;
};

} // namespace RNSkia
