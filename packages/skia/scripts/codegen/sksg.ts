import * as path from "path";

import { Project } from "ts-morph";

const normalizeName = (name: string) => {
  const tokens = name.split(".");
  const lastToken = tokens[tokens.length - 1];
  return lastToken;
};

// Define the path to the WebGPU type declaration file
const tsConfigFilePath = path.resolve(__dirname, "../../tsconfig.json");
const filePath = path.resolve(__dirname, "../../src/dom/types/SkDOM.ts");

const project = new Project({
  tsConfigFilePath,
});

const sourceFile = project.addSourceFileAtPath(filePath);

// Find the SkDOM interface
const skDomInterface = sourceFile.getInterface("SkDOM");

if (!skDomInterface) {
  throw new Error("SkDOM interface not found");
}

// Extract member information
const members = skDomInterface.getMethods().map((method) => {
  const name = method.getName();
  const parameters = method.getParameters();
  const propsParam = parameters[0];
  const propsType = normalizeName(
    propsParam ? propsParam.getType().getText() : "void"
  );
  const returnType = method.getReturnType().getText();
  const isDrawing =
    returnType.includes("RenderNode") || returnType.includes("DrawningNode");
  return {
    name,
    propsType,
    isDrawing,
  };
});

// Output results
console.log("SkDOM Interface Members:");
members.forEach((member) => {
  console.log(`
Name: ${member.name}
Props Type: ${member.propsType}
Return Type: ${member.isDrawing}
-------------------`);
});
