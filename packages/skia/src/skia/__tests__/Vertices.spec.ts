import { processResult } from "../../__tests__/setup";
import { BlendMode, VertexMode } from "../types";

import { setupSkia } from "./setup";

describe("Vertices", () => {
  it("Billinear gradient", () => {
    const { surface, canvas, width, Skia } = setupSkia();
    const vertices = [
      Skia.Point(0, 0),
      Skia.Point(width, 0),
      Skia.Point(width, width),
      Skia.Point(0, width),
    ];
    const colors = ["#61DAFB", "#fb61da", "#dafb61", "#61fbcf"].map((c) =>
      Skia.Color(c)
    );
    const triangle1 = [0, 1, 2];
    const triangle2 = [0, 2, 3];
    const indices = [...triangle1, ...triangle2];
    const vertexMode = VertexMode.Triangles;
    const vert = Skia.MakeVertices(
      vertexMode,
      vertices,
      undefined,
      colors,
      indices
    );
    expect(vert.uniqueID()).toBe(vert.uniqueID());
    const bounds = vert.bounds();
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(width);
    expect(bounds.height).toBe(width);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("purple"));
    canvas.drawVertices(vert, BlendMode.DstOver, paint);
    processResult(surface, "snapshots/vertices/billinear-gradient.png");
  });
  it("Billinear gradient from a Float32Array", () => {
    const { surface, canvas, width, Skia } = setupSkia();
    // Interleaved x, y pairs
    const vertices = new Float32Array([
      0,
      0,
      width,
      0,
      width,
      width,
      0,
      width,
    ]);
    const colors = ["#61DAFB", "#fb61da", "#dafb61", "#61fbcf"].map((c) =>
      Skia.Color(c)
    );
    const indices = [0, 1, 2, 0, 2, 3];
    const vert = Skia.MakeVertices(
      VertexMode.Triangles,
      vertices,
      undefined,
      colors,
      indices
    );
    const bounds = vert.bounds();
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(width);
    expect(bounds.height).toBe(width);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("purple"));
    canvas.drawVertices(vert, BlendMode.DstOver, paint);
    processResult(surface, "snapshots/vertices/billinear-gradient.png");
  });
  it("Texture coordinates from a Float32Array", () => {
    const { Skia } = setupSkia();
    const vertices = new Float32Array([0, 0, 64, 0, 64, 64]);
    const textures = new Float32Array([0, 0, 1, 0, 1, 1]);
    const vert = Skia.MakeVertices(VertexMode.Triangles, vertices, textures);
    const bounds = vert.bounds();
    expect(bounds.width).toBe(64);
    expect(bounds.height).toBe(64);
  });
});
