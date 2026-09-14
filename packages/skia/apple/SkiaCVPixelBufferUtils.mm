//
//  SkiaCVPixelBufferUtils.mm
//  react-native-skia
//
//  Created by Marc Rousavy on 10.04.24.
//

#import "SkiaCVPixelBufferUtils.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"

#import "include/core/SkCanvas.h"
#import "include/core/SkColorSpace.h"

#import <CoreVideo/CVImageBuffer.h>
#import <CoreVideo/CVMetalTextureCache.h>

#import <include/gpu/ganesh/GrBackendSurface.h>
#import <include/gpu/ganesh/GrDirectContext.h>
#import <include/gpu/ganesh/SkImageGanesh.h>
#import <include/gpu/ganesh/SkSurfaceGanesh.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendContext.h>
#import <include/gpu/ganesh/mtl/GrMtlBackendSurface.h>
#import <include/gpu/ganesh/mtl/GrMtlDirectContext.h>
#import <include/gpu/ganesh/mtl/SkSurfaceMetal.h>

#pragma clang diagnostic pop

#include <TargetConditionals.h>
#include <cmath>
#if TARGET_RT_BIG_ENDIAN
#define FourCC2Str(fourcc)                                                     \
  (const char[]){*((char *)&fourcc), *(((char *)&fourcc) + 1),                 \
                 *(((char *)&fourcc) + 2), *(((char *)&fourcc) + 3), 0}
#else
#define FourCC2Str(fourcc)                                                     \
  (const char[]){*(((char *)&fourcc) + 3), *(((char *)&fourcc) + 2),           \
                 *(((char *)&fourcc) + 1), *(((char *)&fourcc) + 0), 0}
#endif

// pragma MARK: TextureHolder

TextureHolder::TextureHolder(CVMetalTextureRef texture) : _texture(texture) {}
TextureHolder::~TextureHolder() {
  // ARC will now automatically release _texture.
  CFRelease(_texture);
}

GrBackendTexture TextureHolder::toGrBackendTexture() {
  // Unwrap the underlying MTLTexture
  id<MTLTexture> mtlTexture = CVMetalTextureGetTexture(_texture);
  if (mtlTexture == nil) [[unlikely]] {
    throw std::runtime_error(
        "Failed to get MTLTexture from CVMetalTextureRef!");
  }

  // Wrap MTLTexture in Skia's GrBackendTexture
  GrMtlTextureInfo textureInfo;
  textureInfo.fTexture.retain((__bridge void *)mtlTexture);
  GrBackendTexture texture =
      GrBackendTextures::MakeMtl((int)mtlTexture.width, (int)mtlTexture.height,
                                 skgpu::Mipmapped::kNo, textureInfo);
  return texture;
}

MultiTexturesHolder::~MultiTexturesHolder() {
  for (TextureHolder *texture : _textures) {
    delete texture;
  }
}

void MultiTexturesHolder::addTexture(TextureHolder *texture) {
  _textures.push_back(texture);
}

// pragma MARK: Base

SkiaCVPixelBufferUtils::CVPixelBufferBaseFormat
SkiaCVPixelBufferUtils::getCVPixelBufferBaseFormat(
    CVPixelBufferRef pixelBuffer) {
  OSType format = CVPixelBufferGetPixelFormatType(pixelBuffer);

  switch (format) {
  // 8-bit YUV formats
  case kCVPixelFormatType_420YpCbCr8Planar:
  case kCVPixelFormatType_420YpCbCr8PlanarFullRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarFullRange:
  // 10-bit YUV formats
  case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    return CVPixelBufferBaseFormat::yuv;
  case kCVPixelFormatType_24RGB:
  case kCVPixelFormatType_24BGR:
  case kCVPixelFormatType_32ARGB:
  case kCVPixelFormatType_32BGRA:
  case kCVPixelFormatType_32ABGR:
  case kCVPixelFormatType_32RGBA:
  // 16-bit half-float RGBA
  case kCVPixelFormatType_64RGBAHalf:
    return CVPixelBufferBaseFormat::rgb;
  default:
    [[unlikely]] throw std::runtime_error(
        "CVPixelBuffer has unknown pixel format! " +
        std::string("Expected: any RGB or YUV format, Received: ") +
        std::string(FourCC2Str(format)));
  }
}

