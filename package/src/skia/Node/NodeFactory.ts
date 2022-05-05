import type { SkJSIInstance } from "../JsiInstance";
import type { SkRect } from "../Rect";

type Scene = SkJSIInstance<"Scene">;
type RenderNode = SkJSIInstance<"RenderNode">;
type PaintNode = SkJSIInstance<"PaintNode">;
type GeometryNode = SkJSIInstance<"GeometryNode">;

interface GroupNode extends SkJSIInstance<"GroupNode"> {
  addChild: (child: RenderNode) => void;
}

export interface NodeFactory {
  MakeScene: (root: RenderNode) => Scene;
  MakePlane: () => GeometryNode;
  MakeColor: (color: number) => PaintNode;
  MakeDraw: (geometry: GeometryNode, paint: PaintNode) => RenderNode;
  MakeRect: (rect: SkRect) => GeometryNode;
  MakeGroup: () => GroupNode;
}
