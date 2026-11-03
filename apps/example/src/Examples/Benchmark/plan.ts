// The run plan of the benchmark screen, as `key=value` pairs joined by `&`
// (the query string of a URL, without the `?`):
//
//   scenes=shapes,images,shader,pattern,paths,text   (default: all six)
//   reps=2                                           (default: 1)
//   gap=30        seconds idle, no canvas, between scenes (default: 0)
//   backing=surface|texture   Android only: SurfaceView or TextureView
//   autostart=1   open the screen at launch and run the plan
//
// benchmarks/run.mjs bakes it into the bundle as SKIA_BENCH (the example
// inlines process.env at bundle time, see babel.config.js), so the plan
// reaches a release build on a device without deep links. Opened from the
// Home screen, the screen runs the default plan.

export const SCENES = [
  "shapes",
  "images",
  "shader",
  "pattern",
  "paths",
  "text",
] as const;
export type Scene = (typeof SCENES)[number];

export interface Plan {
  scenes: Scene[];
  reps: number;
  gapMs: number;
  backing: "surface" | "texture";
  autostart: boolean;
}

export const parsePlan = (query: string | undefined): Plan => {
  const params = new Map(
    (query ?? "")
      .split("&")
      .filter(Boolean)
      .map((kv) => kv.split("=") as [string, string])
  );
  const picked = (params.get("scenes") ?? "")
    .split(",")
    .filter((s): s is Scene => (SCENES as readonly string[]).includes(s));
  const reps = Number(params.get("reps") ?? 1);
  const gap = Number(params.get("gap") ?? 0);
  return {
    scenes: picked.length > 0 ? picked : [...SCENES],
    reps: Number.isFinite(reps) && reps >= 1 ? Math.floor(reps) : 1,
    gapMs: Number.isFinite(gap) && gap > 0 ? gap * 1000 : 0,
    backing: params.get("backing") === "texture" ? "texture" : "surface",
    autostart: params.get("autostart") === "1",
  };
};

export const BAKED_PLAN = parsePlan(process.env.SKIA_BENCH);
