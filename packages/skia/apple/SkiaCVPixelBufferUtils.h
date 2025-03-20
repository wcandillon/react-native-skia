//
//  SkiaCVPixelBufferUtils.h
//  react-native-skia
//
//  Created by Marc Rousavy on 10.04.24.
//

#pragma once

#import <vector>

#import <CoreMedia/CMSampleBuffer.h>
#import <CoreVideo/CVMetalTextureCache.h>
#import <MetalKit/MetalKit.h>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#import "include/core/SkColorSpace.h"
#import "include/core/SkImage.h"
#import "include/gpu/ganesh/GrBackendSurface.h"
#import "include/gpu/ganesh/GrYUVABackendTextures.h"
#pragma clang diagnostic pop

/**
 Holds a Metal Texture.
 When the `TextureHolder` is destroyed, the underlying Metal Texture
 is marked as invalid and might be overwritten by the Texture Cache,
 so make sure to delete the `TextureHolder` only when the `SkImage`
 has been deleted.

 For example, use the `releaseProc` parameter in `BorrowImageFromTexture`
 to delete the `TextureHolder`.
 */
class TextureHolder {
public:
  /**
   Create a new instance of TextureHolder which holds
   the given `CVMetalTextureRef`.

   The given `CVMetalTextureRef` is assumed to already be
   retained with `CFRetain`, and will later be manually
   released with `CFRelease`.
   */
  TextureHolder(CVMetalTextureRef texture);
  ~TextureHolder();

  /**
   Converts this Texture to a Skia GrBackendTexture.
   */
  GrBackendTexture toGrBackendTexture();

private:
  CVMetalTextureRef _texture;
};

/**
 Same as `TextureHolder`, but for multiple planar textures (e.g. YUVA)
 */
class MultiTexturesHolder {
public:
  ~MultiTexturesHolder();
  void addTexture(TextureHolder *texture);

private:
  std::vector<TextureHolder *> _textures;
};

class SkiaCVPixelBufferUtils {
public:
  enum class CVPixelBufferBaseFormat { rgb, yuv };

  /**
   Get the base format (currently only RGB) of the PixelBuffer.
   Depending on the base-format, different methods have to be used to create
   Skia buffers.
   */
  static CVPixelBufferBaseFormat
  getCVPixelBufferBaseFormat(CVPixelBufferRef pixelBuffer);

  class RGB {
  public:
    /**
     Creates a GPU-backed Skia Texture (SkImage) with the given RGB
     CVPixelBuffer.
     */
    static sk_sp<SkImage>
    makeSkImageFromCVPixelBuffer(GrDirectContext *context,
                                 CVPixelBufferRef pixelBuffer);

  private:
    static SkColorType getCVPixelBufferColorType(CVPixelBufferRef pixelBuffer);
  };

  class YUV {
  public:
    /**
     Creates a GPU-backed Skia Texture (SkImage) with the given YUV
     CVPixelBuffer.
     */
    static sk_sp<SkImage>
    makeSkImageFromCVPixelBuffer(GrDirectContext *context,
                                 CVPixelBufferRef pixelBuffer);

  private:
    static SkYUVAInfo::PlaneConfig getPlaneConfig(OSType pixelFormat);
    static SkYUVAInfo::Subsampling getSubsampling(OSType pixelFormat);
    static SkYUVColorSpace getColorspace(OSType pixelFormat);
    static SkYUVAInfo getYUVAInfoForCVPixelBuffer(CVPixelBufferRef pixelBuffer);
  };

private:
  static CVMetalTextureCacheRef getTextureCache();
  static TextureHolder *
  getSkiaTextureForCVPixelBufferPlane(CVPixelBufferRef pixelBuffer,
                                      size_t planeIndex);
  static MTLPixelFormat
  getMTLPixelFormatForCVPixelBufferPlane(CVPixelBufferRef pixelBuffer,
                                         size_t planeIndex);
};
