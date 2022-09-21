import { PixelRatio } from "react-native";

import type { SkCanvas } from "../skia/types";

import type { DrawingInfo, SkiaDrawViewProps, TouchInfo } from "./types";
import { SkiaBaseWebView } from "./SkiaBaseWebView";

const pd = PixelRatio.get();

export class SkiaView extends SkiaBaseWebView<SkiaDrawViewProps> {
  constructor(props: SkiaDrawViewProps) {
    super(props);
  }

  protected renderInCanvas(canvas: SkCanvas, touches: TouchInfo[]): void {
    if (this.props.onDraw) {
      const info: DrawingInfo = {
        height: this.height,
        width: this.width,
        timestamp: Date.now(),
        touches: touches.map((t) => [t]),
      };
      canvas.save();
      canvas.scale(pd, pd);
      this.props.onDraw(canvas, info);
      canvas.restore();
    }
  }
}
