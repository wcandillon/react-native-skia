#pragma once

#include <string>

#include "dawn/webgpu_cpp.h"

namespace RNSkia {
wgpu::AddressMode getAddressMode(const char *value) {
  if (strcmp(value, "repeat") == 0) {
    return wgpu::AddressMode::Repeat;
  }
  if (strcmp(value, "mirror-repeat") == 0) {
    return wgpu::AddressMode::MirrorRepeat;
  }
  if (strcmp(value, "clamp-to-edge") == 0) {
    return wgpu::AddressMode::ClampToEdge;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum AddressMode");
}

wgpu::BlendFactor getBlendFactor(const char *value) {
  if (strcmp(value, "zero") == 0) {
    return wgpu::BlendFactor::Zero;
  }
  if (strcmp(value, "one") == 0) {
    return wgpu::BlendFactor::One;
  }
  if (strcmp(value, "src") == 0) {
    return wgpu::BlendFactor::Src;
  }
  if (strcmp(value, "one-minus-src") == 0) {
    return wgpu::BlendFactor::OneMinusSrc;
  }
  if (strcmp(value, "src-alpha") == 0) {
    return wgpu::BlendFactor::SrcAlpha;
  }
  if (strcmp(value, "one-minus-src-alpha") == 0) {
    return wgpu::BlendFactor::OneMinusSrcAlpha;
  }
  if (strcmp(value, "dst") == 0) {
    return wgpu::BlendFactor::Dst;
  }
  if (strcmp(value, "one-minus-dst") == 0) {
    return wgpu::BlendFactor::OneMinusDst;
  }
  if (strcmp(value, "dst-alpha") == 0) {
    return wgpu::BlendFactor::DstAlpha;
  }
  if (strcmp(value, "one-minus-dst-alpha") == 0) {
    return wgpu::BlendFactor::OneMinusDstAlpha;
  }
  if (strcmp(value, "src-alpha-saturated") == 0) {
    return wgpu::BlendFactor::SrcAlphaSaturated;
  }
  if (strcmp(value, "constant") == 0) {
    return wgpu::BlendFactor::Constant;
  }
  if (strcmp(value, "one-minus-constant") == 0) {
    return wgpu::BlendFactor::OneMinusConstant;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum BlendFactor");
}

wgpu::BlendOperation getBlendOperation(const char *value) {
  if (strcmp(value, "add") == 0) {
    return wgpu::BlendOperation::Add;
  }
  if (strcmp(value, "subtract") == 0) {
    return wgpu::BlendOperation::Subtract;
  }
  if (strcmp(value, "reverse-subtract") == 0) {
    return wgpu::BlendOperation::ReverseSubtract;
  }
  if (strcmp(value, "min") == 0) {
    return wgpu::BlendOperation::Min;
  }
  if (strcmp(value, "max") == 0) {
    return wgpu::BlendOperation::Max;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum BlendOperation");
}

wgpu::BufferBindingType getBufferBindingType(const char *value) {
  if (strcmp(value, "uniform") == 0) {
    return wgpu::BufferBindingType::Uniform;
  }
  if (strcmp(value, "storage") == 0) {
    return wgpu::BufferBindingType::Storage;
  }
  if (strcmp(value, "read-only-storage") == 0) {
    return wgpu::BufferBindingType::ReadOnlyStorage;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum BufferBindingType");
}

wgpu::AlphaMode getAlphaMode(const char *value) {
  if (strcmp(value, "opaque") == 0) {
    return wgpu::AlphaMode::Opaque;
  }
  if (strcmp(value, "premultiplied") == 0) {
    return wgpu::AlphaMode::Premultiplied;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum AlphaMode");
}

wgpu::CompareFunction getCompareFunction(const char *value) {
  if (strcmp(value, "never") == 0) {
    return wgpu::CompareFunction::Never;
  }
  if (strcmp(value, "less") == 0) {
    return wgpu::CompareFunction::Less;
  }
  if (strcmp(value, "equal") == 0) {
    return wgpu::CompareFunction::Equal;
  }
  if (strcmp(value, "less-equal") == 0) {
    return wgpu::CompareFunction::LessEqual;
  }
  if (strcmp(value, "greater") == 0) {
    return wgpu::CompareFunction::Greater;
  }
  if (strcmp(value, "not-equal") == 0) {
    return wgpu::CompareFunction::NotEqual;
  }
  if (strcmp(value, "greater-equal") == 0) {
    return wgpu::CompareFunction::GreaterEqual;
  }
  if (strcmp(value, "always") == 0) {
    return wgpu::CompareFunction::Always;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum CompareFunction");
}

wgpu::CompilationMessageType getCompilationMessageType(const char *value) {
  if (strcmp(value, "error") == 0) {
    return wgpu::CompilationMessageType::Error;
  }
  if (strcmp(value, "warning") == 0) {
    return wgpu::CompilationMessageType::Warning;
  }
  if (strcmp(value, "info") == 0) {
    return wgpu::CompilationMessageType::Info;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum CompilationMessageType");
}

wgpu::CullMode getCullMode(const char *value) {
  if (strcmp(value, "none") == 0) {
    return wgpu::CullMode::None;
  }
  if (strcmp(value, "front") == 0) {
    return wgpu::CullMode::Front;
  }
  if (strcmp(value, "back") == 0) {
    return wgpu::CullMode::Back;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum CullMode");
}

wgpu::DeviceLostReason getDeviceLostReason(const char *value) {
  if (strcmp(value, "destroyed") == 0) {
    return wgpu::DeviceLostReason::Destroyed;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum DeviceLostReason");
}

wgpu::ErrorFilter getErrorFilter(const char *value) {
  if (strcmp(value, "out-of-memory") == 0) {
    return wgpu::ErrorFilter::OutOfMemory;
  }
  if (strcmp(value, "validation") == 0) {
    return wgpu::ErrorFilter::Validation;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum ErrorFilter");
}

wgpu::FeatureName getFeatureName(const char *value) {
  if (strcmp(value, "depth-clip-control") == 0) {
    return wgpu::FeatureName::DepthClipControl;
  }
  if (strcmp(value, "depth32float-stencil8") == 0) {
    return wgpu::FeatureName::Depth32FloatStencil8;
  }
  if (strcmp(value, "texture-compression-bc") == 0) {
    return wgpu::FeatureName::TextureCompressionBC;
  }
  if (strcmp(value, "texture-compression-etc2") == 0) {
    return wgpu::FeatureName::TextureCompressionETC2;
  }
  if (strcmp(value, "texture-compression-astc") == 0) {
    return wgpu::FeatureName::TextureCompressionASTC;
  }
  if (strcmp(value, "timestamp-query") == 0) {
    return wgpu::FeatureName::TimestampQuery;
  }
  if (strcmp(value, "indirect-first-instance") == 0) {
    return wgpu::FeatureName::IndirectFirstInstance;
  }
  if (strcmp(value, "shader-f16") == 0) {
    return wgpu::FeatureName::ShaderF16;
  }
  if (strcmp(value, "bgra8unorm-storage") == 0) {
    return wgpu::FeatureName::BGRA8UnormStorage;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum FeatureName");
}

wgpu::FilterMode getFilterMode(const char *value) {
  if (strcmp(value, "nearest") == 0) {
    return wgpu::FilterMode::Nearest;
  }
  if (strcmp(value, "linear") == 0) {
    return wgpu::FilterMode::Linear;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum FilterMode");
}

wgpu::FrontFace getFrontFace(const char *value) {
  if (strcmp(value, "ccw") == 0) {
    return wgpu::FrontFace::CCW;
  }
  if (strcmp(value, "cw") == 0) {
    return wgpu::FrontFace::CW;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum FrontFace");
}

wgpu::IndexFormat getIndexFormat(const char *value) {
  if (strcmp(value, "uint16") == 0) {
    return wgpu::IndexFormat::Uint16;
  }
  if (strcmp(value, "uint32") == 0) {
    return wgpu::IndexFormat::Uint32;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum IndexFormat");
}

wgpu::LoadOp getLoadOp(const char *value) {
  if (strcmp(value, "load") == 0) {
    return wgpu::LoadOp::Load;
  }
  if (strcmp(value, "clear") == 0) {
    return wgpu::LoadOp::Clear;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum LoadOp");
}

wgpu::MipmapFilterMode getMipmapFilterMode(const char *value) {
  if (strcmp(value, "nearest") == 0) {
    return wgpu::MipmapFilterMode::Nearest;
  }
  if (strcmp(value, "linear") == 0) {
    return wgpu::MipmapFilterMode::Linear;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum MipmapFilterMode");
}

wgpu::PowerPreference getPowerPreference(const char *value) {
  if (strcmp(value, "low-power") == 0) {
    return wgpu::PowerPreference::LowPower;
  }
  if (strcmp(value, "high-performance") == 0) {
    return wgpu::PowerPreference::HighPerformance;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum PowerPreference");
}

wgpu::PrimitiveTopology getPrimitiveTopology(const char *value) {
  if (strcmp(value, "point-list") == 0) {
    return wgpu::PrimitiveTopology::PointList;
  }
  if (strcmp(value, "line-list") == 0) {
    return wgpu::PrimitiveTopology::LineList;
  }
  if (strcmp(value, "line-strip") == 0) {
    return wgpu::PrimitiveTopology::LineStrip;
  }
  if (strcmp(value, "triangle-list") == 0) {
    return wgpu::PrimitiveTopology::TriangleList;
  }
  if (strcmp(value, "triangle-strip") == 0) {
    return wgpu::PrimitiveTopology::TriangleStrip;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum PrimitiveTopology");
}

wgpu::QueryType getQueryType(const char *value) {
  if (strcmp(value, "occlusion") == 0) {
    return wgpu::QueryType::Occlusion;
  }
  if (strcmp(value, "timestamp") == 0) {
    return wgpu::QueryType::Timestamp;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum QueryType");
}

wgpu::SamplerBindingType getSamplerBindingType(const char *value) {
  if (strcmp(value, "filtering") == 0) {
    return wgpu::SamplerBindingType::Filtering;
  }
  if (strcmp(value, "non-filtering") == 0) {
    return wgpu::SamplerBindingType::NonFiltering;
  }
  if (strcmp(value, "comparison") == 0) {
    return wgpu::SamplerBindingType::Comparison;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum SamplerBindingType");
}

wgpu::StencilOperation getStencilOperation(const char *value) {
  if (strcmp(value, "keep") == 0) {
    return wgpu::StencilOperation::Keep;
  }
  if (strcmp(value, "zero") == 0) {
    return wgpu::StencilOperation::Zero;
  }
  if (strcmp(value, "replace") == 0) {
    return wgpu::StencilOperation::Replace;
  }
  if (strcmp(value, "invert") == 0) {
    return wgpu::StencilOperation::Invert;
  }
  if (strcmp(value, "increment-clamp") == 0) {
    return wgpu::StencilOperation::IncrementClamp;
  }
  if (strcmp(value, "decrement-clamp") == 0) {
    return wgpu::StencilOperation::DecrementClamp;
  }
  if (strcmp(value, "increment-wrap") == 0) {
    return wgpu::StencilOperation::IncrementWrap;
  }
  if (strcmp(value, "decrement-wrap") == 0) {
    return wgpu::StencilOperation::DecrementWrap;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum StencilOperation");
}

wgpu::StorageTextureAccess getStorageTextureAccess(const char *value) {
  if (strcmp(value, "write-only") == 0) {
    return wgpu::StorageTextureAccess::WriteOnly;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum StorageTextureAccess");
}

wgpu::StoreOp getStoreOp(const char *value) {
  if (strcmp(value, "store") == 0) {
    return wgpu::StoreOp::Store;
  }
  if (strcmp(value, "discard") == 0) {
    return wgpu::StoreOp::Discard;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum StoreOp");
}

wgpu::TextureAspect getTextureAspect(const char *value) {
  if (strcmp(value, "all") == 0) {
    return wgpu::TextureAspect::All;
  }
  if (strcmp(value, "stencil-only") == 0) {
    return wgpu::TextureAspect::StencilOnly;
  }
  if (strcmp(value, "depth-only") == 0) {
    return wgpu::TextureAspect::DepthOnly;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum TextureAspect");
}

wgpu::TextureDimension getTextureDimension(const char *value) {
  if (strcmp(value, "1d") == 0) {
    return wgpu::TextureDimension::e1D;
  }
  if (strcmp(value, "2d") == 0) {
    return wgpu::TextureDimension::e2D;
  }
  if (strcmp(value, "3d") == 0) {
    return wgpu::TextureDimension::e3D;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum TextureDimension");
}

wgpu::TextureFormat getTextureFormat(const char *value) {
  if (strcmp(value, "r8unorm") == 0) {
    return wgpu::TextureFormat::R8Unorm;
  }
  if (strcmp(value, "r8snorm") == 0) {
    return wgpu::TextureFormat::R8Snorm;
  }
  if (strcmp(value, "r8uint") == 0) {
    return wgpu::TextureFormat::R8Uint;
  }
  if (strcmp(value, "r8sint") == 0) {
    return wgpu::TextureFormat::R8Sint;
  }
  if (strcmp(value, "r16uint") == 0) {
    return wgpu::TextureFormat::R16Uint;
  }
  if (strcmp(value, "r16sint") == 0) {
    return wgpu::TextureFormat::R16Sint;
  }
  if (strcmp(value, "r16float") == 0) {
    return wgpu::TextureFormat::R16Float;
  }
  if (strcmp(value, "rg8unorm") == 0) {
    return wgpu::TextureFormat::RG8Unorm;
  }
  if (strcmp(value, "rg8snorm") == 0) {
    return wgpu::TextureFormat::RG8Snorm;
  }
  if (strcmp(value, "rg8uint") == 0) {
    return wgpu::TextureFormat::RG8Uint;
  }
  if (strcmp(value, "rg8sint") == 0) {
    return wgpu::TextureFormat::RG8Sint;
  }
  if (strcmp(value, "r32uint") == 0) {
    return wgpu::TextureFormat::R32Uint;
  }
  if (strcmp(value, "r32sint") == 0) {
    return wgpu::TextureFormat::R32Sint;
  }
  if (strcmp(value, "r32float") == 0) {
    return wgpu::TextureFormat::R32Float;
  }
  if (strcmp(value, "rg16uint") == 0) {
    return wgpu::TextureFormat::RG16Uint;
  }
  if (strcmp(value, "rg16sint") == 0) {
    return wgpu::TextureFormat::RG16Sint;
  }
  if (strcmp(value, "rg16float") == 0) {
    return wgpu::TextureFormat::RG16Float;
  }
  if (strcmp(value, "rgba8unorm") == 0) {
    return wgpu::TextureFormat::RGBA8Unorm;
  }
  if (strcmp(value, "rgba8unorm-srgb") == 0) {
    return wgpu::TextureFormat::RGBA8UnormSrgb;
  }
  if (strcmp(value, "rgba8snorm") == 0) {
    return wgpu::TextureFormat::RGBA8Snorm;
  }
  if (strcmp(value, "rgba8uint") == 0) {
    return wgpu::TextureFormat::RGBA8Uint;
  }
  if (strcmp(value, "rgba8sint") == 0) {
    return wgpu::TextureFormat::RGBA8Sint;
  }
  if (strcmp(value, "bgra8unorm") == 0) {
    return wgpu::TextureFormat::BGRA8Unorm;
  }
  if (strcmp(value, "bgra8unorm-srgb") == 0) {
    return wgpu::TextureFormat::BGRA8UnormSrgb;
  }
  if (strcmp(value, "rgb9e5ufloat") == 0) {
    return wgpu::TextureFormat::RGB9E5Ufloat;
  }
  if (strcmp(value, "rgb10a2unorm") == 0) {
    return wgpu::TextureFormat::RGB10A2Unorm;
  }
  if (strcmp(value, "rg11b10ufloat") == 0) {
    return wgpu::TextureFormat::RG11B10Ufloat;
  }
  if (strcmp(value, "rg32uint") == 0) {
    return wgpu::TextureFormat::RG32Uint;
  }
  if (strcmp(value, "rg32sint") == 0) {
    return wgpu::TextureFormat::RG32Sint;
  }
  if (strcmp(value, "rg32float") == 0) {
    return wgpu::TextureFormat::RG32Float;
  }
  if (strcmp(value, "rgba16uint") == 0) {
    return wgpu::TextureFormat::RGBA16Uint;
  }
  if (strcmp(value, "rgba16sint") == 0) {
    return wgpu::TextureFormat::RGBA16Sint;
  }
  if (strcmp(value, "rgba16float") == 0) {
    return wgpu::TextureFormat::RGBA16Float;
  }
  if (strcmp(value, "rgba32uint") == 0) {
    return wgpu::TextureFormat::RGBA32Uint;
  }
  if (strcmp(value, "rgba32sint") == 0) {
    return wgpu::TextureFormat::RGBA32Sint;
  }
  if (strcmp(value, "rgba32float") == 0) {
    return wgpu::TextureFormat::RGBA32Float;
  }
  if (strcmp(value, "stencil8") == 0) {
    return wgpu::TextureFormat::Stencil8;
  }
  if (strcmp(value, "depth16unorm") == 0) {
    return wgpu::TextureFormat::Depth16Unorm;
  }
  if (strcmp(value, "depth24plus") == 0) {
    return wgpu::TextureFormat::Depth24Plus;
  }
  if (strcmp(value, "depth24plus-stencil8") == 0) {
    return wgpu::TextureFormat::Depth24PlusStencil8;
  }
  if (strcmp(value, "depth32float") == 0) {
    return wgpu::TextureFormat::Depth32Float;
  }
  if (strcmp(value, "depth32float-stencil8") == 0) {
    return wgpu::TextureFormat::Depth32FloatStencil8;
  }
  if (strcmp(value, "bc1-rgba-unorm") == 0) {
    return wgpu::TextureFormat::BC1RGBAUnorm;
  }
  if (strcmp(value, "bc1-rgba-unorm-srgb") == 0) {
    return wgpu::TextureFormat::BC1RGBAUnormSrgb;
  }
  if (strcmp(value, "bc2-rgba-unorm") == 0) {
    return wgpu::TextureFormat::BC2RGBAUnorm;
  }
  if (strcmp(value, "bc2-rgba-unorm-srgb") == 0) {
    return wgpu::TextureFormat::BC2RGBAUnormSrgb;
  }
  if (strcmp(value, "bc3-rgba-unorm") == 0) {
    return wgpu::TextureFormat::BC3RGBAUnorm;
  }
  if (strcmp(value, "bc3-rgba-unorm-srgb") == 0) {
    return wgpu::TextureFormat::BC3RGBAUnormSrgb;
  }
  if (strcmp(value, "bc4-r-unorm") == 0) {
    return wgpu::TextureFormat::BC4RUnorm;
  }
  if (strcmp(value, "bc4-r-snorm") == 0) {
    return wgpu::TextureFormat::BC4RSnorm;
  }
  if (strcmp(value, "bc5-rg-unorm") == 0) {
    return wgpu::TextureFormat::BC5RGUnorm;
  }
  if (strcmp(value, "bc5-rg-snorm") == 0) {
    return wgpu::TextureFormat::BC5RGSnorm;
  }
  if (strcmp(value, "bc6h-rgb-ufloat") == 0) {
    return wgpu::TextureFormat::BC6HRGBUfloat;
  }
  if (strcmp(value, "bc6h-rgb-float") == 0) {
    return wgpu::TextureFormat::BC6HRGBFloat;
  }
  if (strcmp(value, "bc7-rgba-unorm") == 0) {
    return wgpu::TextureFormat::BC7RGBAUnorm;
  }
  if (strcmp(value, "bc7-rgba-unorm-srgb") == 0) {
    return wgpu::TextureFormat::BC7RGBAUnormSrgb;
  }
  if (strcmp(value, "etc2-rgb8unorm") == 0) {
    return wgpu::TextureFormat::ETC2RGB8Unorm;
  }
  if (strcmp(value, "etc2-rgb8unorm-srgb") == 0) {
    return wgpu::TextureFormat::ETC2RGB8UnormSrgb;
  }
  if (strcmp(value, "etc2-rgb8a1unorm") == 0) {
    return wgpu::TextureFormat::ETC2RGB8A1Unorm;
  }
  if (strcmp(value, "etc2-rgb8a1unorm-srgb") == 0) {
    return wgpu::TextureFormat::ETC2RGB8A1UnormSrgb;
  }
  if (strcmp(value, "etc2-rgba8unorm") == 0) {
    return wgpu::TextureFormat::ETC2RGBA8Unorm;
  }
  if (strcmp(value, "etc2-rgba8unorm-srgb") == 0) {
    return wgpu::TextureFormat::ETC2RGBA8UnormSrgb;
  }
  if (strcmp(value, "eac-r11unorm") == 0) {
    return wgpu::TextureFormat::EACR11Unorm;
  }
  if (strcmp(value, "eac-r11snorm") == 0) {
    return wgpu::TextureFormat::EACR11Snorm;
  }
  if (strcmp(value, "eac-rg11unorm") == 0) {
    return wgpu::TextureFormat::EACRG11Unorm;
  }
  if (strcmp(value, "eac-rg11snorm") == 0) {
    return wgpu::TextureFormat::EACRG11Snorm;
  }
  if (strcmp(value, "astc-4x4-unorm") == 0) {
    return wgpu::TextureFormat::ASTC4x4Unorm;
  }
  if (strcmp(value, "astc-4x4-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC4x4UnormSrgb;
  }
  if (strcmp(value, "astc-5x4-unorm") == 0) {
    return wgpu::TextureFormat::ASTC5x4Unorm;
  }
  if (strcmp(value, "astc-5x4-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC5x4UnormSrgb;
  }
  if (strcmp(value, "astc-5x5-unorm") == 0) {
    return wgpu::TextureFormat::ASTC5x5Unorm;
  }
  if (strcmp(value, "astc-5x5-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC5x5UnormSrgb;
  }
  if (strcmp(value, "astc-6x5-unorm") == 0) {
    return wgpu::TextureFormat::ASTC6x5Unorm;
  }
  if (strcmp(value, "astc-6x5-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC6x5UnormSrgb;
  }
  if (strcmp(value, "astc-6x6-unorm") == 0) {
    return wgpu::TextureFormat::ASTC6x6Unorm;
  }
  if (strcmp(value, "astc-6x6-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC6x6UnormSrgb;
  }
  if (strcmp(value, "astc-8x5-unorm") == 0) {
    return wgpu::TextureFormat::ASTC8x5Unorm;
  }
  if (strcmp(value, "astc-8x5-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC8x5UnormSrgb;
  }
  if (strcmp(value, "astc-8x6-unorm") == 0) {
    return wgpu::TextureFormat::ASTC8x6Unorm;
  }
  if (strcmp(value, "astc-8x6-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC8x6UnormSrgb;
  }
  if (strcmp(value, "astc-8x8-unorm") == 0) {
    return wgpu::TextureFormat::ASTC8x8Unorm;
  }
  if (strcmp(value, "astc-8x8-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC8x8UnormSrgb;
  }
  if (strcmp(value, "astc-10x5-unorm") == 0) {
    return wgpu::TextureFormat::ASTC10x5Unorm;
  }
  if (strcmp(value, "astc-10x5-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC10x5UnormSrgb;
  }
  if (strcmp(value, "astc-10x6-unorm") == 0) {
    return wgpu::TextureFormat::ASTC10x6Unorm;
  }
  if (strcmp(value, "astc-10x6-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC10x6UnormSrgb;
  }
  if (strcmp(value, "astc-10x8-unorm") == 0) {
    return wgpu::TextureFormat::ASTC10x8Unorm;
  }
  if (strcmp(value, "astc-10x8-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC10x8UnormSrgb;
  }
  if (strcmp(value, "astc-10x10-unorm") == 0) {
    return wgpu::TextureFormat::ASTC10x10Unorm;
  }
  if (strcmp(value, "astc-10x10-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC10x10UnormSrgb;
  }
  if (strcmp(value, "astc-12x10-unorm") == 0) {
    return wgpu::TextureFormat::ASTC12x10Unorm;
  }
  if (strcmp(value, "astc-12x10-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC12x10UnormSrgb;
  }
  if (strcmp(value, "astc-12x12-unorm") == 0) {
    return wgpu::TextureFormat::ASTC12x12Unorm;
  }
  if (strcmp(value, "astc-12x12-unorm-srgb") == 0) {
    return wgpu::TextureFormat::ASTC12x12UnormSrgb;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum TextureFormat");
}

wgpu::TextureSampleType getTextureSampleType(const char *value) {
  if (strcmp(value, "float") == 0) {
    return wgpu::TextureSampleType::Float;
  }
  if (strcmp(value, "unfilterable-float") == 0) {
    return wgpu::TextureSampleType::UnfilterableFloat;
  }
  if (strcmp(value, "depth") == 0) {
    return wgpu::TextureSampleType::Depth;
  }
  if (strcmp(value, "sint") == 0) {
    return wgpu::TextureSampleType::Sint;
  }
  if (strcmp(value, "uint") == 0) {
    return wgpu::TextureSampleType::Uint;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum TextureSampleType");
}

wgpu::TextureViewDimension getTextureViewDimension(const char *value) {
  if (strcmp(value, "1d") == 0) {
    return wgpu::TextureViewDimension::e1D;
  }
  if (strcmp(value, "2d") == 0) {
    return wgpu::TextureViewDimension::e2D;
  }
  if (strcmp(value, "2d-array") == 0) {
    return wgpu::TextureViewDimension::e2DArray;
  }
  if (strcmp(value, "cube") == 0) {
    return wgpu::TextureViewDimension::Cube;
  }
  if (strcmp(value, "cube-array") == 0) {
    return wgpu::TextureViewDimension::CubeArray;
  }
  if (strcmp(value, "3d") == 0) {
    return wgpu::TextureViewDimension::e3D;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum TextureViewDimension");
}

wgpu::VertexFormat getVertexFormat(const char *value) {
  if (strcmp(value, "uint8x2") == 0) {
    return wgpu::VertexFormat::Uint8x2;
  }
  if (strcmp(value, "uint8x4") == 0) {
    return wgpu::VertexFormat::Uint8x4;
  }
  if (strcmp(value, "sint8x2") == 0) {
    return wgpu::VertexFormat::Sint8x2;
  }
  if (strcmp(value, "sint8x4") == 0) {
    return wgpu::VertexFormat::Sint8x4;
  }
  if (strcmp(value, "unorm8x2") == 0) {
    return wgpu::VertexFormat::Unorm8x2;
  }
  if (strcmp(value, "unorm8x4") == 0) {
    return wgpu::VertexFormat::Unorm8x4;
  }
  if (strcmp(value, "snorm8x2") == 0) {
    return wgpu::VertexFormat::Snorm8x2;
  }
  if (strcmp(value, "snorm8x4") == 0) {
    return wgpu::VertexFormat::Snorm8x4;
  }
  if (strcmp(value, "uint16x2") == 0) {
    return wgpu::VertexFormat::Uint16x2;
  }
  if (strcmp(value, "uint16x4") == 0) {
    return wgpu::VertexFormat::Uint16x4;
  }
  if (strcmp(value, "sint16x2") == 0) {
    return wgpu::VertexFormat::Sint16x2;
  }
  if (strcmp(value, "sint16x4") == 0) {
    return wgpu::VertexFormat::Sint16x4;
  }
  if (strcmp(value, "unorm16x2") == 0) {
    return wgpu::VertexFormat::Unorm16x2;
  }
  if (strcmp(value, "unorm16x4") == 0) {
    return wgpu::VertexFormat::Unorm16x4;
  }
  if (strcmp(value, "snorm16x2") == 0) {
    return wgpu::VertexFormat::Snorm16x2;
  }
  if (strcmp(value, "snorm16x4") == 0) {
    return wgpu::VertexFormat::Snorm16x4;
  }
  if (strcmp(value, "float16x2") == 0) {
    return wgpu::VertexFormat::Float16x2;
  }
  if (strcmp(value, "float16x4") == 0) {
    return wgpu::VertexFormat::Float16x4;
  }
  if (strcmp(value, "float32") == 0) {
    return wgpu::VertexFormat::Float32;
  }
  if (strcmp(value, "float32x2") == 0) {
    return wgpu::VertexFormat::Float32x2;
  }
  if (strcmp(value, "float32x3") == 0) {
    return wgpu::VertexFormat::Float32x3;
  }
  if (strcmp(value, "float32x4") == 0) {
    return wgpu::VertexFormat::Float32x4;
  }
  if (strcmp(value, "uint32") == 0) {
    return wgpu::VertexFormat::Uint32;
  }
  if (strcmp(value, "uint32x2") == 0) {
    return wgpu::VertexFormat::Uint32x2;
  }
  if (strcmp(value, "uint32x3") == 0) {
    return wgpu::VertexFormat::Uint32x3;
  }
  if (strcmp(value, "uint32x4") == 0) {
    return wgpu::VertexFormat::Uint32x4;
  }
  if (strcmp(value, "sint32") == 0) {
    return wgpu::VertexFormat::Sint32;
  }
  if (strcmp(value, "sint32x2") == 0) {
    return wgpu::VertexFormat::Sint32x2;
  }
  if (strcmp(value, "sint32x3") == 0) {
    return wgpu::VertexFormat::Sint32x3;
  }
  if (strcmp(value, "sint32x4") == 0) {
    return wgpu::VertexFormat::Sint32x4;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum VertexFormat");
}

wgpu::VertexStepMode getVertexStepMode(const char *value) {
  if (strcmp(value, "vertex") == 0) {
    return wgpu::VertexStepMode::Vertex;
  }
  if (strcmp(value, "instance") == 0) {
    return wgpu::VertexStepMode::Instance;
  }
  throw std::invalid_argument("Invalid value " + std::string(value) +
                              " for enum VertexStepMode");
}

} // namespace RNSkia
