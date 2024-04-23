import _ from 'lodash';
import { Fn, Method, Model, Obj } from './model';
import { objectName, typeName } from './common';

const generateFn = (name: string, fn: Fn | Method) => {
  return `function ${name}(): ${fn.returns ? typeName(fn.returns) : "void"};`;
};

const generateObject = (name: string, obj: Obj) => {
  return `interface ${objectName(name)} {
  ${(obj.methods ?? []).map(method => generateFn(_.camelCase(method.name), method)).join(`
  `)}
}`;
};

export const generateTS = (model: Model) => {
  const decls: string[] = [];
  for (const name in model) {
    const item = model[name as keyof Model];
    if (item.category === 'function') {
      decls.push(generateFn(_.camelCase(name), item as Fn));
    } else if (item.category === 'object') {
      decls.push(generateObject(name, item as Obj));
    }
  }
  return `interface WGPU {
  ${decls.join(`
  `)}
}`;
}