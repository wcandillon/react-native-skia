import _ from "lodash";
import { writeFileSync } from "fs";

import { generateObject } from "./generateObject";
import { model } from "./model";
import { generateTS } from "./generateTS";


console.log(generateTS(model));

// model.forEach((object) => {
//   const result = generateObject(object);
//   const className = `Jsi${object.name}`;
//   const dst = `package/cpp/wgpu/${className}.h`;
//   console.log(`Writing ${dst}...`);
//   writeFileSync(dst, result);
// });

console.log("Generated bindings for WebGPU");


// const keys = Object.keys(model);
// console.log({keys});