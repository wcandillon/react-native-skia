import type { SkVertices } from "../../../skia/types";
import { VertexMode, BlendMode } from "../../../skia/types";
import type { DrawingContext, VerticesProps } from "../../types";
import { NodeType } from "../../types";
import { enumKey, processColor } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class VerticesNode extends JsiDrawingNode<VerticesProps, SkVertices> {
  constructor(ctx: NodeContext, props: VerticesProps) {
    super(ctx, NodeType.Vertices, props);
  }

  protected deriveProps() {
    const { mode, vertices, textures, colors, indices } = this.props;
    const vertexMode = mode ? VertexMode[enumKey(mode)] : VertexMode.Triangles;
    return this.Skia.MakeVertices(
      vertexMode,
      vertices,
      textures,
      colors ? colors.map((c) => processColor(this.Skia, c, 1)) : undefined,
      indices
    );
  }

  draw({ canvas, paint }: DrawingContext) {
    const { colors, blendMode } = this.props;
    const defaultBlendMode = colors ? BlendMode.DstOver : BlendMode.SrcOver;
    const blend = blendMode ? BlendMode[enumKey(blendMode)] : defaultBlendMode;
    if (this.derived === undefined) {
      throw new Error("VerticesNode: vertices is undefined");
    }
    canvas.drawVertices(this.derived, blend, paint);
  }
}
