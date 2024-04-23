import _ from "lodash";

const atomicMap: Record<string, string> = {
  "bool": "boolean",
  "uint32_t": "number",
  "Void": "void"
};

export const objectName = (name: string) => _.upperFirst(_.camelCase(name));
export const typeName = (name: string) => isAtomicType(name) ? atomicMap[name] : objectName(name);

export const isAtomicType = (type: string) => atomicMap[type] !== undefined;
