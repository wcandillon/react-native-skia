import _ from "lodash";
import { JSIObject } from "./model";

export const objectName = (name: string) => _.upperFirst(_.camelCase(name));

export const isAtomicType = (type: string) => type === "bool" || type === "uint32_t";

export const computeDependencies = (obj: JSIObject) => {
  const deps = new Set<string>();
  const methods = obj.methods ?? [];
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
  return Array.from(deps).map(dep => `#include "Jsi${dep}.h"`).join("\n")
};