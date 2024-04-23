import _ from "lodash";

import { generateObject } from "./generateObject";
import { model } from "./model";
import { objectName } from "./common";

model.forEach((object) => {
  const result = generateObject(object);
  console.log(result);
});


// const keys = Object.keys(model);
// console.log({keys});