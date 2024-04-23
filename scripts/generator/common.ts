import _ from "lodash";
import { Annotation, Obj, Struct } from "./model";

import dawn from "./dawn.json";

const atomicMap: Record<string, string> = {
  "bool": "boolean",
  "size_t": "number",
  "uint32_t": "number",
  "int32_t": "number",
  "uint16_t": "number",
  "uint64_t": "bigint",
  "void": "void",
  "void *": "bigint",
  "void const *": "bigint",
  "double": "number",
  "uint8_t": "number",
  "float": "number",
  "int": "number",
  "char": "string",
};

const atomicMapPoints: Record<string, string> = {
  "float": "Float32Array",
  "uint32_t": "Uint32Array",
  "uint8_t": "Uint8Array",
  "uint16_t": "Uint16Array",
  "void": "ArrayBuffer",
  "char": "string",
  "uint64_t": "BigUint64Array",
};

export const objectName = (name: string) => _.upperFirst(_.camelCase(name));
export const typeName = (name: string, annotation?: Annotation) => {
  if (annotation !== undefined) {
    return atomicMapPoints[name] ?? objectName(name);
  }
  return isAtomicType(name) ? atomicMap[name] : objectName(name);
};

export const isAtomicType = (type: string) => atomicMap[type] !== undefined;

const typeHasDep = (type: string) => {
  if (!isAtomicType(type)) {
    const def = dawn[type as keyof typeof dawn];
    if (def.category === "object" || def.category === "structure") {
      return true;
    }
    return false;
  }
  return false;
};

export const computeDependencies = (obj: Obj | Struct) => {
  const deps = new Set<string>();
  const member = "members" in obj ? obj.members : [];
  const method = "methods" in obj ? obj.methods : [];
  for (const m of member) {
    if (typeHasDep(m.type)) {
      deps.add(m.type);
    }
  }
  for (const m of method) {
    for (const arg of (m.args ?? [])) {
      if (typeHasDep(arg.type)) {
        deps.add(arg.type);
      }
    }
    if (m.returns && typeHasDep(m.returns)) {
      deps.add(m.returns);
    }
  }
  return Array.from(deps).map(dep => `#include "Jsi${objectName(dep)}.h"`).join("\n")
};