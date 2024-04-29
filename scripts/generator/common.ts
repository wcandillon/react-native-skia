import _ from "lodash";
import { JSIObject } from "./model";
import { isEnum } from "./enums";

export const objectName = (name: string) => _.upperFirst(_.camelCase(name)).replace(/Wgsl/g, 'WGSL');

export const isNumberType = (type: string) => type === "uint64_t" || type === "uint32_t" || type === "float" || type === "int32_t" || type === "size_t";
export const isDouble = (type: string) => type === "double";
export const isAtomicType = (type: string) => type === "bool" || isDouble(type) || isNumberType(type) || type === "string";

export const unWrapType = (obj: string, type: string, pointer: boolean) => {
  if (type === "bool") {
    return `static_cast<uint32_t>(${obj}.getBool())`;
  } else if (isDouble(type)) {
    return `${obj}.getNumber()`;
  } else if (isNumberType(type)) {
    return `static_cast<${type}>(${obj}.getNumber())`;
  } else if (type === "string") {
    // TODO: the copy needs to be freed
    return `strdup(${obj}.getString(runtime).utf8(runtime).c_str())`;
  } else if (isEnum(type)) {
    return `get${type}(${obj}.getString(runtime).utf8(runtime).c_str())`;
  } else {
    const name = objectName(type);
    const className = `Jsi${name}`;
    return `${pointer ? '' : '*'}${className}::fromValue(runtime, ${obj})`;
  }
};

export const computeDependencies = (obj: JSIObject) => {
  const deps = new Set<string>();
  const methods = obj.methods ?? [];
  const properties = obj.properties ?? [];
  methods.forEach(method => {
    method.args.forEach(arg => {
      if (!isAtomicType(arg.type) && (method.returns === undefined || (method.returns && !isEnum(method.returns)))) {
        deps.add(objectName(arg.type));
      }
    });
    if (method.returns && !isAtomicType(method.returns)&& !isEnum(method.returns)) {
      deps.add(objectName(method.returns));
    }
  });
  properties.forEach(prop => {
    if (!isAtomicType(prop.type) && !isEnum(prop.type)) {
      deps.add(objectName(prop.type));
    }
  });
  return Array.from(deps).map(dep => `#include "Jsi${dep}.h"`).join("\n")
};