#pragma once

#include <chrono>
#include <exception>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include <android/api-level.h>
#include <android/hardware_buffer.h>
#include <poll.h>

#include "RNDawnContext.h"

#include "JniPlatformContext.h"
#include "JniSkiaPresentedImages.h"
#include "RNSkPlatformContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/ports/SkFontMgr_android.h"
#include "include/ports/SkFontScanner_FreeType.h"

#pragma clang diagnostic pop

namespace RNSkia {

/** A Java bitmap the image views draw (see RNSkPresentedImages). */
class AndroidPresentedBitmap : public PresentedBitmap {
public:
  explicit AndroidPresentedBitmap(jni::global_ref<JBitmap::javaobject> bitmap)
      : _bitmap(std::move(bitmap)) {}

  // The reference goes on whichever thread drops the last owner, which may
  // not be attached to the JVM.
  ~AndroidPresentedBitmap() override {
    jni::ThreadScope threadScope;
    _bitmap.reset();
  }

  void present(uint32_t id) override {
    JniSkiaPresentedImages::publish(id, _bitmap);
  }

private:
  jni::global_ref<JBitmap::javaobject> _bitmap;
};

/**
 A Java bitmap being written, its pixels locked until it is finished or let go
 of (see JniSkiaPresentedImages::makeBitmap).
 */
class AndroidPresentedPixels : public PresentedPixels {
public:
  explicit AndroidPresentedPixels(LockedBitmap locked)
      : PresentedPixels(locked.pixels), _bitmap(std::move(locked.bitmap)) {}

  // On whichever thread drops the last owner, which may not be attached to
  // the JVM.
  ~AndroidPresentedPixels() override {
    if (!_bitmap) {
      return;
    }
    JniSkiaPresentedImages::unlockBitmap(_bitmap);
    jni::ThreadScope threadScope;
    _bitmap.reset();
  }

  std::shared_ptr<PresentedBitmap> finish() override {
    JniSkiaPresentedImages::unlockBitmap(_bitmap);
    return std::make_shared<AndroidPresentedBitmap>(std::move(_bitmap));
  }

private:
  jni::global_ref<JBitmap::javaobject> _bitmap;
};

inline wgpu::SharedTextureMemory
importHardwareBuffer(const wgpu::Device &device, AHardwareBuffer *buffer) {
  wgpu::SharedTextureMemoryAHardwareBufferDescriptor hardwareBuffer{};
  hardwareBuffer.handle = buffer;
  wgpu::SharedTextureMemoryDescriptor descriptor{};
  descriptor.nextInChain = &hardwareBuffer;
  return device.ImportSharedTextureMemory(&descriptor);
}

/** Done once the sync fd of every fence is readable. */
class AndroidPresentedDrawing : public PresentedDrawing {
public:
  /** nullptr when a fence is not a sync fd. */
  static std::unique_ptr<AndroidPresentedDrawing>
  of(const std::vector<wgpu::SharedFence> &fences) {
    std::vector<int> pending;
    for (const auto &fence : fences) {
      wgpu::SharedFenceSyncFDExportInfo syncFd{};
      wgpu::SharedFenceExportInfo info{};
      info.nextInChain = &syncFd;
      fence.ExportInfo(&info);
      if (info.type != wgpu::SharedFenceType::SyncFD) {
        return nullptr;
      }
      // A fence that has signalled already has no fd.
      if (syncFd.handle >= 0) {
        pending.push_back(syncFd.handle);
      }
    }
    return std::unique_ptr<AndroidPresentedDrawing>(
        new AndroidPresentedDrawing(fences, std::move(pending)));
  }

  bool waitFor(std::chrono::milliseconds slice) override {
    if (_pending.empty()) {
      return true;
    }
    std::vector<pollfd> descriptors;
    descriptors.reserve(_pending.size());
    for (int fd : _pending) {
      descriptors.push_back({fd, POLLIN, 0});
    }
    if (poll(descriptors.data(), descriptors.size(),
             static_cast<int>(slice.count())) > 0) {
      _pending.clear();
      for (const auto &descriptor : descriptors) {
        if ((descriptor.revents & POLLIN) == 0) {
          _pending.push_back(descriptor.fd);
        }
      }
    }
    return _pending.empty();
  }

private:
  AndroidPresentedDrawing(std::vector<wgpu::SharedFence> fences,
                          std::vector<int> pending)
      : _fences(std::move(fences)), _pending(std::move(pending)) {}

  // They own the fds.
  std::vector<wgpu::SharedFence> _fences;
  std::vector<int> _pending;
};

/** Shown as a hardware bitmap of the buffer itself. */
class AndroidPresentedBuffer : public PresentedBuffer {
public:
  /** nullptr when it could not be allocated. */
  static std::unique_ptr<AndroidPresentedBuffer> make(const SkImageInfo &info) {
    AHardwareBuffer_Desc description{};
    description.width = static_cast<uint32_t>(info.width());
    description.height = static_cast<uint32_t>(info.height());
    description.layers = 1;
    description.format = AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM;
    description.usage = AHARDWAREBUFFER_USAGE_GPU_SAMPLED_IMAGE |
                        AHARDWAREBUFFER_USAGE_GPU_COLOR_OUTPUT;
    AHardwareBuffer *buffer = nullptr;
    if (AHardwareBuffer_allocate(&description, &buffer) != 0 ||
        buffer == nullptr) {
      return nullptr;
    }
    return std::unique_ptr<AndroidPresentedBuffer>(
        new AndroidPresentedBuffer(info, buffer));
  }

