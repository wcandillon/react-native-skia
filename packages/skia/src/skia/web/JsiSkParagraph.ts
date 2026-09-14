import type { CanvasKit, Paragraph } from "canvaskit-wasm";

import type {
  SkRect,
  SkRectWithDirection,
  SkParagraph,
  SkPath,
  LineMetrics,
  ParagraphExtendedVisitor,
} from "../types";

import { HostObject, throwNotImplementedOnRNWeb } from "./Host";
import type { JsiSkCanvas } from "./JsiSkCanvas";
import { JsiSkRect } from "./JsiSkRect";

export class JsiSkParagraph
  extends HostObject<Paragraph, "Paragraph">
  implements SkParagraph
{
  constructor(CanvasKit: CanvasKit, ref: Paragraph) {
    super(CanvasKit, ref, "Paragraph");
  }
  getMinIntrinsicWidth() {
    return this.ref.getMinIntrinsicWidth();
  }

  getMaxIntrinsicWidth() {
    return this.ref.getMaxIntrinsicWidth();
  }

  getLongestLine() {
    return this.ref.getLongestLine();
  }

  layout(width: number) {
    this.ref.layout(width);
  }
  paint(canvas: JsiSkCanvas, x: number, y: number) {
    canvas.ref.drawParagraph(this.ref, x, y);
  }
  getHeight() {
    return this.ref.getHeight();
  }
  getMaxWidth() {
    return this.ref.getMaxWidth();
  }
  getGlyphPositionAtCoordinate(x: number, y: number) {
    return this.ref.getGlyphPositionAtCoordinate(x, y).pos;
  }
  getRectsForPlaceholders(): SkRectWithDirection[] {
    return this.ref.getRectsForPlaceholders().map(({ rect, dir }) => ({
      rect: new JsiSkRect(this.CanvasKit, rect),
      direction: dir.value,
    }));
  }
  getRectsForRange(start: number, end: number): SkRect[] {
    return this.ref
      .getRectsForRange(
        start,
        end,
        { value: 0 } /** kTight */,
        { value: 0 } /** kTight */
      )
      .map(({ rect }) => new JsiSkRect(this.CanvasKit, rect));
  }
  getLineMetrics(): LineMetrics[] {
    return this.ref.getLineMetrics();
  }
  getPath(_lineNumber: number): SkPath | null {
    return throwNotImplementedOnRNWeb<SkPath | null>();
  }
  extendedVisit(_visitor: ParagraphExtendedVisitor): void {
    return throwNotImplementedOnRNWeb<void>();
  }
}