// pragma MARK: RGB

SkColorType SkiaCVPixelBufferUtils::RGB::getCVPixelBufferColorType(
    CVPixelBufferRef pixelBuffer) {
  OSType format = CVPixelBufferGetPixelFormatType(pixelBuffer);

  switch (format) {
  case kCVPixelFormatType_32BGRA:
    [[likely]] return kBGRA_8888_SkColorType;
  case kCVPixelFormatType_32RGBA:
    return kRGBA_8888_SkColorType;
  case kCVPixelFormatType_64RGBAHalf:
    return kRGBA_F16_SkColorType;
  // This can be extended with branches for specific RGB formats if Apple
  // uses new formats.
  default:
    [[unlikely]] throw std::runtime_error(
        "CVPixelBuffer has unknown RGB format! " +
        std::string(FourCC2Str(format)));
  }
}

sk_sp<SkImage> SkiaCVPixelBufferUtils::RGB::makeSkImageFromCVPixelBuffer(
    id<MTLDevice> device, GrDirectContext *context,
    CVPixelBufferRef pixelBuffer) {
  // 1. Get Skia color type for RGB buffer
  SkColorType colorType = getCVPixelBufferColorType(pixelBuffer);

  // 2. Get texture, RGB buffers only have one plane
  TextureHolder *texture = getSkiaTextureForCVPixelBufferPlane(
      device, pixelBuffer, /* planeIndex */ 0);

  // 3. Convert to image with manual memory cleanup
  return SkImages::BorrowTextureFrom(
      context, texture->toGrBackendTexture(), kTopLeft_GrSurfaceOrigin,
      colorType, kOpaque_SkAlphaType, nullptr,
      [](void *texture) { delete (TextureHolder *)texture; }, (void *)texture);
}

// pragma MARK: YUV

sk_sp<SkImage> SkiaCVPixelBufferUtils::YUV::makeSkImageFromCVPixelBuffer(
    id<MTLDevice> device, GrDirectContext *context,
    CVPixelBufferRef pixelBuffer) {
  // 1. Get all planes (YUV, Y_UV, Y_U_V or Y_U_V_A)
  const size_t planesCount = CVPixelBufferGetPlaneCount(pixelBuffer);
  if (planesCount > SkYUVAInfo::kMaxPlanes) [[unlikely]] {
    throw std::runtime_error(
        "CVPixelBuffer has " + std::to_string(planesCount) +
        " textures, but the platform only supports a maximum of " +
        std::to_string(SkYUVAInfo::kMaxPlanes) + " textures!");
  }
  MultiTexturesHolder *texturesHolder = new MultiTexturesHolder();
  GrBackendTexture textures[SkYUVAInfo::kMaxPlanes];

  for (size_t planeIndex = 0; planeIndex < planesCount; planeIndex++) {
    TextureHolder *textureHolder =
        getSkiaTextureForCVPixelBufferPlane(device, pixelBuffer, planeIndex);
    textures[planeIndex] = textureHolder->toGrBackendTexture();
    texturesHolder->addTexture(textureHolder);
  }

  // 2. Wrap info about buffer
  SkYUVAInfo info = getYUVAInfoForCVPixelBuffer(pixelBuffer);

  // 3. Wrap as YUVA textures type
  GrYUVABackendTextures yuvaTextures(info, textures, kTopLeft_GrSurfaceOrigin);

  // 4. Wrap into SkImage type with manualy memory cleanup
  return SkImages::TextureFromYUVATextures(
      context, yuvaTextures, nullptr,
      [](void *textureHolders) {
        delete (MultiTexturesHolder *)textureHolders;
      },
      (void *)texturesHolder);
}

SkYUVAInfo SkiaCVPixelBufferUtils::YUV::getYUVAInfoForCVPixelBuffer(
    CVPixelBufferRef pixelBuffer) {
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);
  SkISize size =
      SkISize::Make(static_cast<int>(width), static_cast<int>(height));

  OSType format = CVPixelBufferGetPixelFormatType(pixelBuffer);
  SkYUVAInfo::PlaneConfig planeConfig = getPlaneConfig(format);
  SkYUVAInfo::Subsampling subsampling = getSubsampling(format);
  SkYUVColorSpace colorspace = getColorspace(pixelBuffer);

  return SkYUVAInfo(size, planeConfig, subsampling, colorspace);
}

