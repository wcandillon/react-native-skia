import type {
  SkColorFilter,
  Skia,
  SkImageFilter,
  SkMaskFilter,
  SkShader,
  SkPathEffect,
  SkPaint,
} from "../../skia/types";
import type { Node, DeclarationNode, NodeType } from "../types";
import { DeclarationType } from "../types";
import type { DependencyManager } from "../../renderer/DependencyManager";

export interface NodeContext {
  Skia: Skia;
  depMgr: DependencyManager;
}

export abstract class JsiNode<P> implements Node<P> {
  protected _children: JsiNode<unknown>[] = [];
  protected Skia: Skia;
  protected depMgr: DependencyManager;

  constructor(ctx: NodeContext, public type: NodeType, protected props: P) {
    this.Skia = ctx.Skia;
    this.depMgr = ctx.depMgr;
  }

  setProps(props: P) {
    this.props = props;
  }

  setProp<K extends keyof P>(name: K, v: P[K]) {
    const hasChanged = this.props[name] !== v;
    this.props[name] = v;
    return hasChanged;
  }

  getProps() {
    return this.props;
  }

  children() {
    return this._children;
  }

  addChild(child: Node<unknown>) {
    this._children.push(child as JsiNode<unknown>);
  }

  dispose() {
    this.depMgr.unsubscribeNode(this);
    this._children.forEach((child) => child.dispose());
  }

  removeChild(child: Node<unknown>) {
    const index = this._children.indexOf(child as JsiNode<unknown>);
    if (index !== -1) {
      const [node] = this._children.splice(index, 1);
      node.dispose();
    }
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>) {
    const index = this._children.indexOf(child as JsiNode<unknown>);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
    const beforeIndex = this._children.indexOf(before as JsiNode<unknown>);
    this._children.splice(beforeIndex, 0, child as JsiNode<unknown>);
  }
}

export type Invalidate = () => void;

export abstract class JsiDeclarationNode<
    P,
    T,
    Nullable extends null | never = never
  >
  extends JsiNode<P>
  implements DeclarationNode<P, T, Nullable>
{
  private invalidate: Invalidate = () => {};

  constructor(
    ctx: NodeContext,
    public declarationType: DeclarationType,
    type: NodeType,
    props: P
  ) {
    super(ctx, type, props);
  }

  abstract materialize(): T | Nullable;

  addChild(child: Node<unknown>): void {
    if (!(child instanceof JsiDeclarationNode)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.addChild(child);
    this.invalidate();
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>): void {
    if (!(child instanceof JsiDeclarationNode)) {
      throw new Error(`Cannot add child of type ${child.type} to ${this.type}`);
    }
    super.insertChildBefore(child, before);
    this.invalidate();
  }

  dispose() {
    this.invalidate();
    super.dispose();
  }

  setInvalidate(invalidate: Invalidate) {
    this.invalidate = invalidate;
  }

  setProps(props: P) {
    super.setProps(props);
    this.invalidate();
  }

  setProp<K extends keyof P>(name: K, v: P[K]) {
    const hasChanged = super.setProp(name, v);
    if (hasChanged) {
      this.invalidate();
    }
    return hasChanged;
  }

  isPaint(): this is DeclarationNode<unknown, SkPaint> {
    return this.declarationType === DeclarationType.Paint;
  }

  isImageFilter(): this is DeclarationNode<unknown, SkImageFilter> {
    return this.declarationType === DeclarationType.ImageFilter;
  }

  isColorFilter(): this is DeclarationNode<unknown, SkColorFilter> {
    return this.declarationType === DeclarationType.ColorFilter;
  }

  isShader(): this is DeclarationNode<unknown, SkShader> {
    return this.declarationType === DeclarationType.Shader;
  }

  isMaskFilter(): this is DeclarationNode<unknown, SkMaskFilter> {
    return this.declarationType === DeclarationType.MaskFilter;
  }

  isPathEffect(): this is DeclarationNode<unknown, SkPathEffect> {
    return this.declarationType === DeclarationType.PathEffect;
  }
}
