import type { SkJSIInstance } from "../JsiInstance";

type Scene = SkJSIInstance<"Scene">;
type RenderNode = SkJSIInstance<"RenderNode">;
type PaintNode = SkJSIInstance<"PaintNode">;
type GeometryNode = SkJSIInstance<"GeometryNode">;

type Color = PaintNode;
type Plane = GeometryNode;
type Draw = RenderNode;

export interface NodeFactory {
  MakeScene: (root: RenderNode) => Scene;
  MakePlane: () => Plane;
  MakeColor: (color: number) => Color;
  MakeDraw: (geometry: GeometryNode, paint: PaintNode) => Draw;
}