// pragma MARK: YUV getPlaneConfig()

SkYUVAInfo::PlaneConfig
SkiaCVPixelBufferUtils::YUV::getPlaneConfig(OSType pixelFormat) {
  switch (pixelFormat) {
  case kCVPixelFormatType_420YpCbCr8Planar:
  case kCVPixelFormatType_420YpCbCr8PlanarFullRange:
    return SkYUVAInfo::PlaneConfig::kY_U_V;
  case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    [[likely]] return SkYUVAInfo::PlaneConfig::kY_UV;

  // This can be extended with branches for specific YUV formats if Apple
  // uses new formats.
  default:
    [[unlikely]] throw std::runtime_error("Invalid pixel format! " +
                                          std::string(FourCC2Str(pixelFormat)));
  }
}

// pragma MARK: YUV getSubsampling()

SkYUVAInfo::Subsampling
SkiaCVPixelBufferUtils::YUV::getSubsampling(OSType pixelFormat) {
  switch (pixelFormat) {
  case kCVPixelFormatType_420YpCbCr8Planar:
  case kCVPixelFormatType_420YpCbCr8PlanarFullRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
    [[likely]] return SkYUVAInfo::Subsampling::k420;
  case kCVPixelFormatType_422YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
    return SkYUVAInfo::Subsampling::k422;
  case kCVPixelFormatType_444YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    return SkYUVAInfo::Subsampling::k444;
  // This can be extended with branches for specific YUV formats if Apple
  // uses new formats.
  default:
    [[unlikely]] throw std::runtime_error("Invalid pixel format! " +
                                          std::string(FourCC2Str(pixelFormat)));
  }
}

// pragma MARK: YUV getColorspace()

SkYUVColorSpace
SkiaCVPixelBufferUtils::YUV::getColorspace(CVPixelBufferRef pixelBuffer) {
  const OSType pixelFormat = CVPixelBufferGetPixelFormatType(pixelBuffer);

  CFTypeRef matrixAttachment = CVBufferCopyAttachment(
      pixelBuffer, kCVImageBufferYCbCrMatrixKey, nullptr);
  CFStringRef matrix = nullptr;
  if (matrixAttachment != nullptr &&
      CFGetTypeID(matrixAttachment) == CFStringGetTypeID()) {
    matrix = reinterpret_cast<CFStringRef>(matrixAttachment);
  }

  SkYUVColorSpace colorspace =
      getSkYUVColorSpaceFromMatrix(matrix, pixelFormat);
  if (matrixAttachment != nullptr) {
    CFRelease(matrixAttachment);
  }
  return colorspace;
}

// pragma MARK: YUV helpers

bool SkiaCVPixelBufferUtils::YUV::isFullRangeYUVFormat(OSType pixelFormat) {
  switch (pixelFormat) {
  case kCVPixelFormatType_420YpCbCr8PlanarFullRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    return true;
  default:
    return false;
  }
}

bool SkiaCVPixelBufferUtils::YUV::isTenBitYUVFormat(OSType pixelFormat) {
  switch (pixelFormat) {
  case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    return true;
  default:
    return false;
  }
}

