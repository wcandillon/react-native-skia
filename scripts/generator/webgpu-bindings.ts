import _ from "lodash";
import { writeFileSync } from "fs";

import { generateObject } from "./generateObject";
import { Member, Model, Obj, model } from "./model";
import { objectName } from "./common";

//console.log(generateTS(model));
for (const key in model) {
  const obj = model[key as keyof Model]; 
  if (key.startsWith("surface")) {
    continue;
  }
  if (obj.category === "object" || obj.category === "structure") {
    const name = objectName(key);
    const result = generateObject(name, obj as (Obj | Member));
    const className = `Jsi${name}`;
    const dst = `package/cpp/wgpu/${className}.h`;
    console.log(`Writing ${dst}...`);
    writeFileSync(dst, result);
  }
}

console.log("Generated bindings for WebGPU");

