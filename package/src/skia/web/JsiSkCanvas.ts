import type { Canvas, CanvasKit } from "canvaskit-wasm";

import type {
  BlendMode,
  ClipOp,
  FilterMode,
  MipmapMode,
  PointMode,
  SaveLayerFlag,
  SkCanvas,
  SkColor,
  SkFont,
  SkImage,
  SkImageFilter,
  SkMatrix,
  SkPaint,
  SkPath,
  SkPicture,
  SkPoint,
  SkRect,
  SkRRect,
  SkSVG,
  SkTextBlob,
  SkVertices,
} from "../types";

import { ckEnum, HostObject } from "./Host";
import { JsiSkPaint } from "./JsiSkPaint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkRRect } from "./JsiSkRRect";
import { JsiSkImage } from "./JsiSkImage";
import { JsiSkVertices } from "./JsiSkVertices";
import { JsiSkPath } from "./JsiSkPath";
import { JsiSkFont } from "./JsiSkFont";
import { JsiSkTextBlob } from "./JsiSkTextBlob";
import { JsiSkPicture } from "./JsiSkPicture";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkImageFilter } from "./JsiSkImageFilter";
import { JsiSkPoint } from "./JsiSkPoint";

export class JsiSkCanvas
  extends HostObject<Canvas, "Canvas">
  implements SkCanvas
{
  constructor(CanvasKit: CanvasKit, ref: Canvas) {
    super(CanvasKit, ref, "Canvas");
  }

  drawRect(rect: SkRect, paint: SkPaint) {
    this.ref.drawRect(
      JsiSkRect.fromValue(this.CanvasKit, rect),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawImage(image: SkImage, x: number, y: number, paint?: SkPaint) {
    this.ref.drawImage(
      JsiSkImage.fromValue(image),
      x,
      y,
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawImageRect(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    paint: SkPaint,
    fastSample?: boolean
  ) {
    this.ref.drawImageRect(
      JsiSkImage.fromValue(img),
      JsiSkRect.fromValue(this.CanvasKit, src),
      JsiSkRect.fromValue(this.CanvasKit, dest),
      JsiSkPaint.fromValue(paint),
      fastSample
    );
  }

  drawImageCubic(
    img: SkImage,
    left: number,
    top: number,
    B: number,
    C: number,
    paint?: SkPaint | null
  ) {
    this.ref.drawImageCubic(
      JsiSkImage.fromValue(img),
      left,
      top,
      B,
      C,
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawImageOptions(
    img: SkImage,
    left: number,
    top: number,
    fm: FilterMode,
    mm: MipmapMode,
    paint?: SkPaint | null
  ) {
    this.ref.drawImageOptions(
      JsiSkImage.fromValue(img),
      left,
      top,
      ckEnum(fm),
      ckEnum(mm),
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawImageNine(
    img: SkImage,
    center: SkRect,
    dest: SkRect,
    filter: FilterMode,
    paint?: SkPaint | null
  ) {
    this.ref.drawImageNine(
      JsiSkImage.fromValue(img),
      Array.from(JsiSkRect.fromValue(this.CanvasKit, center)),
      JsiSkRect.fromValue(this.CanvasKit, dest),
      ckEnum(filter),
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawImageRectCubic(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    B: number,
    C: number,
    paint?: SkPaint | null
  ) {
    this.ref.drawImageRectCubic(
      JsiSkImage.fromValue(img),
      JsiSkRect.fromValue(this.CanvasKit, src),
      JsiSkRect.fromValue(this.CanvasKit, dest),
      B,
      C,
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawImageRectOptions(
    img: SkImage,
    src: SkRect,
    dest: SkRect,
    fm: FilterMode,
    mm: MipmapMode,
    paint?: SkPaint | null
  ) {
    this.ref.drawImageRectOptions(
      JsiSkImage.fromValue(img),
      JsiSkRect.fromValue(this.CanvasKit, src),
      JsiSkRect.fromValue(this.CanvasKit, dest),
      ckEnum(fm),
      ckEnum(mm),
      paint ? JsiSkPaint.fromValue(paint) : paint
    );
  }

  drawPaint(paint: SkPaint) {
    this.ref.drawPaint(JsiSkPaint.fromValue(paint));
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, paint: SkPaint) {
    this.ref.drawLine(x0, y0, x1, y1, JsiSkPaint.fromValue(paint));
  }

  drawCircle(cx: number, cy: number, radius: number, paint: SkPaint) {
    this.ref.drawCircle(cx, cy, radius, JsiSkPaint.fromValue(paint));
  }

  drawVertices(verts: SkVertices, mode: BlendMode, paint: SkPaint) {
    this.ref.drawVertices(
      JsiSkVertices.fromValue(verts),
      ckEnum(mode),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawPatch(
    cubics: SkPoint[],
    colors?: SkColor[] | null,
    texs?: SkPoint[] | null,
    mode?: BlendMode | null,
    paint?: SkPaint
  ) {
    this.ref.drawPatch(
      cubics.map(({ x, y }) => [x, y]).flat(),
      colors,
      texs ? texs.flatMap((p) => Array.from(JsiSkPoint.fromValue(p))) : texs,
      mode ? ckEnum(mode) : null,
      paint ? JsiSkPaint.fromValue(paint) : undefined
    );
  }

  restoreToCount(saveCount: number) {
    this.ref.restoreToCount(saveCount);
  }

  drawPoints(mode: PointMode, points: SkPoint[], paint: SkPaint) {
    this.ref.drawPoints(
      ckEnum(mode),
      points.map(({ x, y }) => [x, y]).flat(),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawArc(
    oval: SkRect,
    startAngle: number,
    sweepAngle: number,
    useCenter: boolean,
    paint: SkPaint
  ) {
    this.ref.drawArc(
      JsiSkRect.fromValue(this.CanvasKit, oval),
      startAngle,
      sweepAngle,
      useCenter,
      JsiSkPaint.fromValue(paint)
    );
  }

  drawRRect(rrect: SkRRect, paint: SkPaint) {
    this.ref.drawRRect(
      JsiSkRRect.fromValue(this.CanvasKit, rrect),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawDRRect(outer: SkRRect, inner: SkRRect, paint: SkPaint) {
    this.ref.drawDRRect(
      JsiSkRRect.fromValue(this.CanvasKit, outer),
      JsiSkRRect.fromValue(this.CanvasKit, inner),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawOval(oval: SkRect, paint: SkPaint) {
    this.ref.drawOval(
      JsiSkRect.fromValue(this.CanvasKit, oval),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawPath(path: SkPath, paint: SkPaint) {
    this.ref.drawPath(JsiSkPath.fromValue(path), JsiSkPaint.fromValue(paint));
  }

  drawText(str: string, x: number, y: number, paint: SkPaint, font: SkFont) {
    this.ref.drawText(
      str,
      x,
      y,
      JsiSkPaint.fromValue(paint),
      JsiSkFont.fromValue(font)
    );
  }

  drawTextBlob(blob: SkTextBlob, x: number, y: number, paint: SkPaint) {
    this.ref.drawTextBlob(
      JsiSkTextBlob.fromValue(blob),
      x,
      y,
      JsiSkPaint.fromValue(paint)
    );
  }

  drawGlyphs(
    glyphs: number[],
    positions: SkPoint[],
    x: number,
    y: number,
    font: SkFont,
    paint: SkPaint
  ) {
    this.ref.drawGlyphs(
      glyphs,
      positions.map((p) => [p.x, p.y]).flat(),
      x,
      y,
      JsiSkFont.fromValue(font),
      JsiSkPaint.fromValue(paint)
    );
  }

  drawSvg(_svgDom: SkSVG, _width?: number, _height?: number) {
    throw new Error("drawSvg is not implemented on React Native Web");
  }

  save() {
    return this.ref.save();
  }

  saveLayer(
    paint?: SkPaint,
    bounds?: SkRect | null,
    backdrop?: SkImageFilter | null,
    flags?: SaveLayerFlag
  ) {
    return this.ref.saveLayer(
      paint ? JsiSkPaint.fromValue(paint) : undefined,
      bounds ? JsiSkRect.fromValue(this.CanvasKit, bounds) : bounds,
      backdrop ? JsiSkImageFilter.fromValue(backdrop) : backdrop,
      flags
    );
  }

  restore() {
    this.ref.restore();
  }

  rotate(rotationInDegrees: number, rx: number, ry: number) {
    this.ref.rotate(rotationInDegrees, rx, ry);
  }

  scale(sx: number, sy: number) {
    this.ref.scale(sx, sy);
  }

  skew(sx: number, sy: number) {
    this.ref.skew(sx, sy);
  }

  translate(dx: number, dy: number) {
    this.ref.translate(dx, dy);
  }

  drawColor(color: SkColor, blendMode?: BlendMode) {
    this.ref.drawColor(color, blendMode ? ckEnum(blendMode) : undefined);
  }

  clear(color: SkColor) {
    this.ref.clear(color);
  }

  clipPath(path: SkPath, op: ClipOp, doAntiAlias: boolean) {
    this.ref.clipPath(JsiSkPath.fromValue(path), ckEnum(op), doAntiAlias);
  }

  clipRect(rect: SkRect, op: ClipOp, doAntiAlias: boolean) {
    this.ref.clipRect(
      JsiSkRect.fromValue(this.CanvasKit, rect),
      ckEnum(op),
      doAntiAlias
    );
  }

  clipRRect(rrect: SkRRect, op: ClipOp, doAntiAlias: boolean) {
    this.ref.clipRRect(
      JsiSkRRect.fromValue(this.CanvasKit, rrect),
      ckEnum(op),
      doAntiAlias
    );
  }

  concat(m: SkMatrix) {
    this.ref.concat(JsiSkMatrix.fromValue(m));
  }

  drawPicture(skp: SkPicture) {
    this.ref.drawPicture(JsiSkPicture.fromValue(skp));
  }
}
