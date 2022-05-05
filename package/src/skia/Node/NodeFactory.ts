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
  setR: (r: number) => void;
  setB: (b: number) => void;
  setT: (t: number) => void;
  to: () => GeometryNode;
}

interface OpacityEffect extends SkJSIInstance<"OpacityEffect"> {
  setOpacity: (opacity: number) => void;
  to: () => RenderNode;
}

interface ColorNode extends SkJSIInstance<"Color"> {
  setColor: (color: number) => void;
  to: () => PaintNode;
}

export interface NodeFactory {
  MakeScene: (root: GroupNode) => Scene;
  MakePlane: () => GeometryNode;
  MakeColor: (color: number) => ColorNode;
  MakeDraw: (geometry: GeometryNode, paint: PaintNode) => RenderNode;
  MakeRect: (rect: SkRect) => RectNode;
  MakeGroup: () => GroupNode;
  MakeOpacityEffect: (child: RenderNode, opacity: number) => OpacityEffect;
}
