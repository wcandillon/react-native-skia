import { PixelRatio } from "react-native";

import type { SkCanvas } from "../skia/types";

import type { SkiaPictureViewProps } from "./types";
import { SkiaBaseWebView } from "./SkiaBaseWebView";

const pd = PixelRatio.get();

export class SkiaPictureView extends SkiaBaseWebView<SkiaPictureViewProps> {
  constructor(props: SkiaPictureViewProps) {
    super(props);
  }

  protected renderInCanvas(canvas: SkCanvas): void {
    if (this.props.picture) {
      canvas.save();
      canvas.scale(pd, pd);
      canvas.drawPicture(this.props.picture);
      canvas.restore();
    }
  }
}
