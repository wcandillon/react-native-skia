import _ from "lodash";
import { JSIObject } from "./model";

export const objectName = (name: string) => _.upperFirst(_.camelCase(name));

export const isAtomicType = (type: string) => type === "bool" || type === "uint32_t" || type === "string";

export const unWrapType = (obj: string, type: string) => {
  if (type === "bool") {
    return `${obj}.getBool()`;
  } else if (type === "uint32_t") {
    return `reinterpret_cast<uint32_t>(${obj}.getNumber())`;
  } else if (type === "string") {
    return `${obj}.getString(runtime).utf8(runtime).c_str()`;
  } else {
    const name = objectName(type);
    const className = `Jsi${name}`;
    return `${className}::fromValue(runtime, ${obj})`;
  }
};

export const computeDependencies = (obj: JSIObject) => {
  const deps = new Set<string>();
  const methods = obj.methods ?? [];
  const properties = obj.properties ?? [];
  methods.forEach(method => {
    method.args.forEach(arg => {
      if (!isAtomicType(arg.type)) {
        deps.add(objectName(arg.type));
      }
    });
    if (method.returns && !isAtomicType(method.returns)) {
      deps.add(objectName(method.returns));
    }
  });
  properties.forEach(prop => {
    if (!isAtomicType(prop.type)) {
      deps.add(objectName(prop.type));
    }
  });
  return Array.from(deps).map(dep => `#include "Jsi${dep}.h"`).join("\n")
};