  ~AndroidPresentedBuffer() override { AHardwareBuffer_release(_buffer); }

  AndroidPresentedBuffer(const AndroidPresentedBuffer &) = delete;
  AndroidPresentedBuffer &operator=(const AndroidPresentedBuffer &) = delete;

  wgpu::SharedTextureMemory import(const wgpu::Device &device) override {
    return importHardwareBuffer(device, _buffer);
  }

  std::unique_ptr<PresentedDrawing>
  drawingOf(const std::vector<wgpu::SharedFence> &fences,
            const std::vector<uint64_t> &) override {
    return AndroidPresentedDrawing::of(fences);
  }

  /** None when Android could not wrap the buffer. */
  jni::global_ref<JBitmap::javaobject> hardwareBitmap() {
    return JniSkiaPresentedImages::hardwareBitmapOf(_buffer);
  }

  std::shared_ptr<PresentedBitmap> finish() override {
    auto bitmap = hardwareBitmap();
    if (!bitmap) {
      return nullptr;
    }
    return std::make_shared<AndroidPresentedBitmap>(std::move(bitmap));
  }

private:
  AndroidPresentedBuffer(const SkImageInfo &info, AHardwareBuffer *buffer)
      : PresentedBuffer(info), _buffer(buffer) {}

  AHardwareBuffer *_buffer;
};

/**
 Whether a presented image is drawn into a hardware buffer: from Android 13, on
 a device that imports one with sync fd fences; into CPU pixels before, since
 Adreno 630's driver on Android 10 refuses the import and Dawn loses the
 device for it (https://issues.chromium.org/issues/576320192).
 */
inline bool makesAndroidPresentedBuffers() {
  auto *dawnContext = DawnContext::tryGetInstance();
  return android_get_device_api_level() >= __ANDROID_API_T__ &&
         dawnContext != nullptr &&
         dawnContext->getWGPUDevice().HasFeature(
             wgpu::FeatureName::SharedTextureMemoryAHardwareBuffer) &&
         dawnContext->getWGPUDevice().HasFeature(
             wgpu::FeatureName::SharedFenceSyncFD);
}

inline std::optional<PresentedTarget>
makeAndroidPresentedTarget(const SkImageInfo &info) {
  if (makesAndroidPresentedBuffers()) {
    auto buffer =
        Owned<PresentedBuffer>::of(AndroidPresentedBuffer::make(info));
    if (!buffer.has_value()) {
      return std::nullopt;
    }
    return PresentedTarget(std::move(*buffer));
  }
  auto locked = JniSkiaPresentedImages::makeBitmap(info);
  if (!locked.bitmap) {
    return std::nullopt;
  }
  return PresentedTarget(
      Owned<PresentedPixels>::make<AndroidPresentedPixels>(std::move(locked)));
}

class RNSkAndroidPlatformContext : public RNSkPlatformContext {
public:
  RNSkAndroidPlatformContext(
      JniPlatformContext *jniPlatformContext,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker)
      : RNSkPlatformContext(std::move(jsCallInvoker),
                            jniPlatformContext->getPixelDensity()),
        _jniPlatformContext(jniPlatformContext) {}

  // Follows display density changes (see PlatformContext.java).
  float getPixelDensity() override {
    return _jniPlatformContext->getPixelDensity();
  }

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
    return DawnContext::getInstance().MakeOffscreen(width, height,
                                                    useP3ColorSpace);
  }

  sk_sp<SkFontMgr> createFontMgr() override {
    return SkFontMgr_New_Android(nullptr, SkFontScanner_Make_FreeType());
  }

  void runOnMainThread(std::function<void()> task) override {
    _jniPlatformContext->runTaskOnMainThread(std::move(task));
  }

  std::optional<PresentedTarget>
  makePresentedTarget(const SkImageInfo &info) override {
    return makeAndroidPresentedTarget(info);
  }

  bool makesPresentedBuffers() override {
    return makesAndroidPresentedBuffers();
  }

  void discardPresentedBitmap(uint32_t id) override {
    JniSkiaPresentedImages::discard(id);
  }

  void presentFailure(uint32_t id) override {
    JniSkiaPresentedImages::fail(id);
  }

  // AOSP's hardware-accelerated canvas throws on a bitmap past 100 MB
  // (RecordingCanvas.MAX_BITMAP_SIZE).
  size_t getMaxPresentedBitmapBytes() override { return 100 * 1024 * 1024; }

private:
  JniPlatformContext *_jniPlatformContext;
};

} // namespace RNSkia
