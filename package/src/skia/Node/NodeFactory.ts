import type { SkJSIInstance } from "../JsiInstance";
import type { SkRect } from "../Rect";

type Scene = SkJSIInstance<"Scene">;
type RenderNode = SkJSIInstance<"RenderNode">;
type PaintNode = SkJSIInstance<"PaintNode">;
type GeometryNode = SkJSIInstance<"GeometryNode">;

interface GroupNode extends SkJSIInstance<"GroupNode"> {
  addChild: (child: RenderNode) => void;
}

interface RectNode extends SkJSIInstance<"RectNode"> {
  setL: (l: number) => void;
  setR: (l: number) => void;
  setB: (l: number) => void;
  setT: (l: number) => void;
  to: () => GeometryNode;
}

export interface NodeFactory {
  MakeScene: (root: GroupNode) => Scene;
  MakePlane: () => GeometryNode;
  MakeColor: (color: number) => PaintNode;
  MakeDraw: (geometry: GeometryNode, paint: PaintNode) => RenderNode;
  MakeRect: (rect: SkRect) => RectNode;
  MakeGroup: () => GroupNode;
}
