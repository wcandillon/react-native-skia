import { surface } from "../setup";

describe("Skia.Color", () => {
  it("should convert regular array to Float32Array", async () => {
    const result = await surface.eval((Skia) => {
      const color = Skia.Color([1, 0, 0, 1]); // Red
      return Array.from(color);
    });
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
    expect(result[3]).toBeCloseTo(1);
  });

  it("should handle CSS color names", async () => {
    const result = await surface.eval((Skia) => {
      const color = Skia.Color("cyan");
      return Array.from(color);
    });
    expect(result[0]).toBeCloseTo(0); // R
    expect(result[1]).toBeCloseTo(1); // G
    expect(result[2]).toBeCloseTo(1); // B
    expect(result[3]).toBeCloseTo(1); // A
  });

  it("should handle hex colors", async () => {
    const result = await surface.eval((Skia) => {
      const color = Skia.Color("#ff0000");
      return Array.from(color);
    });
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
  });

  it("should handle hex colors with alpha", async () => {
    const result = await surface.eval((Skia) => {
      const color = Skia.Color("#ff000080");
      return Array.from(color);
    });
    expect(result[0]).toBeCloseTo(1);
    expect(result[3]).toBeCloseTo(0.5, 1); // ~128/255
  });

  it("should work with paint.setColor using array", async () => {
    // This should not throw
    const result = await surface.eval((Skia) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color([1, 0, 0, 1]));
      return true;
    });
    expect(result).toBe(true);
  });

  it("should work in createPicture callback", async () => {
    // This tests the original bug from issue #2200
    const result = await surface.eval((Skia) => {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(50, 50, 25, paint);
      const picture = recorder.finishRecordingAsPicture();
      return picture !== null;
    });
    expect(result).toBe(true);
  });

  it("should handle array colors in createPicture callback", async () => {
    // This tests the specific scenario from issue #2200 with array colors
    const result = await surface.eval((Skia) => {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      const paint = Skia.Paint();
      // Use array color like in the original bug report
      paint.setColor(Skia.Color([0, 1, 1, 1])); // cyan as array
      canvas.drawCircle(50, 50, 25, paint);
      const picture = recorder.finishRecordingAsPicture();
      return picture !== null;
    });
    expect(result).toBe(true);
  });

  it("should convert number arrays exactly like Float32Array, string and number colors", async () => {
    const result = await surface.eval((Skia) => {
      const fromArray = Skia.Color([1, 0, 0, 1]);
      const fromTypedArray = Skia.Color(new Float32Array([1, 0, 0, 1]));
      const fromString = Skia.Color("red");
      const fromNumber = Skia.Color(0xffff0000);
      return {
        isFloat32Array: fromArray instanceof Float32Array,
        fromArray: Array.from(fromArray),
        fromTypedArray: Array.from(fromTypedArray),
        fromString: Array.from(fromString),
        fromNumber: Array.from(fromNumber),
      };
    });
    expect(result.isFloat32Array).toBe(true);
    expect(result.fromArray).toEqual(result.fromTypedArray);
    expect(result.fromArray).toEqual(result.fromString);
    expect(result.fromArray).toEqual(result.fromNumber);
  });

  it("should round-trip fractional number arrays like Float32Array", async () => {
    const result = await surface.eval((Skia) => {
      const fromArray = Skia.Color([0.1, 0.2, 0.3, 1]);
      const fromTypedArray = Skia.Color(new Float32Array([0.1, 0.2, 0.3, 1]));
      return {
        fromArray: Array.from(fromArray),
        fromTypedArray: Array.from(fromTypedArray),
      };
    });
    expect(result.fromArray).toEqual(result.fromTypedArray);
    expect(result.fromArray[0]).toBeCloseTo(0.1);
    expect(result.fromArray[1]).toBeCloseTo(0.2);
    expect(result.fromArray[2]).toBeCloseTo(0.3);
    expect(result.fromArray[3]).toBeCloseTo(1);
  });

  it("should pass through Float32Array unchanged", async () => {
    const result = await surface.eval((Skia) => {
      const input = Float32Array.of(0.5, 0.5, 0.5, 1);
      const color = Skia.Color(input);
      // Check that values are preserved
      return Array.from(color);
    });
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(0.5);
    expect(result[3]).toBeCloseTo(1);
  });
});
