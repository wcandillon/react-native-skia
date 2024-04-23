import _ from 'lodash';
import { EnumType, Fn, Method, Model, Obj, Struct } from './model';
import { objectName, typeName } from './common';

const generateFn = (name: string, fn: Fn | Method) => {
  const args = fn.args ?? [];
  return `${name}(${args.map(arg => `${_.camelCase(arg.name)}: ${typeName(arg.type, arg.annotation)}`).join(", ")}): ${fn.returns ? typeName(fn.returns) : "void"};`;
};

const generateObject = (name: string, obj: Obj) => {
  return `interface ${objectName(name)} {
  ${(obj.methods ?? []).map(method => generateFn(_.camelCase(method.name), method)).join(`
  `)}
}`;
};

const generateStruct = (name: string, obj: Struct) => {
  return `interface ${objectName(name)} {
  ${(obj.members ?? []).map(member => `${_.camelCase(member.name)}: ${typeName(member.type, member.annotation)};`).join(`
  `)}
}`;
};

const wrapIfNeeded = (value: string): string => {
  // Check if the first character is a digit
  if (value.length > 0 && !isNaN(Number(value[0]))) {
    // Wrap the string in quotes if the first character is a number
    return `"${value}"`;
  }
  // Return the original string if it doesn't start with a number
  return value;
};


const generateEnum = (name: string, obj: EnumType) => {
  return `enum ${objectName(name)} {
  ${obj.values.map(value => `${wrapIfNeeded(objectName(value.name))} = ${value.value}`).join(`,
`)}
}`;
};

export const generateTS = (model: Model) => {
  const impls: string[] = [];
  const decls: string[] = [];
  // function pointer, enum, native, bitmask, constant
  for (const name in model) {
    const item = model[name as keyof Model];
    if (item.category === 'function') {
      impls.push(generateFn(_.camelCase(name), item as Fn));
    } else if (item.category === 'object') {
      decls.push(generateObject(name, item as Obj));
    } else if (item.category === 'structure') {
      decls.push(generateStruct(name, item as Struct));
    } else if (item.category === 'enum' || item.category === 'bitmask') {
      decls.push(generateEnum(name, item as EnumType));
    } else if (item.category === "function pointer" && objectName(name) != "ErrorCallback") {
      decls.push(`type ${objectName(name)} = Function;`);
      //decls.push(generateFn(_.camelCase(name), item as Fn));
    }
  }
  return `/* eslint-disable @typescript-eslint/ban-types */
interface WGPU {
  ${impls.join(`
  `)}
}

${decls.join(`
  `)}`;
}