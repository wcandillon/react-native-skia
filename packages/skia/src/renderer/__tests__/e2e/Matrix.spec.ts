import { surface } from "../setup";

describe("SkMatrix", () => {
  it("scales uniformly when y is omitted", async () => {
    const result = await surface.eval((Skia) => {
      const matrix = Skia.Matrix();
      matrix.scale(2);
      return matrix.get();
    });
    expect(result).toEqual([2, 0, 0, 0, 2, 0, 0, 0, 1]);
  });

  it("postScales uniformly when y is omitted", async () => {
    const result = await surface.eval((Skia) => {
      const matrix = Skia.Matrix();
      matrix.postScale(2);
      return matrix.get();
    });
    expect(result).toEqual([2, 0, 0, 0, 2, 0, 0, 0, 1]);
  });

  it("keeps the two axes independent when y is given", async () => {
    const result = await surface.eval((Skia) => {
      const matrix = Skia.Matrix();
      matrix.scale(2, 3);
      return matrix.get();
    });
    expect(result).toEqual([2, 0, 0, 0, 3, 0, 0, 0, 1]);
  });
});
