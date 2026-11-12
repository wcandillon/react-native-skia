import type {
  Canvas,
  CanvasKit,
  Image,
  Paint,
  Shader,
  Vertices,
} from "canvaskit-wasm";

import type {
  ShapeBlobOptions,
  SkColor,
  SkRect,
  SkRRect,
  SkShapeBlob,
} from "../types";

import { Host } from "./Host";

// The web implementation of Skia.ShapeBlob, with the semantics of
// cpp/rnskia/RNSkShapeBlob.h: one white sprite per distinct shape in an atlas
// image, one textured quad (six vertices) per shape tinted by its vertex
// color, drawn with one drawVertices call in kModulate.

const Kind = { Rect: 0, RRect: 1, Circle: 2 } as const;
type Kind = (typeof Kind)[keyof typeof Kind];

const VERTICES_PER_SHAPE = 6;
const MIN_SCALE_RATIO = 0.75;
const MAX_SCALE_RATIO = 1.5;
const MAX_SPRITE_PIXELS = 2048;
const ATLAS_ROW_WIDTH = 2048;

interface Sprite {
  kind: Kind;
  width: number;
  height: number;
  rx: number;
  ry: number;
  // Layout at the current raster scale.
  u: number;
  v: number;
  cw: number;
  ch: number;
  left: number;
  top: number;
  marginX: number;
  marginY: number;
}

/** The largest singular value of [a b; c d]: rotation does not change it. */
export const shapeBlobDeviceScale = (
  a: number,
  b: number,
  c: number,
  d: number
) => {
  const s = a * a + b * b + c * c + d * d;
  const det = a * d - b * c;
  const disc = Math.max(0, s * s - 4 * det * det);
  return Math.sqrt((s + Math.sqrt(disc)) / 2);
};

/**
 * Coverage of the pixel (px, py) of a cell whose shape occupies
 * [mx, mx + w] x [my, my + h], as in RNSkShapeBlob.h.
 */
export const shapeBlobCoverage = (
  kind: Kind,
  w: number,
  h: number,
  rx: number,
  ry: number,
  mx: number,
  my: number,
  px: number,
  py: number
) => {
  if (w <= 0 || h <= 0) {
    return 0;
  }
  if (kind === Kind.Rect || (kind === Kind.RRect && (rx <= 0 || ry <= 0))) {
    const ox = Math.max(0, Math.min(px + 1, mx + w) - Math.max(px, mx));
    const oy = Math.max(0, Math.min(py + 1, my + h) - Math.max(py, my));
    return Math.min(1, ox * oy);
  }
  const dx = px + 0.5 - (mx + w / 2);
  const dy = py + 0.5 - (my + h / 2);
  let d: number;
  if (kind === Kind.Circle) {
    d = Math.sqrt(dx * dx + dy * dy) - w / 2;
  } else {
    const bx = w / 2;
    const by = h / 2;
    const rrx = Math.min(rx, bx);
    const rry = Math.min(ry, by);
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const kx = bx - rrx;
    const ky = by - rry;
    if (ax > kx && ay > ky) {
      const qx = ax - kx;
      const qy = ay - ky;
      if (rrx === rry) {
        d = Math.sqrt(qx * qx + qy * qy) - rrx;
      } else {
        const f = (qx * qx) / (rrx * rrx) + (qy * qy) / (rry * rry) - 1;
        const gx = (2 * qx) / (rrx * rrx);
        const gy = (2 * qy) / (rry * rry);
        const g = Math.sqrt(gx * gx + gy * gy);
        d = g > 0 ? f / g : -Math.min(rrx, rry);
      }
    } else {
      d = Math.max(ax - bx, ay - by);
    }
  }
  return Math.min(1, Math.max(0, 0.5 - d));
};

// SkColor (unpremultiplied ARGB) from a color in [0, 1], truncated like
// SkColorSetARGB(a * 255, ...) on native.
const colorToInt = (color: SkColor) =>
  ((((color[3] * 255) & 0xff) << 24) |
    (((color[0] * 255) & 0xff) << 16) |
    (((color[1] * 255) & 0xff) << 8) |
    ((color[2] * 255) & 0xff)) >>>
  0;

