import type { Node } from "../../dom/types";
import { mapKeys } from "../../renderer/typeddash";
import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import { isMatrix, Skia } from "../types";
import { JsiSkApi } from "../web";

let Skia: ReturnType<typeof JsiSkApi>;

beforeAll(async () => {
  await LoadSkiaWeb();
  Skia = JsiSkApi(global.CanvasKit);
});

export const setupSkia = (width = 256, height = 256) => {
  expect(Skia).toBeDefined();
  const surface = Skia.Surface.Make(width, height)!;
  expect(surface).toBeDefined();
  const canvas = surface.getCanvas();
  expect(canvas).toBeDefined();
  return {
    surface,
    width,
    height,
    center: { x: width / 2, y: height / 2 },
    canvas,
    Skia,
    CanvasKit: global.CanvasKit,
  };
};

const asValue = (value: unknown) => {
  if (value instanceof Float32Array) {
    return Array.from(value)
      .map((v) => Math.round(v * 100) / 100)
      .join(", ");
  } else if (isMatrix(value)) {
    // TODO: https://github.com/Shopify/react-native-skia/issues/715
    return "m3x3";
  } else if (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value
  ) {
    const v = value as { x: number; y: number };
    return `{x:${v.x}, y:${v.y}}`;
  }
  return value;
};

export const printAsXML = (node: Node<unknown>) => {
  console.log(asXML(node));
};

// Print nodes as XML tree
export const asXML = (node: Node<unknown>, indent = 0): string => {
  // TODO: remove cast
  const hasChildren = node.children().length > 0;
  const props = node.getProps() as object;
  const space = new Array(indent).fill(" ").join("");
  const keys = mapKeys(props).filter((key) => props[key] !== undefined);
  if (hasChildren) {
    return `${space}<${node.type}${keys.length > 0 ? " " : ""}${keys
      .map((name) => `${name}="${asValue(props[name])}"`)
      .join(" ")}>
${node
  .children()

  .map((child) => asXML(child, indent + 2)).join(`
`)}
${space}</${node.type}>`;
  } else {
    return `${space}<${node.type} ${keys
      .map((name) => `${name}="${asValue(props[name])}"`)
      .join(" ")} />`;
  }
};
