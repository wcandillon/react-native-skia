declare module "flubber" {
  export function interpolate(p1: string, p2: string): (t: number) => string;
}
