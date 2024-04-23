import _ from "lodash";
import { writeFileSync } from "fs";

import { generateObject } from "./generateObject";
import { Model, Obj, Struct, model } from "./model";
import { objectName } from "./common";
import { generateTS } from './generateTS';

const ts = generateTS(model);
const dst = `package/src/wgpu/dawn.ts`;
console.log(`Writing ${dst}...`);
writeFileSync(dst, ts);
for (const key in model) {
  const obj = model[key as keyof Model];
  if (obj.category === "object" || obj.category === "structure") {
    const name = objectName(key);
    const result = generateObject(name, obj as (Obj | Struct));
    const className = `Jsi${name}`;
    const dst = `package/cpp/wgpu/${className}.h`;
    console.log(`Writing ${dst}...`);
    writeFileSync(dst, result);
  }
}

console.log("Generated bindings for WebGPU");

