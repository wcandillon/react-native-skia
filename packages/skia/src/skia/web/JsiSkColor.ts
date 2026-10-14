import type { SkColor, Color as InputColor } from "../types";

const alphaf = (c: number) => ((c >> 24) & 255) / 255;
const red = (c: number) => (c >> 16) & 255;
const green = (c: number) => (c >> 8) & 255;
const blue = (c: number) => c & 255;

// From https://raw.githubusercontent.com/deanm/css-color-parser-js/master/csscolorparser.js
const CSSColorTable = {
  transparent: Float32Array.of(0, 0, 0, 0),
  aliceblue: Float32Array.of(240, 248, 255, 1),
  antiquewhite: Float32Array.of(250, 235, 215, 1),
  aqua: Float32Array.of(0, 255, 255, 1),
  aquamarine: Float32Array.of(127, 255, 212, 1),
  azure: Float32Array.of(240, 255, 255, 1),
  beige: Float32Array.of(245, 245, 220, 1),
  bisque: Float32Array.of(255, 228, 196, 1),
  black: Float32Array.of(0, 0, 0, 1),
  blanchedalmond: Float32Array.of(255, 235, 205, 1),
  blue: Float32Array.of(0, 0, 255, 1),
  blueviolet: Float32Array.of(138, 43, 226, 1),
  brown: Float32Array.of(165, 42, 42, 1),
  burlywood: Float32Array.of(222, 184, 135, 1),
  cadetblue: Float32Array.of(95, 158, 160, 1),
  chartreuse: Float32Array.of(127, 255, 0, 1),
  chocolate: Float32Array.of(210, 105, 30, 1),
  coral: Float32Array.of(255, 127, 80, 1),
  cornflowerblue: Float32Array.of(100, 149, 237, 1),
  cornsilk: Float32Array.of(255, 248, 220, 1),
  crimson: Float32Array.of(220, 20, 60, 1),
  cyan: Float32Array.of(0, 255, 255, 1),
  darkblue: Float32Array.of(0, 0, 139, 1),
  darkcyan: Float32Array.of(0, 139, 139, 1),
  darkgoldenrod: Float32Array.of(184, 134, 11, 1),
  darkgray: Float32Array.of(169, 169, 169, 1),
  darkgreen: Float32Array.of(0, 100, 0, 1),
  darkgrey: Float32Array.of(169, 169, 169, 1),
  darkkhaki: Float32Array.of(189, 183, 107, 1),
  darkmagenta: Float32Array.of(139, 0, 139, 1),
  darkolivegreen: Float32Array.of(85, 107, 47, 1),
  darkorange: Float32Array.of(255, 140, 0, 1),
  darkorchid: Float32Array.of(153, 50, 204, 1),
  darkred: Float32Array.of(139, 0, 0, 1),
  darksalmon: Float32Array.of(233, 150, 122, 1),
  darkseagreen: Float32Array.of(143, 188, 143, 1),
  darkslateblue: Float32Array.of(72, 61, 139, 1),
  darkslategray: Float32Array.of(47, 79, 79, 1),
  darkslategrey: Float32Array.of(47, 79, 79, 1),
  darkturquoise: Float32Array.of(0, 206, 209, 1),
  darkviolet: Float32Array.of(148, 0, 211, 1),
  deeppink: Float32Array.of(255, 20, 147, 1),
  deepskyblue: Float32Array.of(0, 191, 255, 1),
  dimgray: Float32Array.of(105, 105, 105, 1),
  dimgrey: Float32Array.of(105, 105, 105, 1),
  dodgerblue: Float32Array.of(30, 144, 255, 1),
  firebrick: Float32Array.of(178, 34, 34, 1),
  floralwhite: Float32Array.of(255, 250, 240, 1),
  forestgreen: Float32Array.of(34, 139, 34, 1),
  fuchsia: Float32Array.of(255, 0, 255, 1),
  gainsboro: Float32Array.of(220, 220, 220, 1),
  ghostwhite: Float32Array.of(248, 248, 255, 1),
  gold: Float32Array.of(255, 215, 0, 1),
  goldenrod: Float32Array.of(218, 165, 32, 1),
  gray: Float32Array.of(128, 128, 128, 1),
  green: Float32Array.of(0, 128, 0, 1),
  greenyellow: Float32Array.of(173, 255, 47, 1),
  grey: Float32Array.of(128, 128, 128, 1),
  honeydew: Float32Array.of(240, 255, 240, 1),
  hotpink: Float32Array.of(255, 105, 180, 1),
  indianred: Float32Array.of(205, 92, 92, 1),
  indigo: Float32Array.of(75, 0, 130, 1),
  ivory: Float32Array.of(255, 255, 240, 1),
  khaki: Float32Array.of(240, 230, 140, 1),
  lavender: Float32Array.of(230, 230, 250, 1),
  lavenderblush: Float32Array.of(255, 240, 245, 1),
  lawngreen: Float32Array.of(124, 252, 0, 1),
  lemonchiffon: Float32Array.of(255, 250, 205, 1),
  lightblue: Float32Array.of(173, 216, 230, 1),
  lightcoral: Float32Array.of(240, 128, 128, 1),
  lightcyan: Float32Array.of(224, 255, 255, 1),
  lightgoldenrodyellow: Float32Array.of(250, 250, 210, 1),
  lightgray: Float32Array.of(211, 211, 211, 1),
  lightgreen: Float32Array.of(144, 238, 144, 1),
  lightgrey: Float32Array.of(211, 211, 211, 1),
  lightpink: Float32Array.of(255, 182, 193, 1),
  lightsalmon: Float32Array.of(255, 160, 122, 1),
  lightseagreen: Float32Array.of(32, 178, 170, 1),
  lightskyblue: Float32Array.of(135, 206, 250, 1),
  lightslategray: Float32Array.of(119, 136, 153, 1),
  lightslategrey: Float32Array.of(119, 136, 153, 1),
  lightsteelblue: Float32Array.of(176, 196, 222, 1),
  lightyellow: Float32Array.of(255, 255, 224, 1),
  lime: Float32Array.of(0, 255, 0, 1),
  limegreen: Float32Array.of(50, 205, 50, 1),
  linen: Float32Array.of(250, 240, 230, 1),
  magenta: Float32Array.of(255, 0, 255, 1),
  maroon: Float32Array.of(128, 0, 0, 1),
  mediumaquamarine: Float32Array.of(102, 205, 170, 1),
  mediumblue: Float32Array.of(0, 0, 205, 1),
  mediumorchid: Float32Array.of(186, 85, 211, 1),
  mediumpurple: Float32Array.of(147, 112, 219, 1),
  mediumseagreen: Float32Array.of(60, 179, 113, 1),
  mediumslateblue: Float32Array.of(123, 104, 238, 1),
  mediumspringgreen: Float32Array.of(0, 250, 154, 1),
  mediumturquoise: Float32Array.of(72, 209, 204, 1),
  mediumvioletred: Float32Array.of(199, 21, 133, 1),
  midnightblue: Float32Array.of(25, 25, 112, 1),
  mintcream: Float32Array.of(245, 255, 250, 1),
  mistyrose: Float32Array.of(255, 228, 225, 1),
  moccasin: Float32Array.of(255, 228, 181, 1),
  navajowhite: Float32Array.of(255, 222, 173, 1),
  navy: Float32Array.of(0, 0, 128, 1),
  oldlace: Float32Array.of(253, 245, 230, 1),
  olive: Float32Array.of(128, 128, 0, 1),
  olivedrab: Float32Array.of(107, 142, 35, 1),
  orange: Float32Array.of(255, 165, 0, 1),
  orangered: Float32Array.of(255, 69, 0, 1),
  orchid: Float32Array.of(218, 112, 214, 1),
  palegoldenrod: Float32Array.of(238, 232, 170, 1),
  palegreen: Float32Array.of(152, 251, 152, 1),
  paleturquoise: Float32Array.of(175, 238, 238, 1),
  palevioletred: Float32Array.of(219, 112, 147, 1),
  papayawhip: Float32Array.of(255, 239, 213, 1),
  peachpuff: Float32Array.of(255, 218, 185, 1),
  peru: Float32Array.of(205, 133, 63, 1),
  pink: Float32Array.of(255, 192, 203, 1),
  plum: Float32Array.of(221, 160, 221, 1),
  powderblue: Float32Array.of(176, 224, 230, 1),
  purple: Float32Array.of(128, 0, 128, 1),
  rebeccapurple: Float32Array.of(102, 51, 153, 1),
  red: Float32Array.of(255, 0, 0, 1),
  rosybrown: Float32Array.of(188, 143, 143, 1),
  royalblue: Float32Array.of(65, 105, 225, 1),
  saddlebrown: Float32Array.of(139, 69, 19, 1),
  salmon: Float32Array.of(250, 128, 114, 1),
  sandybrown: Float32Array.of(244, 164, 96, 1),
  seagreen: Float32Array.of(46, 139, 87, 1),
  seashell: Float32Array.of(255, 245, 238, 1),
  sienna: Float32Array.of(160, 82, 45, 1),
  silver: Float32Array.of(192, 192, 192, 1),
  skyblue: Float32Array.of(135, 206, 235, 1),
  slateblue: Float32Array.of(106, 90, 205, 1),
  slategray: Float32Array.of(112, 128, 144, 1),
  slategrey: Float32Array.of(112, 128, 144, 1),
  snow: Float32Array.of(255, 250, 250, 1),
  springgreen: Float32Array.of(0, 255, 127, 1),
  steelblue: Float32Array.of(70, 130, 180, 1),
  tan: Float32Array.of(210, 180, 140, 1),
  teal: Float32Array.of(0, 128, 128, 1),
  thistle: Float32Array.of(216, 191, 216, 1),
  tomato: Float32Array.of(255, 99, 71, 1),
  turquoise: Float32Array.of(64, 224, 208, 1),
  violet: Float32Array.of(238, 130, 238, 1),
  wheat: Float32Array.of(245, 222, 179, 1),
  white: Float32Array.of(255, 255, 255, 1),
  whitesmoke: Float32Array.of(245, 245, 245, 1),
  yellow: Float32Array.of(255, 255, 0, 1),
  yellowgreen: Float32Array.of(154, 205, 50, 1),
};

