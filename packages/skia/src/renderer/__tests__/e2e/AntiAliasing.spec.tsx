import { checkImage } from "../../../__tests__/setup";
import {
  AlphaType,
  ColorType,
  FilterMode,
  MipmapMode,
  PaintStyle,
  StrokeCap,
} from "../../../skia/types";
import { surface } from "../setup";

// Draws a shape anti-aliased on a small offscreen surface, then magnifies the
// result with nearest-neighbor sampling and overlays a grid where each cell
// matches one source pixel. This makes the AA coverage values at the shape
// edges directly visible, using Skia as the reference implementation.
const SRC_SIZE = 32;
const ZOOM = 8;

// The drawOffscreen callbacks are self-contained (no closures over helpers)
// because they get serialized when the test runs against a device.
const magnifyCtx = {
  size: SRC_SIZE,
  zoom: ZOOM,
  nearest: FilterMode.Nearest,
  noMipmap: MipmapMode.None,
  stroke: PaintStyle.Stroke,
  roundCap: StrokeCap.Round,
  rgba8888: ColorType.RGBA_8888,
  opaque: AlphaType.Opaque,
};

// Ground truth: the exact box-filter integral of a union of disks. The
// intersection of a disk with a vertical line is a closed-form interval, so
// coverage is integrated exactly in y (interval union merging) and only
// discretized in x with midpoint sampling; the numerical error is well below
// one 8-bit gray level. A stroked curve with round caps is exactly the
// Minkowski sum of the curve with a disk, i.e. a union of disks densely
// sampled along the curve.
const LINES_PER_COLUMN = 256;

const exactUnionCoverage = (
  disks: { x: number; y: number; r: number }[],
  size: number
) => {
  const cov = new Float64Array(size * size);
  for (let col = 0; col < size; col++) {
    const candidates = disks.filter(
      (d) => d.x - d.r < col + 1 && d.x + d.r > col
    );
    if (candidates.length === 0) {
      continue;
    }
    for (let k = 0; k < LINES_PER_COLUMN; k++) {
      const x = col + (k + 0.5) / LINES_PER_COLUMN;
      const intervals: [number, number][] = [];
      for (const d of candidates) {
        const t = d.r * d.r - (x - d.x) * (x - d.x);
        if (t > 0) {
          const s = Math.sqrt(t);
          intervals.push([d.y - s, d.y + s]);
        }
      }
      if (intervals.length === 0) {
        continue;
      }
      intervals.sort((a, b) => a[0] - b[0]);
      const add = (a: number, b: number) => {
        const j0 = Math.max(0, Math.floor(a));
        const j1 = Math.min(size - 1, Math.ceil(b) - 1);
        for (let j = j0; j <= j1; j++) {
          const seg = Math.min(b, j + 1) - Math.max(a, j);
          if (seg > 0) {
            cov[j * size + col] += seg;
          }
        }
      };
      let [lo, hi] = intervals[0];
      for (let m = 1; m < intervals.length; m++) {
        const [ilo, ihi] = intervals[m];
        if (ilo <= hi) {
          hi = Math.max(hi, ihi);
        } else {
          add(lo, hi);
          lo = ilo;
          hi = ihi;
        }
      }
      add(lo, hi);
    }
  }
  const bytes = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(255 * (1 - cov[i] / LINES_PER_COLUMN));
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }
  return Array.from(bytes);
};

