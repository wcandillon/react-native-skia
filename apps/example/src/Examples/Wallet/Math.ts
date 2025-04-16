import type { Vector, PathCommand } from "@shopify/react-native-skia";
import {
  cartesian2Polar,
  PathVerb,
  vec,
  Skia,
} from "@shopify/react-native-skia";
import { exhaustiveCheck } from "@shopify/react-native-skia/src/renderer/typeddash";

const round = (value: number, precision = 0) => {
  "worklet";
  const p = Math.pow(10, precision);
  return Math.round(value * p) / p;
};

// https://stackoverflow.com/questions/27176423
// https://stackoverflow.com/questions/51879836
const cuberoot = (x: number) => {
  "worklet";
  const y = Math.pow(Math.abs(x), 1 / 3);
  return x < 0 ? -y : y;
};

const solveCubic = (a: number, b: number, c: number, d: number) => {
  "worklet";
  if (Math.abs(a) < 1e-8) {
    // Quadratic case, ax^2+bx+c=0
    a = b;
    b = c;
    c = d;
    if (Math.abs(a) < 1e-8) {
      // Linear case, ax+b=0
      a = b;
      b = c;
      if (Math.abs(a) < 1e-8) {
        // Degenerate case
        return [];
      }
      return [-b / a];
    }

    const D = b * b - 4 * a * c;
    if (Math.abs(D) < 1e-8) {
      return [-b / (2 * a)];
    } else if (D > 0) {
      return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];
    }
    return [];
  }

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  let roots;

  if (Math.abs(p) < 1e-8) {
    // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cuberoot(-q)];
  } else if (Math.abs(q) < 1e-8) {
    // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
  } else {
    const D = (q * q) / 4 + (p * p * p) / 27;
    if (Math.abs(D) < 1e-8) {
      // D = 0 -> two roots
      roots = [(-1.5 * q) / p, (3 * q) / p];
    } else if (D > 0) {
      // Only one real root
      const u = cuberoot(-q / 2 - Math.sqrt(D));
      roots = [u - p / (3 * u)];
    } else {
      // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      const u = 2 * Math.sqrt(-p / 3);
      const t = Math.acos((3 * q) / p / u) / 3; // D < 0 implies p < 0 and acos argument in [-1..1]
      const k = (2 * Math.PI) / 3;
      roots = [u * Math.cos(t), u * Math.cos(t - k), u * Math.cos(t - 2 * k)];
    }
  }

  // Convert back from depressed cubic
  for (let i = 0; i < roots.length; i++) {
    roots[i] -= b / (3 * a);
  }

  return roots;
};

const cubicBezier = (
  t: number,
  from: number,
  c1: number,
  c2: number,
  to: number
) => {
  "worklet";
  const term = 1 - t;
  const a = 1 * term ** 3 * t ** 0 * from;
  const b = 3 * term ** 2 * t ** 1 * c1;
  const c = 3 * term ** 1 * t ** 2 * c2;
  const d = 1 * term ** 0 * t ** 3 * to;
  return a + b + c + d;
};

export const cubicBezierYForX = (
  x: number,
  a: Vector,
  b: Vector,
  c: Vector,
  d: Vector,
  precision = 2
) => {
  "worklet";
  const pa = -a.x + 3 * b.x - 3 * c.x + d.x;
  const pb = 3 * a.x - 6 * b.x + 3 * c.x;
  const pc = -3 * a.x + 3 * b.x;
  const pd = a.x - x;
  const t = solveCubic(pa, pb, pc, pd)
    .map((root) => round(root, precision))
    .filter((root) => root >= 0 && root <= 1)[0];
  const y = cubicBezier(t, a.y, b.y, c.y, d.y);
  return y;
};

interface Cubic {
  from: Vector;
  c1: Vector;
  c2: Vector;
  to: Vector;
}

export const selectCurve = (cmds: PathCommand[], x: number): Cubic | null => {
  "worklet";
  let from: Vector = vec(0, 0);
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    if (cmd[0] === PathVerb.Move) {
      from = vec(cmd[1], cmd[2]);
    } else if (cmd[0] === PathVerb.Cubic) {
      const c1 = vec(cmd[1], cmd[2]);
      const c2 = vec(cmd[3], cmd[4]);
      const to = vec(cmd[5], cmd[6]);
      if (x >= from.x && x <= to.x) {
        return {
          from,
          c1,
          c2,
          to,
        };
      }
      from = to;
    }
  }
  return null;
};

export const getYForX = (cmds: PathCommand[], x: number, precision = 2) => {
  "worklet";
  const c = selectCurve(cmds, x);
  if (c === null) {
    return cmds[1][6];
  }
  return cubicBezierYForX(x, c.from, c.c1, c.c2, c.to, precision);
};

export const controlPoint = (
  current: Vector,
  previous: Vector,
  next: Vector,
  reverse: boolean,
  smoothing: number
) => {
  "worklet";
  const p = previous || current;
  const n = next || current;
  // Properties of the opposed-line
  const lengthX = n.x - p.x;
  const lengthY = n.y - p.y;

  const o = cartesian2Polar({ x: lengthX, y: lengthY });
  // If is end-control-point, add PI to the angle to go backward
  const angle = o.theta + (reverse ? Math.PI : 0);
  const length = o.radius * smoothing;
  // The control point position is relative to the current point
  const x = current.x + Math.cos(angle) * length;
  const y = current.y + Math.sin(angle) * length;
  return { x, y };
};

export const curveLines = (
  points: Vector[],
  smoothing: number,
  strategy: "complex" | "bezier" | "simple"
) => {
  "worklet";
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  // build the d attributes by looping over the points
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      continue;
    }
    const point = points[i];
    const next = points[i + 1];
    const prev = points[i - 1];
    const cps = controlPoint(prev, points[i - 2], point, false, smoothing);
    const cpe = controlPoint(point, prev, next, true, smoothing);
    switch (strategy) {
      case "simple":
        const cp = {
          x: (cps.x + cpe.x) / 2,
          y: (cps.y + cpe.y) / 2,
        };
        path.quadTo(cp.x, cp.y, point.x, point.y);
        break;
      case "bezier":
        const p0 = points[i - 2] || prev;
        const p1 = points[i - 1];
        const cp1x = (2 * p0.x + p1.x) / 3;
        const cp1y = (2 * p0.y + p1.y) / 3;
        const cp2x = (p0.x + 2 * p1.x) / 3;
        const cp2y = (p0.y + 2 * p1.y) / 3;
        const cp3x = (p0.x + 4 * p1.x + point.x) / 6;
        const cp3y = (p0.y + 4 * p1.y + point.y) / 6;
        path.cubicTo(cp1x, cp1y, cp2x, cp2y, cp3x, cp3y);
        if (i === points.length - 1) {
          path.cubicTo(
            points[points.length - 1].x,
            points[points.length - 1].y,
            points[points.length - 1].x,
            points[points.length - 1].y,
            points[points.length - 1].x,
            points[points.length - 1].y
          );
        }
        break;
      case "complex":
        path.cubicTo(cps.x, cps.y, cpe.x, cpe.y, point.x, point.y);
        break;
      default:
        exhaustiveCheck(strategy);
    }
  }
  return path;
};