SkYUVColorSpace
SkiaCVPixelBufferUtils::YUV::getSkYUVColorSpaceFromMatrix(CFStringRef matrix,
                                                          OSType pixelFormat) {
  const bool isFullRange = isFullRangeYUVFormat(pixelFormat);
  const bool isTenBit = isTenBitYUVFormat(pixelFormat);

  if (matrix != nullptr) {
    if (CFEqual(matrix, kCVImageBufferYCbCrMatrix_ITU_R_2020)) {
      if (isTenBit) {
        return isFullRange ? kBT2020_10bit_Full_SkYUVColorSpace
                           : kBT2020_10bit_Limited_SkYUVColorSpace;
      }
      return isFullRange ? kBT2020_8bit_Full_SkYUVColorSpace
                         : kBT2020_8bit_Limited_SkYUVColorSpace;
    }
    if (CFEqual(matrix, kCVImageBufferYCbCrMatrix_ITU_R_601_4)) {
      return isFullRange ? kJPEG_Full_SkYUVColorSpace
                         : kRec601_Limited_SkYUVColorSpace;
    }
    if (CFEqual(matrix, kCVImageBufferYCbCrMatrix_SMPTE_240M_1995)) {
      return isFullRange ? kSMPTE240_Full_SkYUVColorSpace
                         : kSMPTE240_Limited_SkYUVColorSpace;
    }
    if (CFEqual(matrix, kCVImageBufferYCbCrMatrix_ITU_R_709_2)) {
      return isFullRange ? kRec709_Full_SkYUVColorSpace
                         : kRec709_Limited_SkYUVColorSpace;
    }
  }

  if (pixelFormat == kCVPixelFormatType_422YpCbCr8BiPlanarVideoRange ||
      pixelFormat == kCVPixelFormatType_422YpCbCr8BiPlanarFullRange) {
    return isFullRange ? kJPEG_Full_SkYUVColorSpace
                       : kRec601_Limited_SkYUVColorSpace;
  }

  // Fallback for buffers that don't provide matrix metadata.
  if (isTenBit) {
    return isFullRange ? kBT2020_10bit_Full_SkYUVColorSpace
                       : kBT2020_10bit_Limited_SkYUVColorSpace;
  }
  return isFullRange ? kRec709_Full_SkYUVColorSpace
                     : kRec709_Limited_SkYUVColorSpace;
}

// pragma MARK: CVPixelBuffer -> Skia Texture

TextureHolder *SkiaCVPixelBufferUtils::getSkiaTextureForCVPixelBufferPlane(
    id<MTLDevice> device, CVPixelBufferRef pixelBuffer, size_t planeIndex) {
  // 1. Get cache
  CVMetalTextureCacheRef textureCache = getTextureCache(device);

  // 2. Get MetalTexture from CVPixelBuffer
  const size_t planesCount = CVPixelBufferGetPlaneCount(pixelBuffer);
  if (planesCount == 0 && planeIndex != 0) [[unlikely]] {
    throw std::runtime_error("Pixel buffer is not planar, but plane index " +
                             std::to_string(planeIndex) + " was requested.");
  }
  if (planesCount > 0 && planeIndex >= planesCount) [[unlikely]] {
    throw std::runtime_error(
        "Requested out-of-bounds plane index " + std::to_string(planeIndex) +
        " for pixel buffer with " + std::to_string(planesCount) + " planes.");
  }
  size_t width = planesCount > 0
                     ? CVPixelBufferGetWidthOfPlane(pixelBuffer, planeIndex)
                     : CVPixelBufferGetWidth(pixelBuffer);
  size_t height = planesCount > 0
                      ? CVPixelBufferGetHeightOfPlane(pixelBuffer, planeIndex)
                      : CVPixelBufferGetHeight(pixelBuffer);
  MTLPixelFormat pixelFormat =
      getMTLPixelFormatForCVPixelBufferPlane(pixelBuffer, planeIndex);

  CVMetalTextureRef textureHolder;
  CVReturn result = CVMetalTextureCacheCreateTextureFromImage(
      kCFAllocatorDefault, textureCache, pixelBuffer, nil, pixelFormat, width,
      height, planeIndex, &textureHolder);

  if (result != kCVReturnSuccess) [[unlikely]] {
    throw std::runtime_error(
        "Failed to create Metal Texture from CVPixelBuffer! Result: " +
        std::to_string(result));
  }

  return new TextureHolder(textureHolder);
}

// pragma MARK: getTextureCache()

CVMetalTextureCacheRef
SkiaCVPixelBufferUtils::getTextureCache(id<MTLDevice> device) {
  static CVMetalTextureCacheRef textureCache = nil;
  if (textureCache == nil) {
    // Create a new Texture Cache
    auto result = CVMetalTextureCacheCreate(kCFAllocatorDefault, nil, device,
                                            nil, &textureCache);
    if (result != kCVReturnSuccess || textureCache == nil) {
      throw std::runtime_error("Failed to create Metal Texture Cache!");
    }
  }
  return textureCache;
}

// pragma MARK: Get CVPixelBuffer MTLPixelFormat

