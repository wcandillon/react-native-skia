import {
  SkiaError,
  SkiaDecodeError,
  SkSLCompilationError,
  SkiaValidationError,
  SkiaOutOfMemoryError,
  SkiaGPUUnavailableError,
  SkiaInternalError,
  SkiaErrorConstructors,
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
  });

  it("names the errors of the generic class like WebGPU's DOMExceptions", () => {
    const error = SkiaErrorConstructors.SkiaError("lost", "AbortError");
    expect(error).toBeInstanceOf(SkiaError);
    expect(error.name).toBe("AbortError");
    expect(isSkiaError(error, "AbortError")).toBe(true);
    expect(SkiaErrorConstructors.SkiaError("plain").name).toBe("SkiaError");
  });

  it("recognizes an error by its name alone, as a worklet receives it", () => {
    const plain = new Error("bad bytes");
    plain.name = "SkiaDecodeError";
    expect(isSkiaError(plain)).toBe(true);
    expect(isSkiaError(plain, "SkiaDecodeError")).toBe(true);
    expect(isSkiaError(plain, "AbortError")).toBe(false);
    expect(isSkiaError(new TypeError("x"))).toBe(false);
    expect(isSkiaError(null)).toBe(false);
    expect(isSkiaError("SkiaDecodeError")).toBe(false);
  });

  it("builds the errors native code asks for", () => {
    const decode = SkiaErrorConstructors.SkiaDecodeError("bad", "typeface");
    expect(decode).toBeInstanceOf(SkiaDecodeError);
    expect(decode.format).toBe("typeface");
    const compile = SkiaErrorConstructors.SkSLCompilationError("bad", []);
    expect(compile).toBeInstanceOf(SkSLCompilationError);
  });
});
