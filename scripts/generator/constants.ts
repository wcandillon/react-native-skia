import _ from "lodash";

const aliases: Record<string, string> = { ColorWrite: "ColorWriteMask" };

const mapKey = (name: string) => {
  const result = name.substring(3);
  return aliases[result] ?? result;
}

const constants: Record<string, Record<string, number>> = {
  GPUBufferUsage: {
    MAP_READ: 1,
    MAP_WRITE: 2,
    COPY_SRC: 4,
    COPY_DST: 8,
    INDEX: 16,
    VERTEX: 32,
    UNIFORM: 64,
    STORAGE: 128,
    INDIRECT: 256,
    QUERY_RESOLVE: 512,
  },
  GPUColorWrite: {
    RED: 1,
    GREEN: 2,
    BLUE: 4,
    ALPHA: 8,
    ALL: 15,
  },
  GPUMapMode: {
    READ: 1,
    WRITE: 2,
  },
  GPUShaderStage: {
    VERTEX: 1,
    FRAGMENT: 2,
    COMPUTE: 4,
  },
  GPUTextureUsage: {
    COPY_SRC: 1,
    COPY_DST: 2,
    TEXTURE_BINDING: 4,
    STORAGE_BINDING: 8,
    RENDER_ATTACHMENT: 16,
  },
}

export const generateConstants = () => {
  return `#pragma once
  
  #include <string>
  
  #include "dawn/webgpu_cpp.h"
  
namespace RNSkia {

void installConstants (jsi::Runtime &runtime) {
  ${Object.keys(constants).map((key) => {
    return `
jsi::Object ${key}(runtime);
${Object.keys(constants[key]).map((constant) => `${key}.setProperty(runtime, "${constant}", jsi::Value(${constants[key][constant]}));`).join('\n')}
runtime.global().setProperty(runtime, "${key}", ${key});`;
  }).join('\n')}
}

}`;
};