import * as path from "path";

import { Project } from "ts-morph";

const normalizeName = (name: string) => {
  const tokens = name.split(".");
  const lastToken = tokens[tokens.length - 1];
  return lastToken;
};

const drawingNode = (
  name: string,
  drawImpl: string,
  derivedPropsImpl: string,
  derivedType: string,
  propsName: string
) => {
  const hasDerived = derivedType !== "null";
  const nodeName = `${name}Node`;
  return `export class ${nodeName} implements DrawingNode<${propsName}> {
  type = NodeType.Drawing as const;
  ${hasDerived ? `private derived?: ${derivedType};` : ""}
  private props: ${propsName};

  children: Node<unknown>[] = [];

  constructor(props: ${propsName}) {
    this.props = props;
    ${hasDerived ? "this.derived = this.derivedProps();" : ""}
  }

  draw(ctx: DrawingContext) {
    const { canvas, paint } = ctx;
    const result = preProcessContext(ctx, this.props, this.children);
    ${drawImpl}
    postProcessContext(ctx, result);
  }

  ${
    hasDerived
      ? `derivedProps() {
    ${derivedPropsImpl}  
  }`
      : ""
  }

  clone() {
    return new ${nodeName}(this.props);
  }
}`;
};

// Define the path to the WebGPU type declaration file
const tsConfigFilePath = path.resolve(__dirname, "../../tsconfig.json");
const filePath = path.resolve(__dirname, "../../src/dom/types/SkDOM.ts");
const nodes = [
  path.resolve(__dirname, "../../src/dom/nodes/drawings/AtlasNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/BackdropFilterNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/Box.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/CircleNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/DiffRectNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/FillNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/ImageNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/ImageSVG.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/LineNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/OvalNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/ParagraphNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/PatchNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/PathNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/PictureNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/PointsNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/RectNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/RRectNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/Text.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/drawings/VerticesNode.ts"),

  path.resolve(__dirname, "../../src/dom/nodes/paint/BlendNode.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/paint/ColorFilters.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/paint/ImageFilters.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/paint/MaskFilters.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/paint/PathEffects.ts"),
  path.resolve(__dirname, "../../src/dom/nodes/paint/Shaders.ts"),
];

const project = new Project({
  tsConfigFilePath,
});

const sourceFile = project.addSourceFileAtPath(filePath);
nodes.forEach((node) => project.addSourceFileAtPath(node));

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
    returnType.includes("RenderNode") || returnType.includes("DrawingNode");

  // Find corresponding node class
  const nodeClass = project
    .getSourceFiles()
    .find((file) =>
      file.getClasses().some((c) => c.getName() === `${name}Node`)
    )
    ?.getClass(`${name}Node`);

  // Get derived type from heritage clause
  let derivedType = "unknown";
  let propsName = "unknown";
  if (nodeClass) {
    const heritage = nodeClass.getExtends();
    if (heritage) {
      const typeArgs = heritage.getTypeArguments();
      derivedType = typeArgs[1]?.getText() || "null";
      propsName = typeArgs[0]?.getText() || "null";
    }
  }

  const drawMethod = nodeClass?.getMethod("draw");
  const drawImpl = drawMethod?.getBodyText();

  const derivePropsMethod = nodeClass?.getMethod("deriveProps");
  const derivePropsImpl = derivePropsMethod?.getBodyText();

  const decorateMethod = nodeClass?.getMethod("decorate");
  const decorateImpl = decorateMethod?.getBodyText();

  return {
    name,
    propsType,
    isDrawing,
    returnType: returnType.toString(),
    nodeClass: nodeClass?.getName(),
    drawImpl,
    derivedType,
    derivePropsImpl,
    decorateImpl,
    propsName,
  };
});

members
  .filter((m) => m.isDrawing)
  .forEach(({ name, drawImpl, derivePropsImpl, derivedType, propsName }) => {
    console.log(
      drawingNode(
        name,
        drawImpl ?? "",
        derivePropsImpl ?? "",
        derivedType,
        propsName
      )
    );
  });

// members
//   .filter((m) => !m.isDrawing)
//   .forEach((member) => {
//     console.log(`
//   Name: ${member.name}
//   Node Class: ${member.nodeClass}
//   Decorate:
//   ${member.decorateImpl}
//   -------------------`);
//   });
