type Vec2 = [number, number];
declare module "adaptive-bezier-curve" {
  // eslint-disable-next-line import/no-default-export
  export default function (
    start: Vec2,
    c1: Vec2,
    c2: Vec2,
    end: Vec2,
    scale?: number
  ): Vec2[];
}
