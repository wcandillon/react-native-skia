import type { SkMaskFilter } from "../../../skia/types";
import { BlurStyle } from "../../../skia/types";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import type { BlurMaskFilterProps } from "../../types";
import { DeclarationType, NodeType } from "../../types";
import { enumKey } from "../datatypes";

export class BlurMaskFilterNode extends JsiDeclarationNode<
  BlurMaskFilterProps,
  SkMaskFilter
> {
  constructor(ctx: NodeContext, props: BlurMaskFilterProps) {
    super(ctx, DeclarationType.MaskFilter, NodeType.BlurMaskFilter, props);
  }

  materialize() {
    const { style, blur, respectCTM } = this.props;
    return this.Skia.MaskFilter.MakeBlur(
      BlurStyle[enumKey(style)],
      blur,
      respectCTM
    );
  }
}
