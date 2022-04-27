import type {
  AnimatedProps,
  BlurMaskNodeProps,
  CircleProps,
  FillProps,
  GlyphsProps,
} from "../renderer";
import type { RectProps } from "../renderer/components/shapes/Rect";

import type { SkJSIInstance } from "./JsiInstance";

export interface Node<T extends string = string> extends SkJSIInstance<T> {
  appendChild(node: Node): void;
  removeChild(node: Node): void;
  insertBefore(before: Node, node: Node): void;
  clearChildren(): void;
  setProps(props: { [name: string]: unknown }): void;
}

export type CanvasNode = Node<"CanvasNode">;

export interface NodeFactory {
  // eslint-disable-next-line @typescript-eslint/ban-types
  MakeCanvas(props: {}): CanvasNode;
  MakeCircle(props: AnimatedProps<CircleProps>): Node<"CircleNode">;
  MakeFill(props: AnimatedProps<FillProps>): Node<"FillNode">;
  MakeBlurMask(props: AnimatedProps<BlurMaskNodeProps>): Node<"BlurMaskNode">;
  MakeGlyphs(props: AnimatedProps<GlyphsProps>): Node<"GlyphsNode">;
  MakeRect(props: AnimatedProps<RectProps>): Node<"RectNode">;
}
