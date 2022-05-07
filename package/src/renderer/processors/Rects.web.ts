/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SkRect, SkRRect } from "../../skia";

import { vec } from "./math/Vector";
import type { Radius } from "./Radius";
import { processRadius } from "./Radius";

export const point = (x: number, y: number) => ({ x, y });

export const rect = (x: number, y: number, width: number, height: number) => [
  x,
  y,
  width,
  height,
];

/**
 * An RRect (rectangle with rounded corners) is represented by 12 floats. In order, the floats
 * correspond to left, top, right, bottom and then in pairs, the radiusX, radiusY for upper-left,
 * upper-right, lower-right, lower-left. See RRect.h for more.
 */
export const rrect = (r: SkRect, rx: number, ry: number) =>
  r instanceof Array
    ? new Float32Array([...r, rx, ry, rx, ry, rx, ry, rx, ry])
    : new Float32Array([
        r.x,
        r.y,
        r.x + r.width,
        r.y + r.height,
        rx,
        ry,
        rx,
        ry,
        rx,
        ry,
        rx,
        ry,
      ]);

export const bounds = (rects: SkRect[]) => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const width = Math.max(...rects.map((r) => r.x + r.width));
  const height = Math.max(...rects.map((r) => r.y + r.height));
  return rect(x, y, width, height);
};

export const topLeft = (r: SkRect | SkRRect) =>
  isRRect(r) ? vec(r.rect.x, r.rect.y) : vec(r.x, r.y);
export const topRight = (r: SkRect | SkRRect) =>
  isRRect(r) ? vec(r.rect.x + r.rect.width, r.rect.y) : vec(r.x + r.width, r.y);
export const bottomLeft = (r: SkRect | SkRRect) =>
  isRRect(r)
    ? vec(r.rect.x, r.rect.y + r.rect.height)
    : vec(r.x, r.y + r.height);
export const bottomRight = (r: SkRect | SkRRect) =>
  isRRect(r)
    ? vec(r.rect.x + r.rect.width, r.rect.y + r.rect.height)
    : vec(r.x + r.width, r.y + r.height);
export const center = (r: SkRect | SkRRect) =>
  isRRect(r)
    ? vec(r.rect.x + r.rect.width / 2, r.rect.y + r.rect.height / 2)
    : vec(r.x + r.width / 2, r.y + r.height / 2);

// We have an issue to check property existence on JSI backed instances
const isRRectCtor = (def: RRectDef): def is RRectCtor =>
  (def as any).rect === undefined;

// We have an issue to check property existence on JSI backed instances
const isRectCtor = (def: RectDef): def is RectCtor =>
  (def as any).rect === undefined;

// We have an issue to check property existence on JSI backed instances
export const isRRect = (def: SkRect | SkRRect): def is SkRRect =>
  (def as any).rect !== undefined;

export interface RectCtor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RRectCtor extends RectCtor {
  r: Radius;
}

export type RectDef = RectCtor | { rect: SkRect };
export type RRectDef = RRectCtor | { rect: SkRRect };

export const processRect = (def: RectDef) => {
  if (isRectCtor(def)) {
    return rect(def.x, def.y, def.width, def.height);
  } else {
    return new Float32Array([
      def.rect.x,
      def.rect.y,
      def.rect.width,
      def.rect.height,
    ]);
  }
};

export const processRRect = (def: RRectDef) => {
  if (isRRectCtor(def)) {
    const r = processRadius(def.r);
    return rrect(
      { x: def.x, y: def.y, width: def.width, height: def.height },
      r.x,
      r.y
    );
  } else {
    return def.rect;
  }
};
