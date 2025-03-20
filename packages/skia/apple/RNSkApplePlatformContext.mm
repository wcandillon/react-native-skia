#import "RNSkApplePlatformContext.h"

#import <CoreMedia/CMSampleBuffer.h>
#include <Metal/Metal.h>
#import <React/RCTUtils.h>
#include <thread>
#include <utility>

#if defined(SK_GRAPHITE)
#include "DawnContext.h"
#else
#include "MetalContext.h"
#endif
#include "RNSkAppleVideo.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import "include/core/SkColorSpace.h"
#include "include/core/SkFontMgr.h"
#include "include/core/SkSurface.h"

#include "include/ports/SkFontMgr_mac_ct.h"

#pragma clang diagnostic pop

namespace RNSkia {

void RNSkApplePlatformContext::performStreamOperation(
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

void RNSkApplePlatformContext::releaseNativeBuffer(uint64_t pointer) {
  CVPixelBufferRef pixelBuffer = reinterpret_cast<CVPixelBufferRef>(pointer);
  if (pixelBuffer) {
    CFRelease(pixelBuffer);
  }
}

uint64_t RNSkApplePlatformContext::makeNativeBuffer(sk_sp<SkImage> image) {
  // 0. If Image is not in BGRA, convert to BGRA as only BGRA is supported.
  if (image->colorType() != kBGRA_8888_SkColorType) {
#if defined(SK_GRAPHITE)
    SkImage::RequiredProperties requiredProps;
    image = image->makeColorTypeAndColorSpace(
        DawnContext::getInstance().getRecorder(), kBGRA_8888_SkColorType,
        SkColorSpace::MakeSRGB(), requiredProps);
#else
    // on iOS, 32_BGRA is the only supported RGB format for CVPixelBuffers.
    image = image->makeColorTypeAndColorSpace(
        MetalContext::getInstance().getDirectContext(), kBGRA_8888_SkColorType,
        SkColorSpace::MakeSRGB());
#endif
    if (image == nullptr) {
      throw std::runtime_error(
          "Failed to convert image to BGRA_8888 colortype! Only BGRA_8888 "
          "NativeBuffers are supported.");
    }
  }

  // 1. Get image info
  auto bytesPerPixel = image->imageInfo().bytesPerPixel();
  int bytesPerRow = image->width() * bytesPerPixel;
  auto buf = SkData::MakeUninitialized(image->width() * image->height() *
                                       bytesPerPixel);
  SkImageInfo info = SkImageInfo::Make(image->width(), image->height(),
                                       image->colorType(), image->alphaType());
  // 2. Copy pixels into our buffer
  image->readPixels(nullptr, info, const_cast<void *>(buf->data()), bytesPerRow,
                    0, 0);

  // 3. Create an IOSurface (GPU + CPU memory)
  CFMutableDictionaryRef dict = CFDictionaryCreateMutable(
      kCFAllocatorDefault, 0, &kCFTypeDictionaryKeyCallBacks,
      &kCFTypeDictionaryValueCallBacks);
  int width = image->width();
  int height = image->height();
  int pitch = width * bytesPerPixel;
  int size = width * height * bytesPerPixel;
  OSType pixelFormat = kCVPixelFormatType_32BGRA;
  CFDictionarySetValue(
      dict, kIOSurfaceBytesPerRow,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &pitch));
  CFDictionarySetValue(
      dict, kIOSurfaceBytesPerElement,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &bytesPerPixel));
  CFDictionarySetValue(
      dict, kIOSurfaceWidth,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &width));
  CFDictionarySetValue(
      dict, kIOSurfaceHeight,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &height));
  CFDictionarySetValue(
      dict, kIOSurfacePixelFormat,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &pixelFormat));
  CFDictionarySetValue(
      dict, kIOSurfaceAllocSize,
      CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &size));
  IOSurfaceRef surface = IOSurfaceCreate(dict);
  if (surface == nil) {
    throw std::runtime_error("Failed to create " + std::to_string(width) + "x" +
                             std::to_string(height) + " IOSurface!");
  }

  // 4. Copy over the memory from the pixels into the IOSurface
  IOSurfaceLock(surface, 0, nil);
  void *base = IOSurfaceGetBaseAddress(surface);
  memcpy(base, buf->data(), buf->size());
  IOSurfaceUnlock(surface, 0, nil);

  // 5. Create a CVPixelBuffer from the IOSurface
  CVPixelBufferRef pixelBuffer = nullptr;
  CVReturn result =
      CVPixelBufferCreateWithIOSurface(nil, surface, nil, &pixelBuffer);
  if (result != kCVReturnSuccess) {
    throw std::runtime_error(
        "Failed to create CVPixelBuffer from SkImage! Return value: " +
        std::to_string(result));
  }

  // 8. Return CVPixelBuffer casted to uint64_t
  return reinterpret_cast<uint64_t>(pixelBuffer);
}

const TextureInfo RNSkApplePlatformContext::getTexture(sk_sp<SkImage> image) {
  GrBackendTexture texture;
  TextureInfo result;
  if (!SkImages::GetBackendTextureFromImage(image, &texture, true)) {
    throw std::runtime_error("Couldn't get backend texture");
  }
  if (!texture.isValid()) {
    throw std::runtime_error("Invalid backend texture");
  }
  GrMtlTextureInfo textureInfo;
  if (!GrBackendTextures::GetMtlTextureInfo(texture, &textureInfo)) {
    throw std::runtime_error("Couldn't get Metal texture info");
  }
  result.mtlTexture = textureInfo.fTexture.get();
  return result;
}

