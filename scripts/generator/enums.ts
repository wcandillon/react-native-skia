import _ from "lodash";

export type Enum = { value: number, name: string }[];

export const isEnum = (type: string) => enums[type] !== undefined;

const convertString = (input: string) => {
  const map: Record<string, string> = {
    "1d": "e1D",
    "2d": "e2D",
    "3d": "e3D", 
    "2d-array": "e2DArray",
  }
  if (map[input] !== undefined) {
    return map[input];
  }
  // Convert kebab-case to CamelCase
  let result = _.camelCase(input);

  // Define special abbreviation and color formats to be fully capitalized
  const specialAbbreviations = ['cpu', 'gpu', "ccw", "cw"];
  const colorFormats = ['astc', 'eac', 'etc2', 'rgba', "bc", "bgra", "rg"];

  // Split the string to handle individual words for special cases
  let parts = result.split(/(?=[A-Z])/);

  // Process each part for special cases
  parts = parts.map(part => {
      let lowerPart = part.toLowerCase();
      if (specialAbbreviations.some(format => lowerPart.includes(format))) {
          return lowerPart.toUpperCase();
      } else if (colorFormats.some(format => lowerPart.startsWith(format))) {
          return lowerPart.toUpperCase();
      }
      return part;
  });

  // Join all parts and capitalize the first character
  result = parts.join('').replace(/(\d)X(\d)/g, '$1x$2');
  result= result.charAt(0).toUpperCase() + result.slice(1);
  // Handle edge case: Strings starting with a number
  return result;
}


export const generateEnums = (enums: Record<string, Enum>) => {
  return `#pragma once
  
#include <string>

#include "dawn/webgpu_cpp.h"

namespace RNSkia {
  ${Object.keys(enums).map(name => {
    return `wgpu::${name} get${name}(const char* value) {
      ${enums[name].map(e => {
        const m = convertString(e.name);
        return `if (strcmp(value, "${e.name}") == 0) { return wgpu::${name}::${m}; }`;
      }).join("\n      ")}
      throw std::invalid_argument("Invalid value " + std::string(value) + " for enum ${name}");
    }
`;
  }).join(`
`)}
}
`;
};

