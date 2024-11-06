#import "RNSkiOSPlatformContext.h"

#import <CoreMedia/CMSampleBuffer.h>
#import <React/RCTUtils.h>
#include <thread>
#include <utility>

#import "DawnContext.h"
#include "RNSkiOSVideo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import "include/core/SkColorSpace.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkSurface.h"

#include "include/ports/SkFontMgr_mac_ct.h"

#pragma clang diagnostic pop

namespace RNSkia {

void RNSkiOSPlatformContext::performStreamOperation(
    const std::string &sourceUri,
    const std::function<void(std::unique_ptr<SkStreamAsset>)> &op) {

  auto loader = [=]() {
    NSURL *url = [[NSURL alloc]
        initWithString:[NSString stringWithUTF8String:sourceUri.c_str()]];

    NSData *data = nullptr;
    auto scheme = url.scheme;
    auto extension = url.pathExtension;

    if (scheme == nullptr &&
        (extension == nullptr || [extension isEqualToString:@""])) {
      // If the extension and scheme is nil, we assume that we're trying to
      // load from the embedded iOS app bundle and will try to load image
      // and get data from the image directly. imageNamed will return the
      // best version of the requested image:
      auto image = [UIImage imageNamed:[url absoluteString]];
      // We don't know the image format (png, jpg, etc) but
      // UIImagePNGRepresentation will support all of them
      data = UIImagePNGRepresentation(image);
    } else {
      // Load from metro / node
      data = [NSData dataWithContentsOfURL:url];
    }

    auto bytes = [data bytes];
    auto skData = SkData::MakeWithCopy(bytes, [data length]);
    auto stream = SkMemoryStream::Make(skData);

    op(std::move(stream));
  };

  // Fire and forget the thread - will be resolved on completion
  std::thread(loader).detach();
}

void RNSkiOSPlatformContext::releaseNativeBuffer(uint64_t pointer) {
  CVPixelBufferRef pixelBuffer = reinterpret_cast<CVPixelBufferRef>(pointer);
  if (pixelBuffer) {
    CFRelease(pixelBuffer);
  }
}

uint64_t RNSkiOSPlatformContext::makeNativeBuffer(sk_sp<SkImage> image) {
  // TODO: implement
  return 0;
  // 0. If Image is not in BGRA, convert to BGRA as only BGRA is supported.
  //  if (image->colorType() != kBGRA_8888_SkColorType) {
  //    // on iOS, 32_BGRA is the only supported RGB format for CVPixelBuffers.
  //    image = image->makeColorTypeAndColorSpace(
  //        DawnContext::getInstance()._context.skContext.get(),
  //        kBGRA_8888_SkColorType, SkColorSpace::MakeSRGB());
  //    if (image == nullptr) {
  //      throw std::runtime_error(
  //          "Failed to convert image to BGRA_8888 colortype! Only BGRA_8888 "
  //          "NativeBuffers are supported.");
  //    }
  //  }
  //
  //  // 1. Get image info
  //  auto bytesPerPixel = image->imageInfo().bytesPerPixel();
  //  int bytesPerRow = image->width() * bytesPerPixel;
  //  auto buf = SkData::MakeUninitialized(image->width() * image->height() *
  //                                       bytesPerPixel);
  //  SkImageInfo info = SkImageInfo::Make(image->width(), image->height(),
  //                                       image->colorType(),
  //                                       image->alphaType());
  //  // 2. Copy pixels into our buffer
  //  image->readPixels(nullptr, info, const_cast<void *>(buf->data()),
  //  bytesPerRow,
  //                    0, 0);
  //
  //  // 3. Create an IOSurface (GPU + CPU memory)
  //  CFMutableDictionaryRef dict = CFDictionaryCreateMutable(
  //      kCFAllocatorDefault, 0, &kCFTypeDictionaryKeyCallBacks,
  //      &kCFTypeDictionaryValueCallBacks);
  //  int width = image->width();
  //  int height = image->height();
  //  int pitch = width * bytesPerPixel;
  //  int size = width * height * bytesPerPixel;
  //  OSType pixelFormat = kCVPixelFormatType_32BGRA;
  //  CFDictionarySetValue(
  //      dict, kIOSurfaceBytesPerRow,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &pitch));
  //  CFDictionarySetValue(
  //      dict, kIOSurfaceBytesPerElement,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type,
  //      &bytesPerPixel));
  //  CFDictionarySetValue(
  //      dict, kIOSurfaceWidth,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &width));
  //  CFDictionarySetValue(
  //      dict, kIOSurfaceHeight,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &height));
  //  CFDictionarySetValue(
  //      dict, kIOSurfacePixelFormat,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type,
  //      &pixelFormat));
  //  CFDictionarySetValue(
  //      dict, kIOSurfaceAllocSize,
  //      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &size));
  //  IOSurfaceRef surface = IOSurfaceCreate(dict);
  //  if (surface == nil) {
  //    throw std::runtime_error("Failed to create " + std::to_string(width) +
  //    "x" +
  //                             std::to_string(height) + " IOSurface!");
  //  }
  //
  //  // 4. Copy over the memory from the pixels into the IOSurface
  //  IOSurfaceLock(surface, 0, nil);
  //  void *base = IOSurfaceGetBaseAddress(surface);
  //  memcpy(base, buf->data(), buf->size());
  //  IOSurfaceUnlock(surface, 0, nil);
  //
  //  // 5. Create a CVPixelBuffer from the IOSurface
  //  CVPixelBufferRef pixelBuffer = nullptr;
  //  CVReturn result =
  //      CVPixelBufferCreateWithIOSurface(nil, surface, nil, &pixelBuffer);
  //  if (result != kCVReturnSuccess) {
  //    throw std::runtime_error(
  //        "Failed to create CVPixelBuffer from SkImage! Return value: " +
  //        std::to_string(result));
  //  }
  //
  //  // 8. Return CVPixelBuffer casted to uint64_t
  //  return reinterpret_cast<uint64_t>(pixelBuffer);
}

std::shared_ptr<RNSkVideo>
RNSkiOSPlatformContext::createVideo(const std::string &url) {
  return std::make_shared<RNSkiOSVideo>(url, this);
}

std::shared_ptr<WindowContext>
RNSkiOSPlatformContext::makeContextFromNativeSurface(void *surface, int width,
                                                     int height) {
  return DawnContext::getInstance().MakeWindow(surface, width, height);
}

void RNSkiOSPlatformContext::raiseError(const std::exception &err) {
  RCTFatal(RCTErrorWithMessage([NSString stringWithUTF8String:err.what()]));
}

sk_sp<SkSurface> RNSkiOSPlatformContext::makeOffscreenSurface(int width,
                                                              int height) {
  return DawnContext::getInstance().MakeOffscreen(width, height);
}

sk_sp<SkImage> RNSkiOSPlatformContext::makeImageFromNativeBuffer(void *buffer) {
  return DawnContext::getInstance().MakeImageFromBuffer(buffer);
}

sk_sp<SkFontMgr> RNSkiOSPlatformContext::createFontMgr() {
  return SkFontMgr_New_CoreText(nullptr);
}

void RNSkiOSPlatformContext::runOnMainThread(std::function<void()> func) {
  dispatch_async(dispatch_get_main_queue(), ^{
    func();
  });
}

sk_sp<SkImage>
RNSkiOSPlatformContext::takeScreenshotFromViewTag(size_t viewTag) {
  return [_screenshotService
      screenshotOfViewWithTag:[NSNumber numberWithLong:viewTag]];
}

void RNSkiOSPlatformContext::startDrawLoop() {
  if (_displayLink == nullptr) {
    _displayLink = [[DisplayLink alloc] init];
    [_displayLink start:^(double time) {
      notifyDrawLoop(false);
    }];
  }
}

void RNSkiOSPlatformContext::stopDrawLoop() {
  if (_displayLink != nullptr) {
    [_displayLink stop];
    _displayLink = nullptr;
  }
}

} // namespace RNSkia
