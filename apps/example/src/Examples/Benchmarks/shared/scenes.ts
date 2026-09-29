import { Skia } from "@shopify/react-native-skia";
import type {
  SkCanvas,
  SkColor,
  SkPicture,
  SkSVG,
} from "@shopify/react-native-skia";

const palette = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#1dd1a1",
  "#5f27cd",
  "#ff9ff3",
  "#54a0ff",
  "#00d2d3",
].map((c) => Skia.Color(c));
const background = Skia.Color("#151a21");

/** Mirror segments of the kaleidoscope field (see buildField). */
export const KALEIDOSCOPE_SEGMENTS = 6;
const fill = Skia.Paint();
const line = Skia.Paint();
line.setStyle(1);
line.setStrokeWidth(2);
line.setAntiAlias(true);

/**
 * The particle field: `count` circles in a disc of radius `radius`, recorded
 * once into a picture. Drawing the picture replays every circle, so a frame
 * costs one call to produce and `count` draws for Skia to process.
 */
const PALETTE_HEX = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#1dd1a1",
  "#5f27cd",
  "#ff9ff3",
  "#54a0ff",
  "#00d2d3",
];

/**
 * The same field as buildField, as SVG text: one <circle> per circle. The
 * producer parses it into an SkSVGDOM per thread and renders the DOM every
 * frame, so the draws are issued by the SVG module in C++.
 */
export const buildFieldSvg = (
  count: number,
  radius: number,
  kaleidoscope = false
) => {
  const wedge = Math.PI / 3;
  const n = kaleidoscope ? Math.ceil(count / KALEIDOSCOPE_SEGMENTS) : count;
  const opacity = kaleidoscope
    ? ' fill-opacity="0.8" stroke-opacity="0.8"'
    : "";
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const spiral = i * 2.399963;
    const a = kaleidoscope ? spiral % wedge : spiral;
    const d = radius * Math.sqrt((i + 0.5) / n);
    const x = (Math.cos(a) * d).toFixed(2);
    const y = (Math.sin(a) * d).toFixed(2);
    const r = 1.5 + (i % 4);
    const color = PALETTE_HEX[i % PALETTE_HEX.length];
    if (i % 3 === 0) {
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${r + 1}" fill="none" stroke="${color}" stroke-width="1.5"${opacity}/>`
      );
    } else {
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"${opacity}/>`
      );
    }
  }
  const size = 2 * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-radius} ${-radius} ${size} ${size}">${parts.join("")}</svg>`;
};

export const buildField = (
  count: number,
  radius: number,
  kaleidoscope = false,
  // A different look per view: the palette is shifted and the spiral is
  // rotated by `variant`. Same draw count.
  variant = 0
) => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(-radius, -radius, 2 * radius, 2 * radius)
  );
  const paint = Skia.Paint();
  const stroke = Skia.Paint();
  stroke.setStyle(1);
  stroke.setStrokeWidth(1.5);
  // Kaleidoscope: the circles fill one 60 degree wedge and the producer
  // draws the picture six times, mirrored every other time, so the total
  // stays at `count` draws per frame.
  const wedge = Math.PI / 3;
  const n = kaleidoscope ? Math.ceil(count / KALEIDOSCOPE_SEGMENTS) : count;
  for (let i = 0; i < n; i++) {
    // Golden-angle spiral: evenly spread, no two circles alike.
    const spiral = i * 2.399963 + variant * 0.7;
    const a = kaleidoscope ? spiral % wedge : spiral;
    const d = radius * Math.sqrt((i + 0.5) / n);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const r = 1.5 + (i % 4);
    const color = palette[(i + variant * 3) % palette.length];
    if (i % 3 === 0) {
      stroke.setColor(color);
      if (kaleidoscope) {
        stroke.setAlphaf(0.8);
      }
      canvas.drawCircle(x, y, r + 1, stroke);
    } else {
      paint.setColor(color);
      if (kaleidoscope) {
        // A little translucency lets the mirrored layers show through.
        paint.setAlphaf(0.8);
      }
      canvas.drawCircle(x, y, r, paint);
    }
  }
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  return picture;
};

/**
 * `count` copies of an SVG (e.g. the 240-path tiger, about 480 fills and
 * strokes each) in a grid that fits the disc of radius `radius`, recorded
 * once into a picture. Same shape as the field: one drawPicture per frame,
 * and Skia processes every path again each time. Paths take Graphite's
 * tessellation and atlas routes rather than the analytic circle renderer,
 * which is what this scene is for.
 */
export const buildSvgs = (count: number, radius: number, svg: SkSVG) => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(-radius, -radius, 2 * radius, 2 * radius)
  );
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  // The grid's bounding box fits inside the disc.
  const cell = (2 * radius) / Math.hypot(columns, rows);
  const size = Math.max(svg.width(), svg.height());
  const left = (-columns * cell) / 2;
  const top = (-rows * cell) / 2;
  for (let i = 0; i < count; i++) {
    canvas.save();
    canvas.translate(
      left + (i % columns) * cell,
      top + Math.floor(i / columns) * cell
    );
    canvas.scale(cell / size, cell / size);
    canvas.drawSvg(svg, size, size);
    canvas.restore();
  }
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  return picture;
};

/** The field, rotating and breathing. In points. */
export const drawField = (
  canvas: SkCanvas,
  width: number,
  height: number,
  t: number,
  index: number,
  field: SkPicture,
  bg: SkColor = background
) => {
  "worklet";
  // A paint of its own: several producer threads may draw fields at once.
  const paint = Skia.Paint();
  paint.setColor(bg);
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  canvas.save();
  canvas.translate(width / 2, height / 2);
  canvas.rotate((t * 0.03 + index * 60) % 360, 0, 0);
  const s = 0.85 + 0.15 * Math.sin(t * 0.002 + index);
  canvas.scale(s, s);
  canvas.drawPicture(field);
  canvas.restore();
};

/**
 * A live chart: `count` bars and a `count`-point line, all animated. Every
 * frame is `2 * count` draw calls, produced and processed each time (nothing
 * pre-recorded), the shape of a dashboard tile in a list.
 */
export const drawChart = (
  canvas: SkCanvas,
  width: number,
  height: number,
  t: number,
  index: number,
  count: number
) => {
  "worklet";
  fill.setColor(background);
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), fill);
  const barWidth = width / count;
  const phase = index * 0.9;
  for (let i = 0; i < count; i++) {
    const v =
      0.5 +
      0.25 * Math.sin(t * 0.002 + i * 0.35 + phase) +
      0.2 * Math.sin(t * 0.0007 + i * 0.11);
    const h = v * (height - 8);
    fill.setColor(palette[(i + index) % palette.length]);
    canvas.drawRect(
      Skia.XYWHRect(i * barWidth, height - h, Math.max(1, barWidth - 1), h),
      fill
    );
  }
  line.setColor(Skia.Color("white"));
  let prevX = 0;
  let prevY = height / 2 + Math.sin(t * 0.003 + phase) * (height / 4);
  for (let i = 1; i < count; i++) {
    const x = (i / (count - 1)) * width;
    const y =
      height / 2 +
      Math.sin(t * 0.003 + i * 0.25 + phase) * (height / 4) +
      Math.cos(t * 0.0011 + i * 0.05) * (height / 8);
    canvas.drawLine(prevX, prevY, x, y, line);
    prevX = x;
    prevY = y;
  }
};