const TextureInfo RNSkApplePlatformContext::getTexture(sk_sp<SkSurface> surface) {
  GrBackendTexture texture = SkSurfaces::GetBackendTexture(
      surface.get(), SkSurfaces::BackendHandleAccess::kFlushRead);
  TextureInfo result;
  if (!texture.isValid()) {
    throw std::runtime_error("Invalid backend texture");
  }
  GrMtlTextureInfo textureInfo;
  if (!GrBackendTextures::GetMtlTextureInfo(texture, &textureInfo)) {
    throw std::runtime_error("Couldn't get Metal texture info");
  }
  result.mtlTexture = textureInfo.fTexture.get();
  return result;
}

std::shared_ptr<RNSkVideo>
RNSkApplePlatformContext::createVideo(const std::string &url) {
  return std::make_shared<RNSkAppleVideo>(url, this);
}

std::shared_ptr<WindowContext>
RNSkApplePlatformContext::makeContextFromNativeSurface(void *surface, int width,
                                                     int height) {
#if defined(SK_GRAPHITE)
  return DawnContext::getInstance().MakeWindow(surface, width, height);
#else
  return MetalContext::getInstance().MakeWindow((__bridge CALayer *)surface,
                                                width, height);
#endif
}

void RNSkApplePlatformContext::raiseError(const std::exception &err) {
  RCTFatal(RCTErrorWithMessage([NSString stringWithUTF8String:err.what()]));
}

sk_sp<SkSurface> RNSkApplePlatformContext::makeOffscreenSurface(int width,
                                                              int height) {
#if defined(SK_GRAPHITE)
  return DawnContext::getInstance().MakeOffscreen(width, height);
#else
  return MetalContext::getInstance().MakeOffscreen(width, height);
#endif
}

sk_sp<SkImage> RNSkApplePlatformContext::makeImageFromNativeBuffer(void *buffer) {
#if defined(SK_GRAPHITE)
  return DawnContext::getInstance().MakeImageFromBuffer(buffer);
#else
  return MetalContext::getInstance().MakeImageFromBuffer(buffer);
#endif
}

sk_sp<SkImage> RNSkApplePlatformContext::makeImageFromNativeTexture(
    const TextureInfo &texInfo, int width, int height, bool mipMapped) {
  id<MTLTexture> mtlTexture = (__bridge id<MTLTexture>)(texInfo.mtlTexture);

  SkColorType colorType = mtlPixelFormatToSkColorType(mtlTexture.pixelFormat);
  if (colorType == SkColorType::kUnknown_SkColorType) {
    throw std::runtime_error("Unsupported pixelFormat");
  }

  GrMtlTextureInfo textureInfo;
  textureInfo.fTexture.retain((__bridge const void *)mtlTexture);

  GrBackendTexture texture = GrBackendTextures::MakeMtl(
      width, height, mipMapped ? skgpu::Mipmapped::kYes : skgpu::Mipmapped::kNo,
      textureInfo);

  return SkImages::BorrowTextureFrom(getDirectContext(), texture,
                                     kTopLeft_GrSurfaceOrigin, colorType,
                                     kPremul_SkAlphaType, nullptr);
}

SkColorType RNSkApplePlatformContext::mtlPixelFormatToSkColorType(
    MTLPixelFormat pixelFormat) {
  switch (pixelFormat) {
  case MTLPixelFormatRGBA8Unorm:
    return kRGBA_8888_SkColorType;
  case MTLPixelFormatBGRA8Unorm:
    return kBGRA_8888_SkColorType;
  case MTLPixelFormatRGB10A2Unorm:
    return kRGBA_1010102_SkColorType;
  case MTLPixelFormatR8Unorm:
    return kGray_8_SkColorType;
  case MTLPixelFormatRGBA16Float:
    return kRGBA_F16_SkColorType;
  case MTLPixelFormatRG8Unorm:
    return kR8G8_unorm_SkColorType;
  case MTLPixelFormatR16Float:
    return kA16_float_SkColorType;
  case MTLPixelFormatRG16Float:
    return kR16G16_float_SkColorType;
  case MTLPixelFormatR16Unorm:
    return kA16_unorm_SkColorType;
  case MTLPixelFormatRG16Unorm:
    return kR16G16_unorm_SkColorType;
  case MTLPixelFormatRGBA16Unorm:
    return kR16G16B16A16_unorm_SkColorType;
  case MTLPixelFormatRGBA8Unorm_sRGB:
    return kSRGBA_8888_SkColorType;
  default:
    return kUnknown_SkColorType;
  }
}

#if !defined(SK_GRAPHITE)
GrDirectContext *RNSkApplePlatformContext::getDirectContext() {
  return MetalContext::getInstance().getDirectContext();
}
#endif

sk_sp<SkFontMgr> RNSkApplePlatformContext::createFontMgr() {
  return SkFontMgr_New_CoreText(nullptr);
}

void RNSkApplePlatformContext::runOnMainThread(std::function<void()> func) {
  dispatch_async(dispatch_get_main_queue(), ^{
    func();
  });
}

sk_sp<SkImage>
RNSkApplePlatformContext::takeScreenshotFromViewTag(size_t viewTag) {
  return [_screenshotService
      screenshotOfViewWithTag:[NSNumber numberWithLong:viewTag]];
}

} // namespace RNSkia
