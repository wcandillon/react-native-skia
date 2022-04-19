import { Skia } from "../../skia";
import type { CanvasNode } from "../../skia/Node";

export const Container = Skia.Node.MakeCanvas;
export type Container = CanvasNode;
// export class Container {
//   root = Skia.Node.MakeCanvas({});
//   depMgr: DependencyManager;

//   redraw: () => void;

//   constructor(depMgr: DependencyManager, redraw: () => void) {
//     this.depMgr = depMgr;
//     this.redraw = redraw;
//   }
// }
