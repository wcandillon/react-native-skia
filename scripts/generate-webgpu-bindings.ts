import model from "./dawn.json";

for (const key in model) {
  const value = model[key as keyof typeof model];
  if (value.category === "object") {
    console.log({ key, value });
  }
}

// const keys = Object.keys(model);
// console.log({keys});