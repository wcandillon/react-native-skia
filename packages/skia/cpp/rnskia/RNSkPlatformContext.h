#pragma once

#include <exception>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>

#include "RNSkVideo.h"
#include "WindowContext.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#include "include/core/SkData.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkImage.h"
#include "include/core/SkStream.h"
#include "include/core/SkSurface.h"

#pragma clang diagnostic pop

#include <ReactCommon/CallInvoker.h>

namespace RNSkia {

namespace react = facebook::react;

struct TextureInfo {
  const void *mtlTexture = nullptr;
  unsigned int glTarget = 0;
  unsigned int glID = 0;
  unsigned int glFormat = 0;
  bool glProtected = false;
};

class RNSkPlatformContext {
public:
  /**
   * Constructor
   */
  RNSkPlatformContext(std::shared_ptr<react::CallInvoker> callInvoker,
                      float pixelDensity)
      : _pixelDensity(pixelDensity), _callInvoker(callInvoker) {}

  virtual ~RNSkPlatformContext() = default;

  /**
   * Schedules the function to be run on the javascript thread async
   * @param func Function to run
   */
  void runOnJavascriptThread(std::function<void()> func) {
    _callInvoker->invokeAsync(std::move(func));
  }

  /**
   * Runs the passed function on the main thread
   * @param func Function to run.
   */
  virtual void runOnMainThread(std::function<void()> func) = 0;

  /**
   * Takes a screenshot of a given view represented by the view tag
   * @param tag React view tag
   */
  virtual sk_sp<SkImage> takeScreenshotFromViewTag(size_t tag) = 0;

  /**
   * Returns an SkStream wrapping the require uri provided.
   * @param sourceUri Uri for the resource to load as a string
   * @op Operation to execute when the stream has successfuly been loaded.
   */
  virtual void performStreamOperation(
      const std::string &sourceUri,
      const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) = 0;

  /**
   * Raises an exception on the platform. This function does not necessarily
   * throw an exception and stop execution, so it is important to stop execution
   * by returning after calling the function
   * @param err Error to raise
   */
  virtual void raiseError(const std::exception &err) = 0;

  /**
   * Creates an offscreen surface
   * @param width Width of the offscreen surface
   * @param height Height of the offscreen surface
   * @return sk_sp<SkSurface>
   */
  virtual sk_sp<SkSurface> makeOffscreenSurface(int width, int height) = 0;

  virtual std::shared_ptr<WindowContext>
  makeContextFromNativeSurface(void *surface, int width, int height) = 0;

  /**
   * Creates an image from a native buffer.
   * - On iOS, this is a `CVPixelBufferRef`
   * - On Android, this is a `AHardwareBuffer*`
   * @param buffer The native buffer.
   * @return sk_sp<SkImage>
   */
  virtual sk_sp<SkImage> makeImageFromNativeBuffer(void *buffer) = 0;

  virtual sk_sp<SkImage>
  makeImageFromNativeTexture(const TextureInfo &textureInfo, int width,
                             int height, bool mipMapped) = 0;

#if !defined(SK_GRAPHITE)
  virtual GrDirectContext *getDirectContext() = 0;
#endif

  virtual void releaseNativeBuffer(uint64_t pointer) = 0;

  virtual uint64_t makeNativeBuffer(sk_sp<SkImage> image) = 0;

  virtual const TextureInfo getTexture(sk_sp<SkSurface> image) = 0;

  virtual const TextureInfo getTexture(sk_sp<SkImage> image) = 0;

  virtual std::shared_ptr<RNSkVideo> createVideo(const std::string &url) = 0;

  /**
   * Return the Platform specific font manager
   */
  virtual sk_sp<SkFontMgr> createFontMgr() = 0;

  /**
   * Creates an skImage containing the screenshot of a native view and its
   * children.
   * @param viewTag React viewtag
   * @param callback Called when image is ready or with null if something
   * failed.
   */
  virtual void
  makeViewScreenshot(int viewTag,
                     std::function<void(sk_sp<SkImage>)> callback) {
    runOnMainThread([this, callback, viewTag]() {
      callback(takeScreenshotFromViewTag(viewTag));
    });
  }

  /**
   * Raises an exception on the platform. This function does not necessarily
   * throw an exception and stop execution, so it is important to stop execution
   * by returning after calling the function
   * @param message Message to show
   */
  void raiseError(const std::string &message) {
    return raiseError(std::runtime_error(message));
  }

  /**
   * @return Current scale factor for pixels
   */
  float getPixelDensity() { return _pixelDensity; }

private:
  float _pixelDensity;
  std::shared_ptr<react::CallInvoker> _callInvoker;
};
} // namespace RNSkia