export class JsiSkShapeBlob extends Host implements SkShapeBlob {
  readonly __typename__ = "ShapeBlob" as const;

  private readonly fixedScale: number;
  private sprites: Sprite[] = [];
  private spriteIds = new Map<string, number>();
  private n = 0;
  private anchors = new Float32Array(0);
  private spriteOf = new Uint32Array(0);
  private positions = new Float32Array(0);
  private texs = new Float32Array(0);
  private colors = new Uint32Array(0);
  private laidOut = false;
  private requestedScale = 0;
  private rasterScale = 0;
  private verticesDirty = true;
  private vertices: Vertices | null = null;
  private image: Image | null = null;
  private shader: Shader | null = null;

  constructor(CanvasKit: CanvasKit, options?: ShapeBlobOptions) {
    super(CanvasKit);
    const scale = options?.rasterScale;
    this.fixedScale = typeof scale === "number" && scale > 0 ? scale : 0;
  }

  get count() {
    return this.n;
  }

  addRect(rect: SkRect, color: SkColor) {
    const x = Math.min(rect.x, rect.x + rect.width);
    const y = Math.min(rect.y, rect.y + rect.height);
    return this.add(
      Kind.Rect,
      x,
      y,
      Math.abs(rect.width),
      Math.abs(rect.height),
      0,
      0,
      color
    );
  }

  addRRect(rrect: SkRRect, color: SkColor) {
    const { rect } = rrect;
    const x = Math.min(rect.x, rect.x + rect.width);
    const y = Math.min(rect.y, rect.y + rect.height);
    return this.add(
      Kind.RRect,
      x,
      y,
      Math.abs(rect.width),
      Math.abs(rect.height),
      rrect.rx,
      rrect.ry,
      color
    );
  }

  addCircle(cx: number, cy: number, r: number, color: SkColor) {
    const d = 2 * Math.max(0, r);
    return this.add(Kind.Circle, cx, cy, d, d, 0, 0, color);
  }

  setPosition(index: number, x: number, y: number) {
    this.checkIndex(index, "setPosition");
    this.anchors[index * 2] = x;
    this.anchors[index * 2 + 1] = y;
    if (this.laidOut) {
      this.writePositions(index);
    }
    this.verticesDirty = true;
  }

  setColor(index: number, color: SkColor) {
    this.checkIndex(index, "setColor");
    const at = index * VERTICES_PER_SHAPE;
    this.colors.fill(colorToInt(color), at, at + VERTICES_PER_SHAPE);
    this.verticesDirty = true;
  }

  /** Draws every shape with one drawVertices call (canvas.drawShapes). */
  draw(canvas: Canvas, paint: Paint | null) {
    if (this.n === 0) {
      return;
    }
    const m = canvas.getLocalToDevice();
    const perspective = m[12] !== 0 || m[13] !== 0 || m[15] !== 1;
    const deviceScale = perspective
      ? -1
      : shapeBlobDeviceScale(m[0], m[1], m[4], m[5]);
    const scale = this.scaleToRasterize(deviceScale);
    if (scale > 0 || this.shader === null) {
      this.rasterize(scale > 0 ? scale : this.rasterScale || 1);
    }
    if (this.verticesDirty || this.vertices === null) {
      this.vertices?.delete();
      const count = this.n * VERTICES_PER_SHAPE;
      this.vertices = this.CanvasKit.MakeVertices(
        this.CanvasKit.VertexMode.Triangles,
        this.positions.subarray(0, count * 2),
        this.texs.subarray(0, count * 2),
        this.colors.subarray(0, count)
      );
      this.verticesDirty = false;
    }
    const p = paint ? paint.copy() : new this.CanvasKit.Paint();
    p.setStyle(this.CanvasKit.PaintStyle.Fill);
    p.setPathEffect(null);
    p.setMaskFilter(null);
    p.setShader(this.shader);
    canvas.drawVertices(this.vertices, this.CanvasKit.BlendMode.Modulate, p);
    p.delete();
  }

