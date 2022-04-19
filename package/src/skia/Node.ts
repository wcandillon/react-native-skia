import type { SkJSIInstance } from "./JsiInstance";

export type NodeCanvas = SkJSIInstance<"NodeCanvas">;

export interface NodeFactory {
  MakeCanvas(): NodeCanvas;
}
