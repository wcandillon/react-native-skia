import {
  deflate,
  enumKey,
  fitRects,
  inflate,
  NodeType,
  processCircle,
  processPath,
  processRect,
  processRRect,
} from "../../dom/nodes";
import type {
  AtlasProps,
  BoxProps,
  BoxShadowProps,
  CircleProps,
  DiffRectProps,
  DrawingNodeProps,
  GlyphsProps,
  ImageProps,
  ImageSVGProps,
  LineProps,
  OvalProps,
  ParagraphProps,
  PatchProps,
  PathProps,
  PictureProps,
  PointsProps,
  RectProps,
  RoundedRectProps,
  TextBlobProps,
  TextPathProps,
  TextProps,
  VerticesProps,
} from "../../dom/types";
import { saturate } from "../../renderer/processors";
import type {
  SkCanvas,
  SkPaint,
  SkPoint,
  SkRSXform,
  Skia,
} from "../../skia/types";
import {
  BlendMode,
  BlurStyle,
  ClipOp,
  FillType,
  isRRect,
  PointMode,
  VertexMode,
} from "../../skia/types";

import type { Node } from "./Node";
import { materialize } from "./utils";

interface LocalDrawingContext {
  Skia: Skia;
  canvas: SkCanvas;
  paint: SkPaint;
}

export const drawLine = (ctx: LocalDrawingContext, props: LineProps) => {
  "worklet";
  const { p1, p2 } = props;
  ctx.canvas.drawLine(p1.x, p1.y, p2.x, p2.y, ctx.paint);
};

export const drawOval = (ctx: LocalDrawingContext, props: OvalProps) => {
  "worklet";
  const rect = processRect(ctx.Skia, props);
  ctx.canvas.drawOval(rect, ctx.paint);
};

export const drawBox = (
  ctx: LocalDrawingContext,
  props: BoxProps,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: Node<any>[]
) => {
  "worklet";
  const { paint, Skia, canvas } = ctx;
  const { box: defaultBox } = props;
  const opacity = paint.getAlphaf();
  const box = isRRect(defaultBox) ? defaultBox : Skia.RRectXY(defaultBox, 0, 0);
  const shadows = children
    .map((node) => {
      if (node.type === NodeType.BoxShadow) {
        return materialize(node).props;
      }
      return null;
    })
    .filter((n): n is BoxShadowProps => n !== null);
  shadows
    .filter((shadow) => !shadow.inner)
    .map((shadow) => {
      const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
      const lPaint = Skia.Paint();
      lPaint.setColor(Skia.Color(color));
      lPaint.setAlphaf(paint.getAlphaf() * opacity);
      lPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
      );
      canvas.drawRRect(inflate(Skia, box, spread, spread, dx, dy), lPaint);
    });

  canvas.drawRRect(box, paint);

  shadows
    .filter((shadow) => shadow.inner)
    .map((shadow) => {
      const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
      const delta = Skia.Point(10 + Math.abs(dx), 10 + Math.abs(dy));
      canvas.save();
      canvas.clipRRect(box, ClipOp.Intersect, false);
      const lPaint = Skia.Paint();
      lPaint.setColor(Skia.Color(color));
      lPaint.setAlphaf(paint.getAlphaf() * opacity);

      lPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
      );
      const inner = deflate(Skia, box, spread, spread, dx, dy);
      const outer = inflate(Skia, box, delta.x, delta.y);
      canvas.drawDRRect(outer, inner, lPaint);
      canvas.restore();
    });
};

export const drawImage = (ctx: LocalDrawingContext, props: ImageProps) => {
  "worklet";
  const { image } = props;
  if (image) {
    const fit = props.fit ?? "contain";
    const rect = processRect(ctx.Skia, props);
    const { src, dst } = fitRects(
      fit,
      {
        x: 0,
        y: 0,
        width: image.width(),
        height: image.height(),
      },
      rect
    );
    ctx.canvas.drawImageRect(image, src, dst, ctx.paint);
  }
};

export const drawPoints = (ctx: LocalDrawingContext, props: PointsProps) => {
  "worklet";
  const { points, mode } = props;
  ctx.canvas.drawPoints(PointMode[enumKey(mode)], points, ctx.paint);
};