  dispose() {
    this[Symbol.dispose]();
  }

  [Symbol.dispose]() {
    this.vertices?.delete();
    this.shader?.delete();
    this.image?.delete();
    this.vertices = null;
    this.shader = null;
    this.image = null;
    this.laidOut = false;
  }

  static fromValue(value: SkShapeBlob) {
    return value as JsiSkShapeBlob;
  }

  private checkIndex(index: number, method: string) {
    if (!(index >= 0 && index < this.n)) {
      throw new RangeError(
        `ShapeBlob.${method}: index ${index} is out of range`
      );
    }
  }

  private add(
    kind: Kind,
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
    color: SkColor
  ) {
    const key = `${kind}:${width}:${height}:${rx}:${ry}`;
    let sprite = this.spriteIds.get(key);
    if (sprite === undefined) {
      sprite = this.sprites.length;
      this.sprites.push({
        kind,
        width,
        height,
        rx,
        ry,
        u: 0,
        v: 0,
        cw: 0,
        ch: 0,
        left: 0,
        top: 0,
        marginX: 0,
        marginY: 0,
      });
      this.spriteIds.set(key, sprite);
      // A new sprite needs a new atlas.
      this.laidOut = false;
    }
    const index = this.n;
    this.reserve(index + 1);
    this.n++;
    this.anchors[index * 2] = x;
    this.anchors[index * 2 + 1] = y;
    this.spriteOf[index] = sprite;
    const at = index * VERTICES_PER_SHAPE;
    this.colors.fill(colorToInt(color), at, at + VERTICES_PER_SHAPE);
    if (this.laidOut) {
      this.writeQuad(index);
    }
    this.verticesDirty = true;
    return index;
  }

  private reserve(count: number) {
    if (count <= this.spriteOf.length) {
      return;
    }
    const capacity = Math.max(count, this.spriteOf.length * 2, 16);
    const grow = <A extends Float32Array | Uint32Array>(
      array: A,
      size: number,
      make: (n: number) => A
    ) => {
      const next = make(size);
      next.set(array);
      return next;
    };
    const vertices = capacity * VERTICES_PER_SHAPE;
    this.anchors = grow(this.anchors, capacity * 2, (s) => new Float32Array(s));
    this.spriteOf = grow(this.spriteOf, capacity, (s) => new Uint32Array(s));
    this.positions = grow(
      this.positions,
      vertices * 2,
      (s) => new Float32Array(s)
    );
    this.texs = grow(this.texs, vertices * 2, (s) => new Float32Array(s));
    this.colors = grow(this.colors, vertices, (s) => new Uint32Array(s));
  }

  private scaleToRasterize(deviceScale: number) {
    let target = this.fixedScale > 0 ? this.fixedScale : deviceScale;
    if (!(target > 0) || !Number.isFinite(target)) {
      if (this.laidOut) {
        return 0;
      }
      target = 1;
    }
    if (!this.laidOut) {
      return target;
    }
    if (this.fixedScale > 0) {
      return 0;
    }
    if (
      target < this.requestedScale * MIN_SCALE_RATIO ||
      target > this.requestedScale * MAX_SCALE_RATIO
    ) {
      return target;
    }
    return 0;
  }

