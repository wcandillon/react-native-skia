import { surface } from "../setup";

const ITERATIONS = 10000;
// Maximum allowed time in milliseconds for each benchmark
// Based on observed performance: most operations complete 10k iterations in <25ms on fast machines
// CI machines are significantly slower, so we set generous thresholds to catch only
// severe regressions (5x-10x slowdowns), not normal CI variance
const MAX_TIME_MS = 1500;

describe("Path Performance Benchmarks", () => {
  it(`should complete ${ITERATIONS} lineTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.lineTo(i, i);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`lineTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} moveTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.moveTo(i, i);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`moveTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} quadTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.quadTo(i, i, i + 1, i + 1);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`quadTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} cubicTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.cubicTo(i, i, i + 1, i + 1, i + 2, i + 2);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`cubicTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} conicTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.conicTo(i, i, i + 1, i + 1, 0.5);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`conicTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} arcToTangent operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.arcToTangent(i, i, i + 10, i + 10, 5);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`arcToTangent x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rLineTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rLineTo(1, 1);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rLineTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rMoveTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rMoveTo(1, 1);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rMoveTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rQuadTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rQuadTo(1, 1, 2, 2);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rQuadTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rCubicTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rCubicTo(1, 1, 2, 2, 3, 3);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rCubicTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rConicTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rConicTo(1, 1, 2, 2, 0.5);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rConicTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} transform operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.close();
        const path = builder.build();

        const matrix = Skia.Matrix();
        matrix.translate(10, 10);
        matrix.scale(1.01, 1.01);

        const start = performance.now();
        let result = path;
        for (let i = 0; i < ctx.iterations; i++) {
          result = Skia.PathBuilder.MakeFromPath(result)
            .transform(matrix)
            .build();
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`transform x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} offset operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.close();
        const path = builder.build();

        const start = performance.now();
        let result = path;
        for (let i = 0; i < ctx.iterations; i++) {
          result = Skia.PathBuilder.MakeFromPath(result).offset(1, 1).build();
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`offset x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} addRect operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addRect(Skia.XYWHRect(i, i, 10, 10));
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`addRect x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} addCircle operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addCircle(i, i, 5);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`addCircle x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} addOval operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addOval(Skia.XYWHRect(i, i, 10, 5));
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`addOval x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} addRRect operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addRRect(Skia.RRectXY(Skia.XYWHRect(i, i, 10, 10), 2, 2));
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`addRRect x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} addArc operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addArc(Skia.XYWHRect(i, i, 10, 10), 0, 180);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`addArc x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} close operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.moveTo(i, i);
          builder.lineTo(i + 10, i);
          builder.lineTo(i + 10, i + 10);
          builder.close();
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    // console.log(
    //   `close (with path building) x${ITERATIONS}: ${elapsed.toFixed(2)}ms`
    // );
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} arcToRotated operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.arcToRotated(5, 5, 0, false, true, i + 10, i + 10);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`arcToRotated x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it(`should complete ${ITERATIONS} rArcTo operations within ${MAX_TIME_MS}ms`, async () => {
    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(0, 0);
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.rArcTo(5, 5, 0, false, true, 10, 10);
        }
        return performance.now() - start;
      },
      { iterations: ITERATIONS }
    );
    //console.log(`rArcTo x${ITERATIONS}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(MAX_TIME_MS);
  });

  it("should complete a complex path building scenario within acceptable time", async () => {
    const iterations = 1000;
    const maxTime = 250;

    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          const builder = Skia.PathBuilder.Make();
          // Simulate building a moderately complex shape
          builder.moveTo(0, 0);
          builder.lineTo(100, 0);
          builder.quadTo(150, 50, 100, 100);
          builder.cubicTo(75, 125, 25, 125, 0, 100);
          builder.conicTo(-25, 50, 0, 0, 0.7);
          builder.close();
          builder.addCircle(50, 50, 20);
          builder.addRect(Skia.XYWHRect(30, 30, 40, 40));
          const path = builder.build();
          Skia.PathBuilder.MakeFromPath(path)
            .transform(Skia.Matrix().translate(i, i))
            .build();
        }
        return performance.now() - start;
      },
      { iterations }
    );
    // console.log(
    //   `Complex path building x${iterations}: ${elapsed.toFixed(2)}ms`
    // );
    expect(elapsed).toBeLessThan(maxTime);
  });

  it("should complete method chaining efficiently", async () => {
    const iterations = 1000;
    const maxTime = 250;

    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
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
        return performance.now() - start;
      },
      { iterations }
    );
    //console.log(`Method chaining x${iterations}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(maxTime);
  });

  it("should handle addPath efficiently", async () => {
    const iterations = 5000;
    const maxTime = 250;

    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const sourcePath = Skia.Path.Rect(Skia.XYWHRect(0, 0, 10, 10));

        const builder = Skia.PathBuilder.Make();

        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          builder.addPath(sourcePath);
        }
        return performance.now() - start;
      },
      { iterations }
    );
    //console.log(`addPath x${iterations}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(maxTime);
  });

  it("should handle addPoly efficiently", async () => {
    const iterations = 5000;
    const maxTime = 500;

    const elapsed = await surface.eval(
      (Skia, ctx) => {
        const points = [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ];

        const start = performance.now();
        for (let i = 0; i < ctx.iterations; i++) {
          const builder = Skia.PathBuilder.Make();
          builder.addPoly(points, true);
        }
        return performance.now() - start;
      },
      { iterations }
    );
    //console.log(`addPoly x${iterations}: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(maxTime);
  });
});
