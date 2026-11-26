/**
 * The errors React Native Skia throws and rejects with.
 *
 * A factory never returns null to say it failed: it throws one of these, and
 * a promise rejects with one. `null` is kept for "no result" (a path
 * operation with an empty outcome, the end of an iteration), never for a
 * failure.
 *
 * `error.name` identifies an error on every runtime. `instanceof` holds on
 * the runtime that loaded the package (the React Native runtime, or the page
 * on the web); a worklet runtime gets plain errors that keep their `name`,
 * so code that may run in a worklet checks `name`, or uses
 * {@link isSkiaError}.
 */

/** The names of the errors below. */
export type SkiaErrorName =
  | "SkiaError"
  | "SkiaDecodeError"
  | "SkSLCompilationError"
  | "SkiaValidationError"
  | "SkiaOutOfMemoryError"
  | "SkiaGPUUnavailableError"
  | "SkiaInternalError"
  // Named like the DOMException WebGPU uses for the same situation.
  | "NotSupportedError"
  | "AbortError"
  | "NotFoundError";

/**
 * The non-enumerable property, set to `true`, that marks an error React
 * Native Skia raised, on every runtime: the classes below set it, and so does
 * native code when it builds an error on a runtime without them (a worklet
 * runtime, see cpp/jsi/NamedError.h). Unlike the name, it does not match a
 * DOMException of the same name (the `AbortError` of an aborted fetch).
 */
export const SkiaErrorBrand = "__rnskiaError";

/** The base class of the errors React Native Skia raises. */
export class SkiaError extends Error {
  constructor(message?: string, name: SkiaErrorName = "SkiaError") {
    super(message);
    this.name = name;
    Object.defineProperty(this, SkiaErrorBrand, { value: true });
    // Transpiled classes extending Error lose their prototype.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** What a {@link SkiaDecodeError} was decoding. */
export type SkiaDecodeFormat =
  | "image"
  | "animated-image"
  | "svg"
  | "typeface"
  | "skottie"
  | "picture"
  | "path";

/**
 * Bytes or text that cannot be decoded or parsed: an image, an SVG, a font,
 * a Lottie file, a serialized picture, an SVG path string.
 */
export class SkiaDecodeError extends SkiaError {
  readonly format: SkiaDecodeFormat;
  constructor(message: string, format: SkiaDecodeFormat) {
    super(message, "SkiaDecodeError");
    this.format = format;
  }
}

/** One diagnostic of an SkSL compilation, like WebGPU's GPUCompilationMessage. */
export interface SkSLCompilationMessage {
  readonly type: "error" | "warning" | "info";
  readonly message: string;
  /** 1-based line of the source, 0 when unknown. */
  readonly lineNum: number;
  /** 1-based position in the line, 0 when unknown. */
  readonly linePos: number;
}

/** SkSL that fails to compile, with its diagnostics. */
export class SkSLCompilationError extends SkiaError {
  readonly messages: readonly SkSLCompilationMessage[];
  constructor(message: string, messages: readonly SkSLCompilationMessage[]) {
    super(message, "SkSLCompilationError");
    this.messages = messages;
  }
}

/**
 * Invalid use the types cannot catch: a surface of size zero, pixel data
 * shorter than its image info, a texture without the usage it needs.
 */
export class SkiaValidationError extends SkiaError {
  constructor(message: string) {
    super(message, "SkiaValidationError");
  }
}

/** An allocation failed, on the GPU or the CPU. */
export class SkiaOutOfMemoryError extends SkiaError {
  constructor(message: string) {
    super(message, "SkiaOutOfMemoryError");
  }
}

/**
 * The device has no GPU Skia can render with (see `Skia.gpu`): the message
 * is `Skia.gpu.error`.
 */
export class SkiaGPUUnavailableError extends SkiaError {
  constructor(message: string) {
    super(message, "SkiaGPUUnavailableError");
  }
}

/** Skia or the graphics driver failed on its own. */
export class SkiaInternalError extends SkiaError {
  constructor(message: string) {
    super(message, "SkiaInternalError");
  }
}

/**
 * Whether `error` is one React Native Skia raised, optionally of the given
 * name. Works on every runtime, worklets included, as it reads the
 * {@link SkiaErrorBrand} rather than the class.
 */
export const isSkiaError = (
  error: unknown,
  name?: SkiaErrorName
): error is SkiaError => {
  "worklet";
  if (
    typeof error !== "object" ||
    error === null ||
    (error as Record<string, unknown>)[SkiaErrorBrand] !== true
  ) {
    return false;
  }
  return name === undefined || (error as { name?: unknown }).name === name;
};

/**
 * The constructors native code builds its errors with, on the runtime that
 * loaded the package: `instanceof` then holds there. Each takes the message
 * and, for the errors that carry more, the extra field.
 */
export const SkiaErrorConstructors = {
  SkiaError: (message: string, name?: SkiaErrorName) =>
    new SkiaError(message, name),
  SkiaDecodeError: (message: string, format: SkiaDecodeFormat) =>
    new SkiaDecodeError(message, format),
  SkSLCompilationError: (
    message: string,
    messages: readonly SkSLCompilationMessage[]
  ) => new SkSLCompilationError(message, messages),
  SkiaValidationError: (message: string) => new SkiaValidationError(message),
  SkiaOutOfMemoryError: (message: string) => new SkiaOutOfMemoryError(message),
  SkiaGPUUnavailableError: (message: string) =>
    new SkiaGPUUnavailableError(message),
  SkiaInternalError: (message: string) => new SkiaInternalError(message),
};