export const enums: Record<string, Enum> = {  
  "AddressMode": [
    {"value": 0, "name": "repeat"},
    {"value": 1, "name": "mirror-repeat"},
    {"value": 2, "name": "clamp-to-edge"}
  ],
  "BlendFactor": [
    {"value": 0, "name": "zero"},
    {"value": 1, "name": "one"},
    {"value": 2, "name": "src"},
    {"value": 3, "name": "one-minus-src"},
    {"value": 4, "name": "src-alpha"},
    {"value": 5, "name": "one-minus-src-alpha"},
    {"value": 6, "name": "dst"},
    {"value": 7, "name": "one-minus-dst"},
    {"value": 8, "name": "dst-alpha"},
    {"value": 9, "name": "one-minus-dst-alpha"},
    {"value": 10, "name": "src-alpha-saturated"},
    {"value": 11, "name": "constant"},
    {"value": 12, "name": "one-minus-constant"}
  ],
  "BlendOperation": [
    {"value": 0, "name": "add"},
    {"value": 1, "name": "subtract"},
    {"value": 2, "name": "reverse-subtract"},
    {"value": 3, "name": "min"},
    {"value": 4, "name": "max"}
  ],
  "BufferBindingType": [
    {"value": 0, "name": "uniform"},
    {"value": 1, "name": "storage"},
    {"value": 2, "name": "read-only-storage"}
  ],
  "AlphaMode": [
    {"value": 0, "name": "opaque"},
    {"value": 1, "name": "premultiplied"}
  ],
  // "CanvasCompositingAlphaMode": [
  //   {"value": 0, "name": "opaque"},
  //   {"value": 1, "name": "premultiplied"}
  // ],
  "CompareFunction": [
    {"value": 0, "name": "never"},
    {"value": 1, "name": "less"},
    {"value": 2, "name": "equal"},
    {"value": 3, "name": "less-equal"},
    {"value": 4, "name": "greater"},
    {"value": 5, "name": "not-equal"},
    {"value": 6, "name": "greater-equal"},
    {"value": 7, "name": "always"}
  ],
  "CompilationMessageType": [
    {"value": 0, "name": "error"},
    {"value": 1, "name": "warning"},
    {"value": 2, "name": "info"}
  ],
  // "ComputePassTimestampLocation": [
  //   {"value": 0, "name": "beginning"},
  //   {"value": 1, "name": "end"}
  // ],
  "CullMode": [
    {"value": 0, "name": "none"},
    {"value": 1, "name": "front"},
    {"value": 2, "name": "back"}
  ],
  "DeviceLostReason": [
    {"value": 0, "name": "destroyed"}
  ],
  "ErrorFilter": [
    {"value": 0, "name": "out-of-memory"},
    {"value": 1, "name": "validation"}
  ],
  "FeatureName": [
    {"value": 0, "name": "depth-clip-control"},
    {"value": 1, "name": "depth32float-stencil8"},
    {"value": 2, "name": "texture-compression-bc"},
    {"value": 3, "name": "texture-compression-etc2"},
    {"value": 4, "name": "texture-compression-astc"},
    {"value": 5, "name": "timestamp-query"},
    {"value": 6, "name": "indirect-first-instance"},
    {"value": 7, "name": "shader-f16"},
    {"value": 8, "name": "bgra8unorm-storage"}
  ],
  "FilterMode": [
    {"value": 0, "name": "nearest"},
    {"value": 1, "name": "linear"}
  ],
  "FrontFace": [
    {"value": 0, "name": "ccw"},
    {"value": 1, "name": "cw"}
  ],
  "IndexFormat": [
    {"value": 0, "name": "uint16"},
    {"value": 1, "name": "uint32"}
  ],
  "LoadOp": [
    {"value": 0, "name": "load"},
    {"value": 1, "name": "clear"}
  ],
  "MipmapFilterMode": [
    {"value": 0, "name": "nearest"},
    {"value": 1, "name": "linear"}
  ],
  "PowerPreference": [
    {"value": 0, "name": "low-power"},
    {"value": 1, "name": "high-performance"}
  ],
  "PrimitiveTopology": [
    {"value": 0, "name": "point-list"},
    {"value": 1, "name": "line-list"},
    {"value": 2, "name": "line-strip"},
    {"value": 3, "name": "triangle-list"},
    {"value": 4, "name": "triangle-strip"}
  ],
  "QueryType": [
    {"value": 0, "name": "occlusion"},
    {"value": 1, "name": "timestamp"}
  ],
  // "RenderPassTimestampLocation": [
  //   {"value": 0, "name": "beginning"},
  //   {"value": 1, "name": "end"}
  // ],
  "SamplerBindingType": [
    {"value": 0, "name": "filtering"},
    {"value": 1, "name": "non-filtering"},
    {"value": 2, "name": "comparison"}
  ],
  "StencilOperation": [
    {"value": 0, "name": "keep"},
    {"value": 1, "name": "zero"},
    {"value": 2, "name": "replace"},
    {"value": 3, "name": "invert"},
    {"value": 4, "name": "increment-clamp"},
    {"value": 5, "name": "decrement-clamp"},
    {"value": 6, "name": "increment-wrap"},
    {"value": 7, "name": "decrement-wrap"}
  ],
  "StorageTextureAccess": [
    {"value": 0, "name": "write-only"}
  ],
  "StoreOp": [
    {"value": 0, "name": "store"},
    {"value": 1, "name": "discard"}
  ],
  "TextureAspect": [
    {"value": 0, "name": "all"},
    {"value": 1, "name": "stencil-only"},
    {"value": 2, "name": "depth-only"}
  ],
  "TextureDimension": [
    {"value": 0, "name": "1d"},
    {"value": 1, "name": "2d"},
    {"value": 2, "name": "3d"}
  ],
  "TextureFormat": [
    {"value": 0, "name": "r8unorm"},
    {"value": 1, "name": "r8snorm"},
    {"value": 2, "name": "r8uint"},
    {"value": 3, "name": "r8sint"},
    {"value": 4, "name": "r16uint"},
    {"value": 5, "name": "r16sint"},
    {"value": 6, "name": "r16float"},
    {"value": 7, "name": "rg8unorm"},
    {"value": 8, "name": "rg8snorm"},
    {"value": 9, "name": "rg8uint"},
    {"value": 10, "name": "rg8sint"},
    {"value": 11, "name": "r32uint"},
    {"value": 12, "name": "r32sint"},
    {"value": 13, "name": "r32float"},
    {"value": 14, "name": "rg16uint"},
    {"value": 15, "name": "rg16sint"},
    {"value": 16, "name": "rg16float"},
    {"value": 17, "name": "rgba8unorm"},
    {"value": 18, "name": "rgba8unorm-srgb"},
    {"value": 19, "name": "rgba8snorm"},
    {"value": 20, "name": "rgba8uint"},
    {"value": 21, "name": "rgba8sint"},
    {"value": 22, "name": "bgra8unorm"},
    {"value": 23, "name": "bgra8unorm-srgb"},
    {"value": 24, "name": "rgb9e5ufloat"},
    {"value": 25, "name": "rgb10a2unorm"},
    {"value": 26, "name": "rg11b10ufloat"},
    {"value": 27, "name": "rg32uint"},
    {"value": 28, "name": "rg32sint"},
    {"value": 29, "name": "rg32float"},
    {"value": 30, "name": "rgba16uint"},
    {"value": 31, "name": "rgba16sint"},
    {"value": 32, "name": "rgba16float"},
    {"value": 33, "name": "rgba32uint"},
    {"value": 34, "name": "rgba32sint"},
    {"value": 35, "name": "rgba32float"},
    {"value": 36, "name": "stencil8"},
    {"value": 37, "name": "depth16unorm"},
    {"value": 38, "name": "depth24plus"},
    {"value": 39, "name": "depth24plus-stencil8"},
    {"value": 40, "name": "depth32float"},
    {"value": 41, "name": "depth32float-stencil8"},
    {"value": 42, "name": "bc1-rgba-unorm"},
    {"value": 43, "name": "bc1-rgba-unorm-srgb"},
    {"value": 44, "name": "bc2-rgba-unorm"},
    {"value": 45, "name": "bc2-rgba-unorm-srgb"},
    {"value": 46, "name": "bc3-rgba-unorm"},
    {"value": 47, "name": "bc3-rgba-unorm-srgb"},
    {"value": 48, "name": "bc4-r-unorm"},
    {"value": 49, "name": "bc4-r-snorm"},
    {"value": 50, "name": "bc5-rg-unorm"},
    {"value": 51, "name": "bc5-rg-snorm"},
    {"value": 52, "name": "bc6h-rgb-ufloat"},
    {"value": 53, "name": "bc6h-rgb-float"},
    {"value": 54, "name": "bc7-rgba-unorm"},
    {"value": 55, "name": "bc7-rgba-unorm-srgb"},
    {"value": 56, "name": "etc2-rgb8unorm"},
    {"value": 57, "name": "etc2-rgb8unorm-srgb"},
    {"value": 58, "name": "etc2-rgb8a1unorm"},
    {"value": 59, "name": "etc2-rgb8a1unorm-srgb"},
    {"value": 60, "name": "etc2-rgba8unorm"},
    {"value": 61, "name": "etc2-rgba8unorm-srgb"},
    {"value": 62, "name": "eac-r11unorm"},
    {"value": 63, "name": "eac-r11snorm"},
    {"value": 64, "name": "eac-rg11unorm"},
    {"value": 65, "name": "eac-rg11snorm"},
    {"value": 66, "name": "astc-4x4-unorm"},
    {"value": 67, "name": "astc-4x4-unorm-srgb"},
    {"value": 68, "name": "astc-5x4-unorm"},
    {"value": 69, "name": "astc-5x4-unorm-srgb"},
    {"value": 70, "name": "astc-5x5-unorm"},
    {"value": 71, "name": "astc-5x5-unorm-srgb"},
    {"value": 72, "name": "astc-6x5-unorm"},
    {"value": 73, "name": "astc-6x5-unorm-srgb"},
    {"value": 74, "name": "astc-6x6-unorm"},
    {"value": 75, "name": "astc-6x6-unorm-srgb"},
    {"value": 76, "name": "astc-8x5-unorm"},
    {"value": 77, "name": "astc-8x5-unorm-srgb"},
    {"value": 78, "name": "astc-8x6-unorm"},
    {"value": 79, "name": "astc-8x6-unorm-srgb"},
    {"value": 80, "name": "astc-8x8-unorm"},
    {"value": 81, "name": "astc-8x8-unorm-srgb"},
    {"value": 82, "name": "astc-10x5-unorm"},
    {"value": 83, "name": "astc-10x5-unorm-srgb"},
    {"value": 84, "name": "astc-10x6-unorm"},
    {"value": 85, "name": "astc-10x6-unorm-srgb"},
    {"value": 86, "name": "astc-10x8-unorm"},
    {"value": 87, "name": "astc-10x8-unorm-srgb"},
    {"value": 88, "name": "astc-10x10-unorm"},
    {"value": 89, "name": "astc-10x10-unorm-srgb"},
    {"value": 90, "name": "astc-12x10-unorm"},
    {"value": 91, "name": "astc-12x10-unorm-srgb"},
    {"value": 92, "name": "astc-12x12-unorm"},
    {"value": 93, "name": "astc-12x12-unorm-srgb"}
  ],
  "TextureSampleType": [
    {"value": 0, "name": "float"},
    {"value": 1, "name": "unfilterable-float"},
    {"value": 2, "name": "depth"},
    {"value": 3, "name": "sint"},
    {"value": 4, "name": "uint"}
  ],
  "TextureViewDimension": [
    {"value": 0, "name": "1d"},
    {"value": 1, "name": "2d"},
    {"value": 2, "name": "2d-array"},
    {"value": 3, "name": "cube"},
    {"value": 4, "name": "cube-array"},
    {"value": 5, "name": "3d"}
  ],
  "VertexFormat": [
    {"value": 0, "name": "uint8x2"},
    {"value": 1, "name": "uint8x4"},
    {"value": 2, "name": "sint8x2"},
    {"value": 3, "name": "sint8x4"},
    {"value": 4, "name": "unorm8x2"},
    {"value": 5, "name": "unorm8x4"},
    {"value": 6, "name": "snorm8x2"},
    {"value": 7, "name": "snorm8x4"},
    {"value": 8, "name": "uint16x2"},
    {"value": 9, "name": "uint16x4"},
    {"value": 10, "name": "sint16x2"},
    {"value": 11, "name": "sint16x4"},
    {"value": 12, "name": "unorm16x2"},
    {"value": 13, "name": "unorm16x4"},
    {"value": 14, "name": "snorm16x2"},
    {"value": 15, "name": "snorm16x4"},
    {"value": 16, "name": "float16x2"},
    {"value": 17, "name": "float16x4"},
    {"value": 18, "name": "float32"},
    {"value": 19, "name": "float32x2"},
    {"value": 20, "name": "float32x3"},
    {"value": 21, "name": "float32x4"},
    {"value": 22, "name": "uint32"},
    {"value": 23, "name": "uint32x2"},
    {"value": 24, "name": "uint32x3"},
    {"value": 25, "name": "uint32x4"},
    {"value": 26, "name": "sint32"},
    {"value": 27, "name": "sint32x2"},
    {"value": 28, "name": "sint32x3"},
    {"value": 29, "name": "sint32x4"}
  ],
  "VertexStepMode": [
    {"value": 0, "name": "vertex"},
    {"value": 1, "name": "instance"}
  ]
};
