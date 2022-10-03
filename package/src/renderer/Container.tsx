import { JsiSkDOM } from "../dom/nodes";
import type {
  GroupProps,
  DrawingContext,
  RenderNode,
  SkDOM,
} from "../dom/types";
import type { Skia } from "../skia/types";

import type { DependencyManager } from "./DependencyManager";

export class Container {
  private _root: RenderNode<GroupProps>;
  public Sk: SkDOM;
  constructor(
    Skia: Skia,
    public depMgr: DependencyManager,
    public redraw: () => void
  ) {
    this.Sk = new JsiSkDOM({ Skia, depMgr });
    this._root = this.Sk.Group();
  }

  draw(ctx: DrawingContext) {
    this._root.render(ctx);
  }

  get root() {
    return this._root;
  }
}
