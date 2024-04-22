import _ from "lodash";

import { generateObject } from "./generateObject";
import {WGPUObject, model} from "./model";


const objects = [
  "instance"
];

for (const key in model) {
  const value = model[key as keyof typeof model];
  if (value.category === "object" && objects.includes(key)) {
    const result = generateObject(`${_.upperFirst(_.camelCase(key))}`, value);
    console.log(result);
  }
}

// const keys = Object.keys(model);
// console.log({keys});