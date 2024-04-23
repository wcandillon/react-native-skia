import _ from "lodash";
import { Annotation } from "./model";

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
