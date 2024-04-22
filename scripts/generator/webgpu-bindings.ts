import _ from "lodash";

import { generateObject } from "./generateObject";
import { model } from "./model";
import { objectName } from "./common";

interface Filter { 
  methods: string[];
}

const objects: Record<string, Filter> = {
  "instance": { methods: ["request adapter"] }
};

for (const key in model) {
  const value = model[key as keyof typeof model];
  const objs = Object.keys(objects);
  if (value.category === "object" && objs.includes(key)) {
    const result = generateObject(`${objectName(key)}`, value, objects[key].methods);
    console.log(result);
  }
}

// const keys = Object.keys(model);
// console.log({keys});