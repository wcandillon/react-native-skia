import {
  SkiaError,
  SkiaDecodeError,
  SkSLCompilationError,
  SkiaValidationError,
  SkiaOutOfMemoryError,
  SkiaGPUUnavailableError,
  SkiaSurfaceUnavailableError,
  SkiaInternalError,
  SkiaErrorConstructors,
  SkiaErrorBrand,
  isSkiaError,
} from "../types/Errors";

describe("Errors", () => {
  it("names each error and keeps the class chain", () => {
    const errors = [
      [new SkiaDecodeError("bad bytes", "image"), "SkiaDecodeError"],
      [new SkSLCompilationError("bad sksl", []), "SkSLCompilationError"],
      [new SkiaValidationError("zero size"), "SkiaValidationError"],
      [new SkiaOutOfMemoryError("oom"), "SkiaOutOfMemoryError"],
      [new SkiaGPUUnavailableError("no vulkan"), "SkiaGPUUnavailableError"],
      [
        new SkiaSurfaceUnavailableError("no webgl", "webgl"),
        "SkiaSurfaceUnavailableError",
      ],
      [new SkiaInternalError("driver"), "SkiaInternalError"],
    ] as const;
    for (const [error, name] of errors) {
      expect(error.name).toBe(name);
      expect(error).toBeInstanceOf(SkiaError);
      expect(error).toBeInstanceOf(Error);
      expect(isSkiaError(error)).toBe(true);
      expect(isSkiaError(error, name)).toBe(true);
      expect(String(error)).toBe(`${name}: ${error.message}`);
    }
  });

  it("carries the extra fields", () => {
    const decode = new SkiaDecodeError("bad svg", "svg");
    expect(decode.format).toBe("svg");
    const compile = new SkSLCompilationError("bad sksl", [
      {
        type: "error",
        message: "undeclared identifier",
        lineNum: 3,
        linePos: 0,
      },
    ]);
    expect(compile.messages).toHaveLength(1);
    expect(compile.messages[0].lineNum).toBe(3);
    const surface = new SkiaSurfaceUnavailableError("no 2d", "2d");
    expect(surface.context).toBe("2d");
  });

  it("names the errors of the generic class like WebGPU's DOMExceptions", () => {
    const error = SkiaErrorConstructors.SkiaError("lost", "AbortError");
    expect(error).toBeInstanceOf(SkiaError);
    expect(error.name).toBe("AbortError");
    expect(isSkiaError(error, "AbortError")).toBe(true);
    expect(SkiaErrorConstructors.SkiaError("plain").name).toBe("SkiaError");
  });

  it("recognizes a branded error, as a worklet receives it", () => {
    const plain = new Error("bad bytes");
    plain.name = "SkiaDecodeError";
    Object.defineProperty(plain, SkiaErrorBrand, { value: true });
    expect(isSkiaError(plain)).toBe(true);
    expect(isSkiaError(plain, "SkiaDecodeError")).toBe(true);
    expect(isSkiaError(plain, "AbortError")).toBe(false);
    expect(isSkiaError(new TypeError("x"))).toBe(false);
    expect(isSkiaError(null)).toBe(false);
    expect(isSkiaError("SkiaDecodeError")).toBe(false);
  });

  it("does not take an error of the same name for its own", () => {
    // The AbortError of an aborted fetch, a DOMException.
    const abort = new Error("aborted");
    abort.name = "AbortError";
    expect(isSkiaError(abort)).toBe(false);
    expect(isSkiaError(abort, "AbortError")).toBe(false);
    const decode = new Error("bad bytes");
    decode.name = "SkiaDecodeError";
    expect(isSkiaError(decode)).toBe(false);
  });

  it("brands the errors without showing the brand", () => {
    const error = new SkiaDecodeError("bad", "image");
    expect(Object.keys(error)).not.toContain(SkiaErrorBrand);
    expect((error as unknown as Record<string, unknown>)[SkiaErrorBrand]).toBe(
      true
    );
  });

  it("builds the errors native code asks for", () => {
    const decode = SkiaErrorConstructors.SkiaDecodeError("bad", "typeface");
    expect(decode).toBeInstanceOf(SkiaDecodeError);
    expect(decode.format).toBe("typeface");
    const compile = SkiaErrorConstructors.SkSLCompilationError("bad", []);
    expect(compile).toBeInstanceOf(SkSLCompilationError);
  });
});
