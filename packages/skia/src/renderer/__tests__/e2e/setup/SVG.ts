// Because SkSVG doesn't exist on web,

import type { SkSVG } from "../../../../skia/types";

// this instance is just to send the svg over the wire
export class SVGAsset implements SkSVG {
  __typename__ = "SVG" as const;
  constructor(
    private _source: string,
    private _width: number,
    private _height: number
  ) {}

  [Symbol.dispose]() {}

  dispose() {
    this[Symbol.dispose]();
  }

  source() {
    return this._source;
  }

  width() {
    return this._width;
  }

  height() {
    return this._height;
  }
}

// The side of slowSvg(levels), in pixels.
export const slowSvgSide = (levels: number) => 2 * 2 ** levels;

// An SVG of 4^levels cyan squares of 2 × 2 pixels tiling a square, through a
// tree of <use> elements, each level drawing the one below four times: a
// canvas takes as long as the levels ask to draw it, from a few nodes to
// parse.
export const slowSvg = (levels: number) => {
  let defs = '<rect id="level0" width="2" height="2" fill="cyan"/>';
  for (let level = 1; level <= levels; level++) {
    const below = `xlink:href="#level${level - 1}"`;
    const side = slowSvgSide(level - 1);
    defs +=
      `<g id="level${level}"><use ${below}/><use ${below} x="${side}"/>` +
      `<use ${below} y="${side}"/><use ${below} x="${side}" y="${side}"/></g>`;
  }
  const side = slowSvgSide(levels);
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" ' +
    `xmlns:xlink="http://www.w3.org/1999/xlink" width="${side}" height="${side}">` +
    `<defs>${defs}</defs><use xlink:href="#level${levels}"/></svg>`
  );
};
