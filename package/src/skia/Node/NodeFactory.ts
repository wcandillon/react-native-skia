import type { SkJSIInstance } from "../JsiInstance";

type Scene = SkJSIInstance<"Scene">;
type RenderNode = SkJSIInstance<"RenderNode">;
type PaintNode = SkJSIInstance<"PaintNode">;
type GeometryNode = SkJSIInstance<"GeometryNode">;

export interface NodeFactory {
  MakeScene: (root: RenderNode) => Scene;
  MakePlane: () => GeometryNode;
  MakeColor: (color: number) => PaintNode;
  MakeDraw: (geometry: GeometryNode, paint: PaintNode) => RenderNode;
}
