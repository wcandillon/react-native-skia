import { BlendMode } from "../../../skia/types";
import type { SkColorFilter } from "../../../skia/types";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import type {
  BlendColorFilterProps,
  MatrixColorFilterProps,
  Node,
} from "../../types";
import { DeclarationType, NodeType } from "../../types";
import { processColor } from "../datatypes";
import { enumKey } from "../datatypes/Enum";
import type { LerpColorFilterProps } from "../../types/ColorFilters";

export abstract class ColorFilterDeclaration<
  P,
  Nullable extends null | never = never
> extends JsiDeclarationNode<P, SkColorFilter, Nullable> {
  constructor(ctx: NodeContext, type: NodeType, props: P) {
    super(ctx, DeclarationType.ColorFilter, type, props);
  }

  addChild(child: Node<unknown>) {
    if (!(child instanceof ColorFilterDeclaration)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.addChild(child);
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>): void {
    if (!(child instanceof ColorFilterDeclaration)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.insertChildBefore(child, before);
  }

  compose(filter: SkColorFilter) {
    const children = this._children as ColorFilterDeclaration<unknown>[];
    if (this._children.length === 0) {
      return filter;
    } else {
      return this.Skia.ColorFilter.MakeCompose(
        filter,
        children.reduce<SkColorFilter | null>((acc, child) => {
          if (acc === null) {
            return child.materialize();
          }
          return this.Skia.ColorFilter.MakeCompose(acc, child.materialize());
        }, null) as SkColorFilter
      );
    }
  }
}

export class MatrixColorFilterNode extends ColorFilterDeclaration<MatrixColorFilterProps> {
  constructor(ctx: NodeContext, props: MatrixColorFilterProps) {
    super(ctx, NodeType.MatrixColorFilter, props);
  }

  materialize() {
    const { matrix } = this.props;
    const cf = this.Skia.ColorFilter.MakeMatrix(matrix);
    return this.compose(cf);
  }
}

export class BlendColorFilterNode extends ColorFilterDeclaration<BlendColorFilterProps> {
  constructor(ctx: NodeContext, props: BlendColorFilterProps) {
    super(ctx, NodeType.BlendColorFilter, props);
  }

  materialize() {
    const { mode } = this.props;
    const color = processColor(this.Skia, this.props.color, 1);
    const cf = this.Skia.ColorFilter.MakeBlend(color, BlendMode[enumKey(mode)]);
    return this.compose(cf);
  }
}

export class LinearToSRGBGammaColorFilterNode extends ColorFilterDeclaration<null> {
  constructor(ctx: NodeContext) {
    super(ctx, NodeType.LinearToSRGBGammaColorFilter, null);
  }

  materialize() {
    const cf = this.Skia.ColorFilter.MakeLinearToSRGBGamma();
    return this.compose(cf);
  }
}

export class SRGBToLinearGammaColorFilterNode extends ColorFilterDeclaration<null> {
  constructor(ctx: NodeContext) {
    super(ctx, NodeType.SRGBToLinearGammaColorFilter, null);
  }

  materialize() {
    const cf = this.Skia.ColorFilter.MakeSRGBToLinearGamma();
    return this.compose(cf);
  }
}

export class LumaColorFilterNode extends ColorFilterDeclaration<null> {
  constructor(ctx: NodeContext) {
    super(ctx, NodeType.LumaColorFilter, null);
  }

  materialize() {
    const cf = this.Skia.ColorFilter.MakeLumaColorFilter();
    return this.compose(cf);
  }
}

export class LerpColorFilterNode extends ColorFilterDeclaration<LerpColorFilterProps> {
  constructor(ctx: NodeContext, props: LerpColorFilterProps) {
    super(ctx, NodeType.LerpColorFilter, props);
  }

  materialize() {
    const { t } = this.props;
    const [first, second] = this.children() as JsiDeclarationNode<
      unknown,
      SkColorFilter
    >[];
    return this.Skia.ColorFilter.MakeLerp(
      t,
      first.materialize(),
      second.materialize()
    );
  }
}
