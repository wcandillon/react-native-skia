import type { BlendProps } from "../../types/ImageFilters";
import type { SkShader, SkImageFilter } from "../../../skia/types";
import { BlendMode } from "../../../skia/types";
import { DeclarationType, NodeType } from "../../types/NodeType";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import type { Node } from "../../types";
import { enumKey } from "../datatypes";

import { ImageFilterDeclaration } from "./ImageFilters";
import { ShaderDeclaration } from "./Shaders";

export class BlendNode extends JsiDeclarationNode<
  BlendProps,
  SkShader | SkImageFilter
> {
  constructor(ctx: NodeContext, props: BlendProps) {
    super(ctx, DeclarationType.ImageFilter, NodeType.Blend, props);
  }

  private checkChild(
    child: ImageFilterDeclaration<unknown> | ShaderDeclaration<unknown>
  ) {
    if (this._children.length > 0) {
      if (child.declarationType === DeclarationType.ImageFilter) {
        this.declarationType = DeclarationType.ImageFilter;
      } else {
        this.declarationType = DeclarationType.Shader;
      }
    }
  }

  addChild(child: Node<unknown>) {
    if (
      !(child instanceof JsiDeclarationNode) ||
      (child.declarationType !== DeclarationType.Shader &&
        child.declarationType !== DeclarationType.ImageFilter)
    ) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    this.checkChild(child);
    super.addChild(child);
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>): void {
    if (
      !(child instanceof ImageFilterDeclaration) ||
      !(child instanceof ShaderDeclaration)
    ) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    this.checkChild(child);
    super.insertChildBefore(child, before);
  }

  materialize() {
    const { Skia } = this;
    const blend = BlendMode[enumKey(this.props.mode)];
    if (this.declarationType === DeclarationType.ImageFilter) {
      return (this._children as ImageFilterDeclaration<unknown>[])
        .reverse()
        .reduce<SkImageFilter | null>((inner, outer) => {
          if (inner === null) {
            return outer.materialize();
          }
          return Skia.ImageFilter.MakeBlend(blend, outer.materialize(), inner);
        }, null) as SkImageFilter;
    } else {
      return (this._children as ShaderDeclaration<unknown>[])
        .reverse()
        .reduce<SkShader | null>((inner, outer) => {
          if (inner === null) {
            return outer.materialize();
          }
          return Skia.Shader.MakeBlend(blend, outer.materialize(), inner);
        }, null) as SkShader;
    }
  }
}