export const drawVertices = (
  ctx: LocalDrawingContext,
  props: VerticesProps
) => {
  "worklet";
  const { mode, textures, colors, indices, blendMode } = props;
  const vertexMode = mode ? VertexMode[enumKey(mode)] : VertexMode.Triangles;
  const vertices = ctx.Skia.MakeVertices(
    vertexMode,
    props.vertices,
    textures,
    colors ? colors.map((c) => ctx.Skia.Color(c)) : undefined,
    indices
  );
  const defaultBlendMode = colors ? BlendMode.DstOver : BlendMode.SrcOver;
  const blend = blendMode ? BlendMode[enumKey(blendMode)] : defaultBlendMode;

  ctx.canvas.drawVertices(vertices, blend, ctx.paint);
};

export const drawDiffRect = (
  ctx: LocalDrawingContext,
  props: DiffRectProps
) => {
  "worklet";
  const { outer, inner } = props;
  ctx.canvas.drawDRRect(outer, inner, ctx.paint);
};

export const drawTextPath = (
  ctx: LocalDrawingContext,
  props: TextPathProps
) => {
  "worklet";
  const path = processPath(ctx.Skia, props.path);
  const { font, initialOffset } = props;
  if (font) {
    let { text } = props;
    const ids = font.getGlyphIDs(text);
    const widths = font.getGlyphWidths(ids);
    const rsx: SkRSXform[] = [];
    const meas = ctx.Skia.ContourMeasureIter(path, false, 1);
    let cont = meas.next();
    let dist = initialOffset;
    for (let i = 0; i < text.length && cont; i++) {
      const width = widths[i];
      dist += width / 2;
      if (dist > cont.length()) {
        // jump to next contour
        cont = meas.next();
        if (!cont) {
          // We have come to the end of the path - terminate the string
          // right here.
          text = text.substring(0, i);
          break;
        }
        dist = width / 2;
      }
      // Gives us the (x, y) coordinates as well as the cos/sin of the tangent
      // line at that position.
      const [p, t] = cont.getPosTan(dist);
      const adjustedX = p.x - (width / 2) * t.x;
      const adjustedY = p.y - (width / 2) * t.y;
      rsx.push(ctx.Skia.RSXform(t.x, t.y, adjustedX, adjustedY));
      dist += width / 2;
    }
    const derived = ctx.Skia.TextBlob.MakeFromRSXform(text, rsx, font);
    ctx.canvas.drawTextBlob(derived, 0, 0, ctx.paint);
  }
};

export const drawText = (ctx: LocalDrawingContext, props: TextProps) => {
  "worklet";
  const { text, x, y, font } = props;
  if (font != null) {
    ctx.canvas.drawText(text, x, y, ctx.paint, font);
  }
};

export const drawPatch = (ctx: LocalDrawingContext, props: PatchProps) => {
  "worklet";
  const { texture, blendMode, patch } = props;
  const defaultBlendMode = props.colors ? BlendMode.DstOver : BlendMode.SrcOver;
  const mode = blendMode ? BlendMode[enumKey(blendMode)] : defaultBlendMode;
  // Patch requires a path with the following constraints:
  // M tl
  // C c1 c2 br
  // C c1 c2 bl
  // C c1 c2 tl (the redundant point in the last command is removed)

  const points = [
    patch[0].pos,
    patch[0].c2,
    patch[1].c1,
    patch[1].pos,
    patch[1].c2,
    patch[2].c1,
    patch[2].pos,
    patch[2].c2,
    patch[3].c1,
    patch[3].pos,
    patch[3].c2,
    patch[0].c1,
  ];
  const colors = props.colors
    ? props.colors.map((c) => ctx.Skia.Color(c))
    : undefined;
  ctx.canvas.drawPatch(points, colors, texture, mode, ctx.paint);
};