  private rasterize(requestedScale: number) {
    let maxSide = 0;
    for (const s of this.sprites) {
      maxSide = Math.max(maxSide, s.width, s.height);
    }
    let scale = requestedScale;
    if (maxSide * scale > MAX_SPRITE_PIXELS) {
      scale = MAX_SPRITE_PIXELS / maxSide;
    }
    this.requestedScale = requestedScale;
    this.rasterScale = scale;
    // Shelf packing, in insertion order (Math.fround: the native layout is in
    // float).
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let width = 0;
    for (const s of this.sprites) {
      const w = Math.fround(s.width * scale);
      const h = Math.fround(s.height * scale);
      const cw = Math.ceil(w) + 2;
      const ch = Math.ceil(h) + 2;
      if (x > 0 && x + cw > ATLAS_ROW_WIDTH) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      s.u = x;
      s.v = y;
      s.cw = cw;
      s.ch = ch;
      s.marginX = (cw - w) / 2;
      s.marginY = (ch - h) / 2;
      s.left = s.kind === Kind.Circle ? -cw / 2 / scale : -s.marginX / scale;
      s.top = s.kind === Kind.Circle ? -ch / 2 / scale : -s.marginY / scale;
      x += cw;
      rowHeight = Math.max(rowHeight, ch);
      width = Math.max(width, x);
    }
    const atlasWidth = Math.max(width, 1);
    const atlasHeight = Math.max(y + rowHeight, 1);
    const pixels = new Uint8Array(atlasWidth * atlasHeight * 4);
    for (const s of this.sprites) {
      const w = Math.fround(s.width * scale);
      const h = Math.fround(s.height * scale);
      for (let py = 0; py < s.ch; py++) {
        for (let px = 0; px < s.cw; px++) {
          const cov = shapeBlobCoverage(
            s.kind,
            w,
            h,
            s.rx * scale,
            s.ry * scale,
            s.marginX,
            s.marginY,
            px,
            py
          );
          const value = Math.round(cov * 255);
          const at = ((s.v + py) * atlasWidth + s.u + px) * 4;
          pixels[at] = value;
          pixels[at + 1] = value;
          pixels[at + 2] = value;
          pixels[at + 3] = value;
        }
      }
    }
    this.shader?.delete();
    this.image?.delete();
    this.image = this.CanvasKit.MakeImage(
      {
        width: atlasWidth,
        height: atlasHeight,
        alphaType: this.CanvasKit.AlphaType.Premul,
        colorType: this.CanvasKit.ColorType.RGBA_8888,
        colorSpace: this.CanvasKit.ColorSpace.SRGB,
      },
      pixels,
      atlasWidth * 4
    );
    this.shader =
      this.image?.makeShaderOptions(
        this.CanvasKit.TileMode.Clamp,
        this.CanvasKit.TileMode.Clamp,
        this.CanvasKit.FilterMode.Linear,
        this.CanvasKit.MipmapMode.None
      ) ?? null;
    this.laidOut = true;
    for (let i = 0; i < this.n; i++) {
      this.writeQuad(i);
    }
    this.verticesDirty = true;
  }

  // Direct writes: setPosition runs per frame and must not allocate.
  private writePositions(index: number) {
    const s = this.sprites[this.spriteOf[index]];
    const l = this.anchors[index * 2] + s.left;
    const t = this.anchors[index * 2 + 1] + s.top;
    const r = l + s.cw / this.rasterScale;
    const b = t + s.ch / this.rasterScale;
    writeTriangles(this.positions, index * VERTICES_PER_SHAPE * 2, l, t, r, b);
  }

  private writeQuad(index: number) {
    this.writePositions(index);
    const s = this.sprites[this.spriteOf[index]];
    writeTriangles(
      this.texs,
      index * VERTICES_PER_SHAPE * 2,
      s.u,
      s.v,
      s.u + s.cw,
      s.v + s.ch
    );
  }
}

// The quad (l, t, r, b) as the triangles (0, 1, 2) and (0, 2, 3).
const writeTriangles = (
  out: Float32Array,
  at: number,
  l: number,
  t: number,
  r: number,
  b: number
) => {
  out[at] = l;
  out[at + 1] = t;
  out[at + 2] = r;
  out[at + 3] = t;
  out[at + 4] = r;
  out[at + 5] = b;
  out[at + 6] = l;
  out[at + 7] = t;
  out[at + 8] = r;
  out[at + 9] = b;
  out[at + 10] = l;
  out[at + 11] = b;
};
