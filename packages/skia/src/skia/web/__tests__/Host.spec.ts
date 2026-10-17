import { importSkia } from "../../../renderer/__tests__/setup";

// React 19.2's development build describes a changed prop by enumerating its
// own properties three levels deep, and a for...in over a view of the
// WebAssembly heap throws "RangeError: Invalid array length".
const enumeratedViews = (
  value: unknown,
  depth = 0,
  views: ArrayBufferView[] = []
) => {
  if (typeof value !== "object" || value === null) {
    return views;
  }
  if (ArrayBuffer.isView(value)) {
    if (depth < 3) {
      views.push(value);
    }
    return views;
  }
  if (depth < 3) {
    for (const key in value) {
      if (Object.hasOwn(value, key) && !key.startsWith("_")) {
        enumeratedViews(Reflect.get(value, key), depth + 1, views);
      }
    }
  }
  return views;
};

describe("Host", () => {
  it("keeps the CanvasKit heap out of an enumeration of a Skia object", () => {
    const { Skia } = importSkia();
    const objects = {
      path: Skia.Path.Make(),
      paint: Skia.Paint(),
      matrix: Skia.Matrix(),
      rect: Skia.XYWHRect(0, 0, 10, 10),
      font: Skia.Font(),
      shader: Skia.Shader.MakeColor(Skia.Color("red")),
      picture: Skia.PictureRecorder().finishRecordingAsPicture(),
    };
    const heap = Reflect.get(objects.path, "CanvasKit").HEAPU8.buffer;
    expect(heap.byteLength).toBeGreaterThan(0);
    for (const [name, object] of Object.entries(objects)) {
      const views = enumeratedViews(object).filter(
        (view) => view.buffer === heap
      );
      expect({ name, views: views.length }).toEqual({ name, views: 0 });
    }
  });
});
