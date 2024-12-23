import Rea from "../external/reanimated/ReanimatedProxy";
import type { SkCanvas, Skia } from "../skia/types";

import { DrawingContext } from "./DrawingContext";
import type { Node } from "./Node";
import { draw } from "./Nodes";

export class Container {
  // TODO: is this necessary?
  public root: Node[] = [];
  public unmounted = false;

  constructor(public Skia: Skia, private nativeId: number) {}

  clear() {
    console.log("clear container");
  }
  redraw() {
    console.log("redraw container");
  }

  getNativeId() {
    return this.nativeId;
  }

  drawOnCanvas(canvas: SkCanvas) {
    const ctx = new DrawingContext(this.Skia, canvas);
    this.root.forEach((node) => {
      draw(ctx, node);
    });
  }

  render() {
    // TODO: this can be polyfilled if Reanimated is not installed
    Rea.runOnUI((Skia: Skia, nativeId: number, root: Node[]) => {
      const rec = Skia.PictureRecorder();
      const canvas = rec.beginRecording();
      const ctx = new DrawingContext(Skia, canvas);
      root.forEach((node) => {
        draw(ctx, node);
      });
      const picture = rec.finishRecordingAsPicture();
      //SkiaViewApi.setJsiProperty(nativeId, "picture", picture);
      console.log("RENDERED!");
    })(this.Skia, this.nativeId, this.root);
  }
}