describe("Anti-aliasing", () => {
  it("should magnify an anti-aliased circle 8x with a pixel grid", async () => {
    const image = await surface.drawOffscreen((Skia, canvas, ctx) => {
      const draw = (c: typeof canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setColor(Skia.Color("black"));
        c.drawCircle(ctx.size / 2, ctx.size / 2, ctx.size / 2 - 3, paint);
      };
      const src = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.clear(Skia.Color("white"));
      draw(srcCanvas);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      const dstSize = ctx.size * ctx.zoom;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(0, 0, ctx.size, ctx.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        ctx.nearest,
        ctx.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(ctx.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= ctx.size; i++) {
        const p = i * ctx.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, magnifyCtx);
    checkImage(image, "snapshots/aa/circle-8x.png");
  });

  it("should magnify an anti-aliased bezier curve 8x with a pixel grid", async () => {
    const image = await surface.drawOffscreen((Skia, canvas, ctx) => {
      const draw = (c: typeof canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setColor(Skia.Color("black"));
        paint.setStyle(ctx.stroke);
        paint.setStrokeWidth(2);
        // Round caps to match the SDF version, where the distance to the
        // curve naturally produces round caps at the endpoints
        paint.setStrokeCap(ctx.roundCap);
        const path = Skia.PathBuilder.Make()
          .moveTo(2, 28)
          .cubicTo(8, -8, 24, 40, 30, 4)
          .detach();
        c.drawPath(path, paint);
      };
      const src = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.clear(Skia.Color("white"));
      draw(srcCanvas);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      const dstSize = ctx.size * ctx.zoom;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(0, 0, ctx.size, ctx.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        ctx.nearest,
        ctx.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(ctx.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= ctx.size; i++) {
        const p = i * ctx.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, magnifyCtx);
    checkImage(image, "snapshots/aa/bezier-8x.png");
  });

  // SDF versions of the same two shapes, rendered with a runtime shader.
  // Coverage is derived from the signed distance and the SDF gradient with a
  // linear ramp (analytic box-filter coverage of a straight edge crossing the
  // pixel): clamp(0.5 - sdf * gradLen, 0, 1). Both SDFs are exact distances
  // in pixel space, so gradLen is 1 and the transition spans one pixel.
  it("should magnify an SDF-shaded circle 8x with a pixel grid", async () => {
    const image = await surface.drawOffscreen((Skia, canvas, ctx) => {
      const effect = Skia.RuntimeEffect.Make(`
const float2 c = float2(16.0, 16.0);
const float r = 13.0;

half4 main(float2 p) {
  float2 d = p - c;
  float len = length(d);
  float sdf = len - r;
  float2 grad = len > 0.0 ? d / len : float2(0.0);
  float gradLen = length(grad);
  float coverage = gradLen == 0.0
    ? (sdf > 0.0 ? 0.0 : 1.0)
    : clamp(0.5 - sdf * gradLen, 0.0, 1.0);
  return half4(half3(1.0 - coverage), 1.0);
}`)!;
      const paint = Skia.Paint();
      paint.setShader(effect.makeShader([]));
      const src = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.drawPaint(paint);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      const dstSize = ctx.size * ctx.zoom;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(0, 0, ctx.size, ctx.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        ctx.nearest,
        ctx.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(ctx.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= ctx.size; i++) {
        const p = i * ctx.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, magnifyCtx);
    checkImage(image, "snapshots/aa/circle-sdf-8x.png");
  });

  // Same circle SDF, but coverage is estimated by supersampling: a hard
  // inside/outside test at NxN stratified sub-pixel positions, averaged.
  // This converges to the true box-filter area coverage as N grows, so it
  // acts as ground truth to judge both Skia's analytic coverage and the
  // linear ramp approximation.
  it("should magnify a supersampled SDF circle 8x with a pixel grid", async () => {
    for (const ss of [4, 8]) {
      const image = await surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          const effect = Skia.RuntimeEffect.Make(`
const float2 c = float2(16.0, 16.0);
const float r = 13.0;

half4 main(float2 p) {
  float cov = 0.0;
  for (int i = 0; i < ${ctx.ss}; i++) {
    for (int j = 0; j < ${ctx.ss}; j++) {
      float2 o = (float2(float(i), float(j)) + 0.5) / ${ctx.ss}.0 - 0.5;
      float sdf = length(p + o - c) - r;
      cov += sdf <= 0.0 ? 1.0 : 0.0;
    }
  }
  cov /= ${ctx.ss * ctx.ss}.0;
  return half4(half3(1.0 - cov), 1.0);
}`)!;
          const paint = Skia.Paint();
          paint.setShader(effect.makeShader([]));
          const src = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
          const srcCanvas = src.getCanvas();
          srcCanvas.drawPaint(paint);
          src.flush();
          const snapshot = src.makeImageSnapshot();
          const dstSize = ctx.size * ctx.zoom;
          canvas.drawImageRectOptions(
            snapshot,
            Skia.XYWHRect(0, 0, ctx.size, ctx.size),
            Skia.XYWHRect(0, 0, dstSize, dstSize),
            ctx.nearest,
            ctx.noMipmap
          );
          const grid = Skia.Paint();
          grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
          grid.setStyle(ctx.stroke);
          grid.setStrokeWidth(0);
          grid.setAntiAlias(false);
          for (let i = 0; i <= ctx.size; i++) {
            const p = i * ctx.zoom;
            canvas.drawLine(p, 0, p, dstSize, grid);
            canvas.drawLine(0, p, dstSize, p, grid);
          }
        },
        { ...magnifyCtx, ss }
      );
      checkImage(image, `snapshots/aa/circle-sdf-ss${ss}-8x.png`);
    }
  });

  it("should build the exact box-filter coverage for the circle", async () => {
    const bytes = exactUnionCoverage([{ x: 16, y: 16, r: 13 }], SRC_SIZE);
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const data = Skia.Data.fromBytes(new Uint8Array(ctx.bytes));
        const exact = Skia.Image.MakeImage(
          {
            width: ctx.size,
            height: ctx.size,
            colorType: ctx.rgba8888,
            alphaType: ctx.opaque,
          },
          data,
          ctx.size * 4
        )!;
        const dstSize = ctx.size * ctx.zoom;
        canvas.drawImageRectOptions(
          exact,
          Skia.XYWHRect(0, 0, ctx.size, ctx.size),
          Skia.XYWHRect(0, 0, dstSize, dstSize),
          ctx.nearest,
          ctx.noMipmap
        );
        const grid = Skia.Paint();
        grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
        grid.setStyle(ctx.stroke);
        grid.setStrokeWidth(0);
        grid.setAntiAlias(false);
        for (let i = 0; i <= ctx.size; i++) {
          const p = i * ctx.zoom;
          canvas.drawLine(p, 0, p, dstSize, grid);
          canvas.drawLine(0, p, dstSize, p, grid);
        }
      },
      { ...magnifyCtx, bytes }
    );
    checkImage(image, "snapshots/aa/circle-exact-8x.png");
  });

  it("should build the exact box-filter coverage for the bezier curve", async () => {
    // Same cubic as the other bezier tests, stroke width 2, round caps. The
    // stroke region is the union of radius-1 disks centered on the curve;
    // disks are emitted at even arc-length steps small enough that the
    // scalloping error is far below one gray level.
    const A = { x: 2, y: 28 };
    const B = { x: 8, y: -8 };
    const C = { x: 24, y: 40 };
    const D = { x: 30, y: 4 };
    const cubic = (t: number) => {
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      return {
        x: a * A.x + b * B.x + c * C.x + d * D.x,
        y: a * A.y + b * B.y + c * C.y + d * D.y,
      };
    };
    const DS = 0.05;
    const M = 20000;
    const disks: { x: number; y: number; r: number }[] = [];
    let prev = cubic(0);
    let acc = 0;
    disks.push({ ...prev, r: 1 });
    for (let i = 1; i <= M; i++) {
      const pt = cubic(i / M);
      acc += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      prev = pt;
      if (acc >= DS || i === M) {
        disks.push({ ...pt, r: 1 });
        acc = 0;
      }
    }
    const bytes = exactUnionCoverage(disks, SRC_SIZE);
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const data = Skia.Data.fromBytes(new Uint8Array(ctx.bytes));
        const exact = Skia.Image.MakeImage(
          {
            width: ctx.size,
            height: ctx.size,
            colorType: ctx.rgba8888,
            alphaType: ctx.opaque,
          },
          data,
          ctx.size * 4
        )!;
        const dstSize = ctx.size * ctx.zoom;
        canvas.drawImageRectOptions(
          exact,
          Skia.XYWHRect(0, 0, ctx.size, ctx.size),
          Skia.XYWHRect(0, 0, dstSize, dstSize),
          ctx.nearest,
          ctx.noMipmap
        );
        const grid = Skia.Paint();
        grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
        grid.setStyle(ctx.stroke);
        grid.setStrokeWidth(0);
        grid.setAntiAlias(false);
        for (let i = 0; i <= ctx.size; i++) {
          const p = i * ctx.zoom;
          canvas.drawLine(p, 0, p, dstSize, grid);
          canvas.drawLine(0, p, dstSize, p, grid);
        }
      },
      { ...magnifyCtx, bytes }
    );
    checkImage(image, "snapshots/aa/bezier-exact-8x.png");
  }, 30000);

  it("should magnify an SDF-shaded bezier curve 8x with a pixel grid", async () => {
    const image = await surface.drawOffscreen((Skia, canvas, ctx) => {
      // Distance to the cubic is found with a coarse scan along t followed by
      // a local ternary-search refinement (SkSL runtime effects follow ES2
      // rules, so the ITP root-finding used in Redraw is not portable here)
      const effect = Skia.RuntimeEffect.Make(`
const float2 A = float2(2.0, 28.0);
const float2 B = float2(8.0, -8.0);
const float2 C = float2(24.0, 40.0);
const float2 D = float2(30.0, 4.0);
const float halfWidth = 1.0;

float2 cubicEval(float t) {
  float mt = 1.0 - t;
  return mt * mt * mt * A + 3.0 * mt * mt * t * B +
         3.0 * mt * t * t * C + t * t * t * D;
}

half4 main(float2 p) {
  float bestT = 0.0;
  float bestD = 1e20;
  for (int i = 0; i <= 32; i++) {
    float t = float(i) / 32.0;
    float2 q = cubicEval(t) - p;
    float d = dot(q, q);
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  float lo = max(bestT - 1.0 / 32.0, 0.0);
  float hi = min(bestT + 1.0 / 32.0, 1.0);
  for (int j = 0; j < 20; j++) {
    float m1 = lo + (hi - lo) / 3.0;
    float m2 = hi - (hi - lo) / 3.0;
    float2 q1 = cubicEval(m1) - p;
    float2 q2 = cubicEval(m2) - p;
    if (dot(q1, q1) < dot(q2, q2)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }
  float2 closest = cubicEval((lo + hi) * 0.5);
  float dist = distance(p, closest);
  float sdf = dist - halfWidth;
  float2 grad = dist > 0.0 ? (p - closest) / dist : float2(0.0);
  float gradLen = length(grad);
  float coverage = gradLen == 0.0
    ? (sdf > 0.0 ? 0.0 : 1.0)
    : clamp(0.5 - sdf * gradLen, 0.0, 1.0);
  return half4(half3(1.0 - coverage), 1.0);
}`)!;
      const paint = Skia.Paint();
      paint.setShader(effect.makeShader([]));
      const src = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.drawPaint(paint);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      const dstSize = ctx.size * ctx.zoom;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(0, 0, ctx.size, ctx.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        ctx.nearest,
        ctx.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(ctx.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= ctx.size; i++) {
        const p = i * ctx.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, magnifyCtx);
    checkImage(image, "snapshots/aa/bezier-sdf-8x.png");
  });

  // Calligraphy: a broad-nib pen stroke modeled as a union of circles sampled
  // along the path contours, with the radius given by the nib projected onto
  // the normal of the direction of travel. Rendered once with the Skia
  // rasterizer (a single path holding all the dots) and once from the circle
  // SDF with the linear coverage ramp. The union of circles is min(sdf), and
  // since the ramp is monotonic in sdf, per-pixel max(coverage) is exactly
  // the coverage of the union SDF; that is what the CPU rasterizer
  // accumulates. Each variant produces a full view and an 8x crop.
  const calligraphyCtx = {
    ...magnifyCtx,
    d: "M13.6 247.8C13.6 247.8 51.8 206.1 84.2 168.8 140.8 103.4 202.8 27.1 150.1 14.3 131 9.7 116.4 29.3 107.3 44.8 69.7 108.4 58 213.8 57.5 302M58 302C67.7 271.3 104.4 190.3 140.2 192.5 181.5 195.1 145.3 257 154.5 283.8 168.8 321.6 208.2 292.3 230 276.9 265.9 251.5 289 230.7 289 199.9 289 161 235.3 173.5 223.3 204.6 213.9 228.9 214.3 265.3 229.3 283.6 247.5 305.7 287.7 309.4 312.2 287.9 337 266.2 354.7 234 368.7 212.5 403.9 158.3 464.4 85.6 449.1 29.5 447 21.9 440.4 16 432.5 15.7 393.6 14.2 381.8 98.6 375.3 128.8 368.8 159.3 345.2 260.8 373.1 292.5 404.4 328 446.3 261.9 464.7 231.1 468.7 224.8 472.6 217.9 476.1 212.5 511.3 158.4 571.8 85.6 556.5 29.5 554.4 21.9 547.8 16.1 539.9 15.8 501 14.2 489.2 98.7 482.8 128.8 476.2 159.3 452.6 260.8 480.5 292.6 511.8 328.1 562.4 265 572.6 232.3 587.3 185.4 620.9 171 660.9 179.7M660.9 179.7C616 166.1 580.9 199.1 572.6 232.6 566.8 256.4 573.5 281.6 599.2 295.2 668.5 331.9 742.8 211.1 660.9 179.7ZM660.9 179.7C643.7 181.3 636.1 204.2 643.3 227.2 654.3 263.4 704.3 267.7 733.1 255.5",
    nibAngle: (45 * Math.PI) / 180,
    rMin: 0.4,
    rMax: 5,
    step: 1,
    crop: { x: 140, y: 185 },
    linear: FilterMode.Linear,
  };

  // Samples the nib dots on the testing surface and returns them as plain
  // data, so the draw callbacks below only receive serializable context
  const sampleCalligraphyDots = () =>
    surface.eval((Skia, ctx) => {
      const source = Skia.Path.MakeFromSVGString(ctx.d)!;
      const dots: { x: number; y: number; r: number }[] = [];
      const it = Skia.ContourMeasureIter(source, false, 1);
      let contour = it.next();
      while (contour !== null) {
        const total = contour.length();
        for (let dist = 0; dist <= total; dist += ctx.step) {
          const [pos, tan] = contour.getPosTan(dist);
          const theta = Math.atan2(tan.y, tan.x);
          const r =
            ctx.rMin +
            (ctx.rMax - ctx.rMin) * Math.abs(Math.sin(theta - ctx.nibAngle));
          dots.push({ x: pos.x, y: pos.y, r });
        }
        contour = it.next();
      }
      const b = source.getBounds();
      return {
        dots,
        w: Math.ceil(b.x + b.width + ctx.rMax + 1),
        h: Math.ceil(b.y + b.height + ctx.rMax + 1),
      };
    }, calligraphyCtx);

  it("should render calligraphy dots with Skia and magnify a crop 8x", async () => {
    const { dots, w, h } = await sampleCalligraphyDots();
    const ctx = { ...calligraphyCtx, dots, w, h };
    const full = await surface.drawOffscreen((Skia, canvas, c) => {
      const builder = Skia.PathBuilder.Make();
      for (const dot of c.dots) {
        builder.addCircle(dot.x, dot.y, dot.r);
      }
      const src = Skia.Surface.MakeOffscreen(c.w, c.h)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.clear(Skia.Color("white"));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color("black"));
      srcCanvas.drawPath(builder.detach(), paint);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      canvas.clear(Skia.Color("white"));
      const scale = 256 / c.w;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(0, 0, c.w, c.h),
        Skia.XYWHRect(0, (256 - c.h * scale) / 2, 256, c.h * scale),
        c.linear,
        c.noMipmap
      );
    }, ctx);
    checkImage(full, "snapshots/aa/calligraphy.png");

    const zoomed = await surface.drawOffscreen((Skia, canvas, c) => {
      const builder = Skia.PathBuilder.Make();
      for (const dot of c.dots) {
        builder.addCircle(dot.x, dot.y, dot.r);
      }
      const src = Skia.Surface.MakeOffscreen(c.w, c.h)!;
      const srcCanvas = src.getCanvas();
      srcCanvas.clear(Skia.Color("white"));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color("black"));
      srcCanvas.drawPath(builder.detach(), paint);
      src.flush();
      const snapshot = src.makeImageSnapshot();
      const dstSize = c.size * c.zoom;
      canvas.drawImageRectOptions(
        snapshot,
        Skia.XYWHRect(c.crop.x, c.crop.y, c.size, c.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        c.nearest,
        c.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(c.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= c.size; i++) {
        const p = i * c.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, ctx);
    checkImage(zoomed, "snapshots/aa/calligraphy-8x.png");
  });

  it("should render calligraphy dots with the circle SDF and magnify a crop 8x", async () => {
    const { dots, w, h } = await sampleCalligraphyDots();
    // CPU rasterizer, pure JS: per-pixel coverage from the circle SDF with
    // the linear ramp, max over circles = coverage of the union SDF
    const cov = new Float32Array(w * h);
    for (const dot of dots) {
      const x0 = Math.max(0, Math.floor(dot.x - dot.r - 1));
      const x1 = Math.min(w - 1, Math.ceil(dot.x + dot.r + 1));
      const y0 = Math.max(0, Math.floor(dot.y - dot.r - 1));
      const y1 = Math.min(h - 1, Math.ceil(dot.y + dot.r + 1));
      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const dx = px + 0.5 - dot.x;
          const dy = py + 0.5 - dot.y;
          const sdf = Math.sqrt(dx * dx + dy * dy) - dot.r;
          const coverage = Math.min(1, Math.max(0, 0.5 - sdf));
          const i = py * w + px;
          if (coverage > cov[i]) {
            cov[i] = coverage;
          }
        }
      }
    }
    const bytes = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const v = Math.round(255 * (1 - cov[i]));
      bytes[i * 4] = v;
      bytes[i * 4 + 1] = v;
      bytes[i * 4 + 2] = v;
      bytes[i * 4 + 3] = 255;
    }
    const ctx = { ...calligraphyCtx, bytes: Array.from(bytes), w, h };

    const full = await surface.drawOffscreen((Skia, canvas, c) => {
      const data = Skia.Data.fromBytes(new Uint8Array(c.bytes));
      const image = Skia.Image.MakeImage(
        { width: c.w, height: c.h, colorType: c.rgba8888, alphaType: c.opaque },
        data,
        c.w * 4
      )!;
      canvas.clear(Skia.Color("white"));
      const scale = 256 / c.w;
      canvas.drawImageRectOptions(
        image,
        Skia.XYWHRect(0, 0, c.w, c.h),
        Skia.XYWHRect(0, (256 - c.h * scale) / 2, 256, c.h * scale),
        c.linear,
        c.noMipmap
      );
    }, ctx);
    checkImage(full, "snapshots/aa/calligraphy-sdf.png");

    const zoomed = await surface.drawOffscreen((Skia, canvas, c) => {
      const data = Skia.Data.fromBytes(new Uint8Array(c.bytes));
      const image = Skia.Image.MakeImage(
        { width: c.w, height: c.h, colorType: c.rgba8888, alphaType: c.opaque },
        data,
        c.w * 4
      )!;
      const dstSize = c.size * c.zoom;
      canvas.drawImageRectOptions(
        image,
        Skia.XYWHRect(c.crop.x, c.crop.y, c.size, c.size),
        Skia.XYWHRect(0, 0, dstSize, dstSize),
        c.nearest,
        c.noMipmap
      );
      const grid = Skia.Paint();
      grid.setColor(Skia.Color("rgba(0, 128, 255, 0.5)"));
      grid.setStyle(c.stroke);
      grid.setStrokeWidth(0);
      grid.setAntiAlias(false);
      for (let i = 0; i <= c.size; i++) {
        const p = i * c.zoom;
        canvas.drawLine(p, 0, p, dstSize, grid);
        canvas.drawLine(0, p, dstSize, p, grid);
      }
    }, ctx);
    checkImage(zoomed, "snapshots/aa/calligraphy-sdf-8x.png");
  });
});