MTLPixelFormat SkiaCVPixelBufferUtils::getMTLPixelFormatForCVPixelBufferPlane(
    CVPixelBufferRef pixelBuffer, size_t planeIndex) {
  const OSType format = CVPixelBufferGetPixelFormatType(pixelBuffer);
  auto throwInvalidPlaneIndexForFormat =
      [&](size_t expectedPlanes) -> MTLPixelFormat {
    throw std::runtime_error(
        "Invalid plane index " + std::to_string(planeIndex) +
        " for pixel format " + std::string(FourCC2Str(format)) +
        " (expected 0.." + std::to_string(expectedPlanes - 1) + ").");
  };

  switch (format) {
  case kCVPixelFormatType_32BGRA:
    // 1 plane, 8-bit interleaved BGRA.
    if (planeIndex != 0) {
      return throwInvalidPlaneIndexForFormat(1);
    }
    return MTLPixelFormatBGRA8Unorm;
  case kCVPixelFormatType_32RGBA:
    // 1 plane, 8-bit interleaved RGBA.
    if (planeIndex != 0) {
      return throwInvalidPlaneIndexForFormat(1);
    }
    return MTLPixelFormatRGBA8Unorm;
  case kCVPixelFormatType_64RGBAHalf:
    // 1 plane, 16-bit half-float interleaved RGBA.
    if (planeIndex != 0) {
      return throwInvalidPlaneIndexForFormat(1);
    }
    return MTLPixelFormatRGBA16Float;
  case kCVPixelFormatType_420YpCbCr8Planar:
  case kCVPixelFormatType_420YpCbCr8PlanarFullRange:
    // 3 planes, 8-bit 4:2:0 planar (Y, U, V), each plane is single channel.
    switch (planeIndex) {
    case 0:
    case 1:
    case 2:
      return MTLPixelFormatR8Unorm;
    default:
      return throwInvalidPlaneIndexForFormat(3);
    }
  case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr8BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr8BiPlanarFullRange:
    // 2 planes, 8-bit bi-planar (plane 0 = Y, plane 1 = interleaved CbCr).
    switch (planeIndex) {
    case 0:
      return MTLPixelFormatR8Unorm;
    case 1:
      return MTLPixelFormatRG8Unorm;
    default:
      return throwInvalidPlaneIndexForFormat(2);
    }
  case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_420YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_422YpCbCr10BiPlanarFullRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarVideoRange:
  case kCVPixelFormatType_444YpCbCr10BiPlanarFullRange:
    // 2 planes, 10-bit bi-planar stored in 16-bit lanes (Y + interleaved CbCr).
    switch (planeIndex) {
    case 0:
      return MTLPixelFormatR16Unorm;
    case 1:
      return MTLPixelFormatRG16Unorm;
    default:
      return throwInvalidPlaneIndexForFormat(2);
    }
  default:
    break;
  }

  const size_t planesCount = CVPixelBufferGetPlaneCount(pixelBuffer);
  const size_t width =
      planesCount > 0 ? CVPixelBufferGetWidthOfPlane(pixelBuffer, planeIndex)
                      : CVPixelBufferGetWidth(pixelBuffer);
  const size_t bytesPerRow =
      planesCount > 0
          ? CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, planeIndex)
          : CVPixelBufferGetBytesPerRow(pixelBuffer);
  if (width == 0) [[unlikely]] {
    throw std::runtime_error("Invalid plane width for pixel format " +
                             std::string(FourCC2Str(format)) + "!");
  }
  if (bytesPerRow % width != 0) [[unlikely]] {
    throw std::runtime_error("Invalid bytes per row! Bytes per row must be "
                             "evenly divisible by width "
                             "for pixel format " +
                             std::string(FourCC2Str(format)) + "!");
  }
  const size_t bytesPerPixel = bytesPerRow / width;
  if (bytesPerPixel == 1) {
    return MTLPixelFormatR8Unorm;
  }
  if (bytesPerPixel == 2) {
    return MTLPixelFormatRG8Unorm;
  }
  if (bytesPerPixel == 4) {
    return MTLPixelFormatBGRA8Unorm;
  }

  [[unlikely]] throw std::runtime_error(
      "Invalid bytes per row! Expected 1 (R), 2 (RG) or 4 (RGBA), but "
      "received " +
      std::to_string(bytesPerPixel));
}