const clampCSSByte = (j: number) => {
  // Clamp to integer 0 .. 255.
  const i = Math.round(j); // Seems to be what Chrome does (vs truncation).
  // eslint-disable-next-line no-nested-ternary
  return i < 0 ? 0 : i > 255 ? 255 : i;
};

const clampCSSFloat = (f: number) => {
  // eslint-disable-next-line no-nested-ternary
  return f < 0 ? 0 : f > 1 ? 1 : f;
};

const parseCSSInt = (str: string) => {
  // int or percentage.
  if (str[str.length - 1] === "%") {
    return clampCSSByte((parseFloat(str) / 100) * 255);
  }

  return clampCSSByte(parseInt(str));
};

const parseCSSFloat = (str: string | undefined) => {
  if (str === undefined) {
    return 1;
  }
  // float or percentage.
  if (str[str.length - 1] === "%") {
    return clampCSSFloat(parseFloat(str) / 100);
  }
  return clampCSSFloat(parseFloat(str));
};

const CSSHueToRGB = (m1: number, m2: number, h: number) => {
  if (h < 0) {
    h += 1;
  } else if (h > 1) {
    h -= 1;
  }

  if (h * 6 < 1) {
    return m1 + (m2 - m1) * h * 6;
  }
  if (h * 2 < 1) {
    return m2;
  }
  if (h * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  }
  return m1;
};

