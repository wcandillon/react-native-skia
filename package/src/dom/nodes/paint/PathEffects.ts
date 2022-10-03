import { Path1DEffectStyle } from "../../../skia/types";
import type { SkPathEffect } from "../../../skia/types";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import type {
  CornerPathEffectProps,
  DashPathEffectProps,
  DiscretePathEffectProps,
  Line2DPathEffectProps,
  Node,
  Path1DPathEffectProps,
  Path2DPathEffectProps,
} from "../../types";
import { DeclarationType, NodeType } from "../../types";
import { enumKey } from "../datatypes/Enum";
import { processPath } from "../datatypes";

abstract class PathEffectDeclaration<
  P,
  Nullable extends null | never = never
> extends JsiDeclarationNode<P, SkPathEffect, Nullable> {
  constructor(ctx: NodeContext, type: NodeType, props: P) {
    super(ctx, DeclarationType.PathEffect, type, props);
  }

  addChild(child: Node<unknown>) {
    if (!(child instanceof PathEffectDeclaration)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.addChild(child);
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>): void {
    if (!(child instanceof PathEffectDeclaration)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.insertChildBefore(child, before);
  }

  compose(pe: SkPathEffect) {
    const children = this._children as PathEffectDeclaration<unknown>[];
    if (this._children.length === 0) {
      return pe;
    } else {
      return this.Skia.PathEffect.MakeCompose(
        pe,
        children.reduce<SkPathEffect | null>((acc, child) => {
          if (acc === null) {
            return child.materialize();
          }
          return this.Skia.PathEffect.MakeCompose(acc, child.materialize());
        }, null) as SkPathEffect
      );
    }
  }
  getOptionalChildInstance(index: number) {
    const child = this._children[index];
    if (!child) {
      return null;
    }
    return this.getMandatoryChildInstance(index);
  }

  getMandatoryChildInstance(index: number) {
    const child = this._children[index];
    if (child instanceof JsiDeclarationNode) {
      if (child.isPathEffect()) {
        return child.materialize();
      } else {
        throw new Error(`Found invalid child ${child.type} in ${this.type}`);
      }
    } else {
      throw new Error(`Found invalid child ${child.type} in ${this.type}`);
    }
  }
}

export class DiscretePathEffectNode extends PathEffectDeclaration<DiscretePathEffectProps> {
  constructor(ctx: NodeContext, props: DiscretePathEffectProps) {
    super(ctx, NodeType.DiscretePathEffect, props);
  }

  materialize() {
    const { length, deviation, seed } = this.props;
    const pe = this.Skia.PathEffect.MakeDiscrete(length, deviation, seed);
    return this.compose(pe);
  }
}

export class Path2DPathEffectNode extends PathEffectDeclaration<
  Path2DPathEffectProps,
  null
> {
  constructor(ctx: NodeContext, props: Path2DPathEffectProps) {
    super(ctx, NodeType.Path2DPathEffect, props);
  }

  materialize() {
    const { matrix } = this.props;
    const path = processPath(this.Skia, this.props.path);
    const pe = this.Skia.PathEffect.MakePath2D(matrix, path);
    if (pe === null) {
      return null;
    }
    return this.compose(pe);
  }
}

export class DashPathEffectNode extends PathEffectDeclaration<DashPathEffectProps> {
  constructor(ctx: NodeContext, props: DashPathEffectProps) {
    super(ctx, NodeType.DashPathEffect, props);
  }

  materialize() {
    const { intervals, phase } = this.props;
    const pe = this.Skia.PathEffect.MakeDash(intervals, phase);
    return this.compose(pe);
  }
}

export class CornerPathEffectNode extends PathEffectDeclaration<
  CornerPathEffectProps,
  null
> {
  constructor(ctx: NodeContext, props: CornerPathEffectProps) {
    super(ctx, NodeType.CornerPathEffect, props);
  }

  materialize() {
    const { r } = this.props;
    const pe = this.Skia.PathEffect.MakeCorner(r);
    if (pe === null) {
      return null;
    }
    return this.compose(pe);
  }
}

export class SumPathEffectNode extends PathEffectDeclaration<null> {
  constructor(ctx: NodeContext) {
    super(ctx, NodeType.SumPathEffect, null);
  }

  materialize() {
    return this.Skia.PathEffect.MakeSum(
      this.getMandatoryChildInstance(0),
      this.getMandatoryChildInstance(1)
    );
  }
}

export class Line2DPathEffectNode extends PathEffectDeclaration<
  Line2DPathEffectProps,
  null
> {
  constructor(ctx: NodeContext, props: Line2DPathEffectProps) {
    super(ctx, NodeType.Line2DPathEffect, props);
  }

  materialize() {
    const { width, matrix } = this.props;
    const pe = this.Skia.PathEffect.MakeLine2D(width, matrix);
    if (pe === null) {
      return null;
    }
    return this.compose(pe);
  }
}

export class Path1DPathEffectNode extends PathEffectDeclaration<
  Path1DPathEffectProps,
  null
> {
  constructor(ctx: NodeContext, props: Path1DPathEffectProps) {
    super(ctx, NodeType.Path1DPathEffect, props);
  }

  materialize() {
    const { advance, phase, style } = this.props;
    const path = processPath(this.Skia, this.props.path);
    const pe = this.Skia.PathEffect.MakePath1D(
      path,
      advance,
      phase,
      Path1DEffectStyle[enumKey(style)]
    );
    if (pe === null) {
      return null;
    }
    return this.compose(pe);
  }
}
