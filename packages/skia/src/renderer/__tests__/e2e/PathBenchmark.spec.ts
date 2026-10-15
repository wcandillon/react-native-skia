import { surface } from "../setup";

// Linear work grows SCALE times over SCALE times the operations, quadratic work SCALE squared, on any machine load.
const SCALE = 4;
const MAX_RATIO = 10;
const RUNS = 3;

const CASES = [
  { operation: "lineTo", count: 10000 },
  { operation: "moveTo", count: 10000 },
  { operation: "quadTo", count: 10000 },
  { operation: "cubicTo", count: 10000 },
  { operation: "conicTo", count: 10000 },
  { operation: "arcToTangent", count: 10000 },
  { operation: "rLineTo", count: 10000 },
  { operation: "rMoveTo", count: 10000 },
  { operation: "rQuadTo", count: 10000 },
  { operation: "rCubicTo", count: 10000 },
  { operation: "rConicTo", count: 10000 },
  { operation: "transform", count: 10000 },
  { operation: "offset", count: 10000 },
  { operation: "addRect", count: 10000 },
  { operation: "addCircle", count: 10000 },
  { operation: "addOval", count: 10000 },
  { operation: "addRRect", count: 10000 },
  { operation: "addArc", count: 10000 },
  { operation: "close", count: 10000 },
  { operation: "arcToRotated", count: 10000 },
  { operation: "rArcTo", count: 10000 },
  { operation: "complex path building", count: 1000 },
  { operation: "method chaining", count: 1000 },
  { operation: "addPath", count: 5000 },
  { operation: "addPoly", count: 5000 },
] as const;

describe("Path Performance Benchmarks", () => {
  it.each(CASES)(
    "$operation scales linearly from $count operations",
    async ({ operation, count }) => {
      const { small, large } = await surface.eval(
        (Skia, ctx) => {
          // Builds what one run needs and returns the loop to time.
          const prepare = (): ((iterations: number) => void) => {
            switch (ctx.operation) {
              case "lineTo": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.lineTo(i, i);
                  }
                };
              }
              case "moveTo": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.moveTo(i, i);
                  }
                };
              }
              case "quadTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.quadTo(i, i, i + 1, i + 1);
                  }
                };
              }
              case "cubicTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.cubicTo(i, i, i + 1, i + 1, i + 2, i + 2);
                  }
                };
              }
              case "conicTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.conicTo(i, i, i + 1, i + 1, 0.5);
                  }
                };
              }
              case "arcToTangent": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.arcToTangent(i, i, i + 10, i + 10, 5);
                  }
                };
              }
              case "rLineTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rLineTo(1, 1);
                  }
                };
              }
              case "rMoveTo": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rMoveTo(1, 1);
                  }
                };
              }
              case "rQuadTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rQuadTo(1, 1, 2, 2);
                  }
                };
              }
              case "rCubicTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rCubicTo(1, 1, 2, 2, 3, 3);
                  }
                };
              }
              case "rConicTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rConicTo(1, 1, 2, 2, 0.5);
                  }
                };
              }
              case "transform": {
                const path = Skia.PathBuilder.Make()
                  .moveTo(0, 0)
                  .lineTo(100, 100)
                  .lineTo(0, 100)
                  .close()
                  .build();
                const matrix = Skia.Matrix();
                matrix.translate(10, 10);
                matrix.scale(1.01, 1.01);
                return (iterations) => {
                  let result = path;
                  for (let i = 0; i < iterations; i++) {
                    result = Skia.PathBuilder.MakeFromPath(result)
                      .transform(matrix)
                      .build();
                  }
                };
              }
              case "offset": {
                const path = Skia.PathBuilder.Make()
                  .moveTo(0, 0)
                  .lineTo(100, 100)
                  .lineTo(0, 100)
                  .close()
                  .build();
                return (iterations) => {
                  let result = path;
                  for (let i = 0; i < iterations; i++) {
                    result = Skia.PathBuilder.MakeFromPath(result)
                      .offset(1, 1)
                      .build();
                  }
                };
              }
              case "addRect": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addRect(Skia.XYWHRect(i, i, 10, 10));
                  }
                };
              }
              case "addCircle": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addCircle(i, i, 5);
                  }
                };
              }
              case "addOval": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addOval(Skia.XYWHRect(i, i, 10, 5));
                  }
                };
              }
              case "addRRect": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addRRect(
                      Skia.RRectXY(Skia.XYWHRect(i, i, 10, 10), 2, 2)
                    );
                  }
                };
              }
              case "addArc": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addArc(Skia.XYWHRect(i, i, 10, 10), 0, 180);
                  }
                };
              }
              case "close": {
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.moveTo(i, i);
                    builder.lineTo(i + 10, i);
                    builder.lineTo(i + 10, i + 10);
                    builder.close();
                  }
                };
              }
              case "arcToRotated": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.arcToRotated(5, 5, 0, false, true, i + 10, i + 10);
                  }
                };
              }
              case "rArcTo": {
                const builder = Skia.PathBuilder.Make();
                builder.moveTo(0, 0);
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.rArcTo(5, 5, 0, false, true, 10, 10);
                  }
                };
              }
              case "complex path building": {
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    const builder = Skia.PathBuilder.Make();
                    builder.moveTo(0, 0);
                    builder.lineTo(100, 0);
                    builder.quadTo(150, 50, 100, 100);
                    builder.cubicTo(75, 125, 25, 125, 0, 100);
                    builder.conicTo(-25, 50, 0, 0, 0.7);
                    builder.close();
                    builder.addCircle(50, 50, 20);
                    builder.addRect(Skia.XYWHRect(30, 30, 40, 40));
                    Skia.PathBuilder.MakeFromPath(builder.build())
                      .transform(Skia.Matrix().translate(i, i))
                      .build();
                  }
                };
              }
              case "method chaining": {
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    Skia.PathBuilder.Make()
                      .moveTo(0, 0)
                      .lineTo(10, 0)
                      .lineTo(10, 10)
                      .lineTo(0, 10)
                      .close()
                      .moveTo(20, 20)
                      .quadTo(30, 20, 30, 30)
                      .quadTo(30, 40, 20, 40)
                      .quadTo(10, 40, 10, 30)
                      .quadTo(10, 20, 20, 20)
                      .close()
                      .build();
                  }
                };
              }
              case "addPath": {
                const sourcePath = Skia.Path.Rect(Skia.XYWHRect(0, 0, 10, 10));
                const builder = Skia.PathBuilder.Make();
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    builder.addPath(sourcePath);
                  }
                };
              }
              case "addPoly": {
                const points = [
                  { x: 0, y: 0 },
                  { x: 10, y: 0 },
                  { x: 10, y: 10 },
                  { x: 0, y: 10 },
                ];
                return (iterations) => {
                  for (let i = 0; i < iterations; i++) {
                    Skia.PathBuilder.Make().addPoly(points, true);
                  }
                };
              }
              default: {
                const unhandled: never = ctx.operation;
                throw new Error(`No benchmark for ${unhandled}`);
              }
            }
          };
          const time = (iterations: number) => {
            const loop = prepare();
            const start = performance.now();
            loop(iterations);
            return performance.now() - start;
          };
          let smallest = Infinity;
          let largest = Infinity;
          for (let run = 0; run < ctx.runs; run++) {
            smallest = Math.min(smallest, time(ctx.count));
            largest = Math.min(largest, time(ctx.count * ctx.scale));
          }
          return { small: smallest, large: largest };
        },
        { operation, count, scale: SCALE, runs: RUNS }
      );
      expect(large / small).toBeLessThan(MAX_RATIO);
    }
  );
});
