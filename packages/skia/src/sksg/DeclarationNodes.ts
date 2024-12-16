import { enumKey } from "../dom/nodes";
import type { DeclarationContext, BlurMaskFilterProps } from "../dom/types";
import { BlurStyle } from "../skia/types";

import { NodeType } from "./Node";
import type { DeclarationNode, Node } from "./Node";

export class BlurMaskFilterNode
  implements DeclarationNode<BlurMaskFilterProps>
{
  type = NodeType.Declaration as const;
  children: Node<unknown>[] = [];
  constructor(private props: BlurMaskFilterProps) {}
  clone() {
    return new BlurMaskFilterNode(this.props);
  }
  declare(ctx: DeclarationContext) {
    const { style, blur, respectCTM } = this.props;
    const mf = ctx.Skia.MaskFilter.MakeBlur(
      BlurStyle[enumKey(style)],
      blur,
      respectCTM
    );
    ctx.maskFilters.push(mf);
  }
}