export const drawPath = (ctx: LocalDrawingContext, props: PathProps) => {
  "worklet";
  const {
    start: trimStart,
    end: trimEnd,
    fillType,
    stroke,
    ...pathProps
  } = props;
  const start = saturate(trimStart);
  const end = saturate(trimEnd);
  const hasStartOffset = start !== 0;
  const hasEndOffset = end !== 1;
  const hasStrokeOptions = stroke !== undefined;
  const hasFillType = !!fillType;
  const willMutatePath =
    hasStartOffset || hasEndOffset || hasStrokeOptions || hasFillType;
  const pristinePath = processPath(ctx.Skia, pathProps.path);
  const path = willMutatePath ? pristinePath.copy() : pristinePath;
  if (hasFillType) {
    path.setFillType(FillType[enumKey(fillType)]);
  }
  if (hasStrokeOptions) {
    path.stroke(stroke);
  }
  if (hasStartOffset || hasEndOffset) {
    path.trim(start, end, false);
  }
  ctx.canvas.drawPath(path, ctx.paint);
};

export const drawRect = (ctx: LocalDrawingContext, props: RectProps) => {
  "worklet";
  const derived = processRect(ctx.Skia, props);
  ctx.canvas.drawRect(derived, ctx.paint);
};

export const drawRRect = (
  ctx: LocalDrawingContext,
  props: RoundedRectProps
) => {
  "worklet";
  const derived = processRRect(ctx.Skia, props);
  ctx.canvas.drawRRect(derived, ctx.paint);
};

export const drawTextBlob = (
  ctx: LocalDrawingContext,
  props: TextBlobProps
) => {
  "worklet";
  const { blob, x, y } = props;
  ctx.canvas.drawTextBlob(blob, x, y, ctx.paint);
};

interface ProcessedGlyphs {
  glyphs: number[];
  positions: SkPoint[];
}

export const drawGlyphs = (ctx: LocalDrawingContext, props: GlyphsProps) => {
  "worklet";
  const derived = props.glyphs.reduce<ProcessedGlyphs>(
    (acc, glyph) => {
      const { id, pos } = glyph;
      acc.glyphs.push(id);
      acc.positions.push(pos);
      return acc;
    },
    { glyphs: [], positions: [] }
  );
  const { glyphs, positions } = derived;
  const { x, y, font } = props;
  if (font) {
    ctx.canvas.drawGlyphs(glyphs, positions, x, y, font, ctx.paint);
  }
};

export const drawImageSVG = (
  ctx: LocalDrawingContext,
  props: ImageSVGProps
) => {
  "worklet";
  const { canvas } = ctx;
  const { svg } = props;
  const { x, y, width, height } = props.rect
    ? props.rect
    : { x: props.x, y: props.y, width: props.width, height: props.height };
  if (svg === null) {
    return;
  }
  canvas.save();
  if (x && y) {
    canvas.translate(x, y);
  }
  canvas.drawSvg(svg, width, height);
  canvas.restore();
};

export const drawParagraph = (
  ctx: LocalDrawingContext,
  props: ParagraphProps
) => {
  "worklet";
  const { paragraph, x, y, width } = props;
  if (paragraph) {
    paragraph.layout(width);
    paragraph.paint(ctx.canvas, x, y);
  }
};

export const drawPicture = (ctx: LocalDrawingContext, props: PictureProps) => {
  "worklet";
  const { picture } = props;
  ctx.canvas.drawPicture(picture);
};

export const drawAtlas = (ctx: LocalDrawingContext, props: AtlasProps) => {
  "worklet";
  const { image, sprites, transforms, colors, blendMode } = props;
  const blend = blendMode ? BlendMode[enumKey(blendMode)] : undefined;
  if (image) {
    ctx.canvas.drawAtlas(image, sprites, transforms, ctx.paint, blend, colors);
  }
};

export const drawCircle = (ctx: LocalDrawingContext, props: CircleProps) => {
  "worklet";
  const { c } = processCircle(props);
  const { r } = props;
  ctx.canvas.drawCircle(c.x, c.y, r, ctx.paint);
};

export const drawFill = (
  ctx: LocalDrawingContext,
  _props: DrawingNodeProps
) => {
  "worklet";
  ctx.canvas.drawPaint(ctx.paint);
};
