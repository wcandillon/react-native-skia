import _ from "lodash";

import { generateObject } from "./generateObject";
import { model } from "./model";
import { objectName } from "./common";

for (const key in model) {
  const value = model[key as keyof typeof model];
  if (value.category === "object") {
    const result = generateObject(`${objectName(key)}`, value);
    console.log(result);
  }
}

// const keys = Object.keys(model);
// console.log({keys});