const parseCSSColor = (cssStr: string) => {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = cssStr.replace(/ /g, "").toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in CSSColorTable) {
    const cl = CSSColorTable[str as keyof typeof CSSColorTable];
    if (cl) {
      return Float32Array.of(...cl);
    }
    return null;
  } // dup.

  // #abc and #abc123 syntax.
  if (str[0] === "#") {
    if (str.length === 4) {
      var iv = parseInt(str.slice(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) {
        return null;
      } // Covers NaN.
      return [
        ((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
        (iv & 0xf0) | ((iv & 0xf0) >> 4),
        (iv & 0xf) | ((iv & 0xf) << 4),
        1,
      ];
    } else if (str.length === 7) {
      var iv = parseInt(str.slice(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) {
        return null;
      } // Covers NaN.
      return [(iv & 0xff0000) >> 16, (iv & 0xff00) >> 8, iv & 0xff, 1];
    } else if (str.length === 9) {
      var iv = parseInt(str.slice(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffffff)) {
        return null; // Covers NaN.
      }
      return [
        ((iv & 0xff000000) >> 24) & 0xff,
        (iv & 0xff0000) >> 16,
        (iv & 0xff00) >> 8,
        (iv & 0xff) / 255,
      ];
    }

    return null;
  }

  var op = str.indexOf("("),
    ep = str.indexOf(")");
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.slice(0, op);
    var params = str.slice(op + 1, ep).split(",");
    var alpha = 1; // To allow case fallthrough.
    switch (fname) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      case "rgba":
        if (params.length !== 4) {
          return null;
        }
        alpha = parseCSSFloat(params.pop());
      // Fall through.
      case "rgb":
        if (params.length !== 3) {
          return null;
        }
        return [
          parseCSSInt(params[0]),
          parseCSSInt(params[1]),
          parseCSSInt(params[2]),
          alpha,
        ];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      case "hsla":
        if (params.length !== 4) {
          return null;
        }
        alpha = parseCSSFloat(params.pop());
      // Fall through.
      case "hsl":
        if (params.length !== 3) {
          return null;
        }
        var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360; // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parseCSSFloat(params[1]);
        var l = parseCSSFloat(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [
          clampCSSByte(CSSHueToRGB(m1, m2, h + 1 / 3) * 255),
          clampCSSByte(CSSHueToRGB(m1, m2, h) * 255),
          clampCSSByte(CSSHueToRGB(m1, m2, h - 1 / 3) * 255),
          alpha,
        ];
      default:
        return null;
    }
  }

  return null;
};

export const Color = (color: InputColor): SkColor => {
  if (color instanceof Float32Array) {
    return color;
  } else if (Array.isArray(color)) {
    return new Float32Array(color);
  } else if (typeof color === "string") {
    const r = parseCSSColor(color);
    const rgba = r === null ? CSSColorTable.black : r;
    return Float32Array.of(
      rgba[0] / 255,
      rgba[1] / 255,
      rgba[2] / 255,
      rgba[3]
    );
  } else {
    return Float32Array.of(
      red(color) / 255,
      green(color) / 255,
      blue(color) / 255,
      alphaf(color)
    );
  }
};
