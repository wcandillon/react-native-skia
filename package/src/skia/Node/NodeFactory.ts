import type { SkJSIInstance } from "../JsiInstance";

type Scene = SkJSIInstance<"Scene">;
type RenderNode = SkJSIInstance<"RenderNode">;

export interface NodeFactory {
  MakeScene: (root: RenderNode) => Scene;
}
