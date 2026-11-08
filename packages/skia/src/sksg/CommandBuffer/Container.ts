import type { SharedValue } from "react-native-reanimated";

import Rea from "../../external/reanimated/ReanimatedProxy";
import { HAS_REANIMATED_4 } from "../../external/reanimated/renderHelpers";
import type { SkCanvas, Skia, Transforms3d, Vector } from "../../skia/types";
import { Container } from "../StaticContainer";
// Declares globalThis.__RNSkiaRecorderStats, read by the mapper below.
import "../RecorderStats";

import { CapacityError, Compiler, PaintCache, affineOf } from "./Compiler";
import type { Binding } from "./Compiler";
import { getExperimentalApi } from "./Experimental";
import type { ExperimentalCommandBuffer } from "./Experimental";

import "../../views/api";

/** What a commit of the command buffer container cost, in milliseconds. */
export interface CommandBufferCommit {
  /** Compiling the scene graph into the buffer. */
  compileMs: number;
  /** Committing the buffer and installing it on the view. */
  installMs: number;
  /** Floats written. */
  count: number;
  /** Bindings of shared values to buffer slots. */
  bindings: number;
  /** Paints and shaders the compilation had to make (0 once warm). */
  paintsCreated: number;
  shadersCreated: number;
}

export interface CommandBufferContainerOptions {
  /** Interpret the buffer on every frame, or draw it as a picture. */
  mode: "interpreted" | "picture";
  onCommit?: (commit: CommandBufferCommit) => void;
  /** A timer name for the mapper's time, see __RNSkiaRecorderStats. */
  mapperTimer?: string;
}

declare global {
  var __rnskiaCommandBufferViews:
    Record<number, Float32Array | undefined> | undefined;
}

/**
 * The Float32Array over the buffer's memory for the calling runtime, made
 * once per runtime and kept on its global: the mapper runs on the UI
 * runtime, where no object survives between runs except through a global.
 */
const viewOf = (buffer: ExperimentalCommandBuffer) => {
  "worklet";
  const key = buffer.getDataAddress();
  let views = globalThis.__rnskiaCommandBufferViews;
  if (views === undefined) {
    views = {};
    globalThis.__rnskiaCommandBufferViews = views;
  }
  let view = views[key];
  if (view === undefined) {
    view = new Float32Array(buffer.getBuffer());
    views[key] = view;
  }
  return view;
};

/**
 * The bindings as the mapper reads them: a program of STRIDE numbers per
 * binding in a typed array (react-native-worklets copies it once, as one
 * block, where an array of objects would be serialized object by object)
 * and the shared values in a flat array, referenced by index.
 *
 * [kind, offset, value, a, b, c, d, e, f, g, h]:
 * - 0 number: value * a
 * - 1 translate: value
 * - 2 point: value.x, value.y
 * - 3 transform: the affine of value, with the origin (b, c) when a is 1
 * - 4 rect: x, y, x + width, y + height from (a, b, c, d), each a value
 *   index or -1 for the constant in (e, f, g, h)
 */
const STRIDE = 11;

interface Program {
  program: Float64Array;
  values: SharedValue<unknown>[];
}

const encodeBindings = (bindings: Binding[]): Program => {
  const program = new Float64Array(bindings.length * STRIDE);
  const values: SharedValue<unknown>[] = [];
  const indices = new Map<unknown, number>();
  // The shared values of every binding, whatever they hold.
  const indexOf = (sharedValue: unknown) => {
    const value = sharedValue as SharedValue<unknown>;
    let index = indices.get(value);
    if (index === undefined) {
      index = values.length;
      values.push(value);
      indices.set(value, index);
    }
    return index;
  };
  const source = (value: number | SharedValue<number>) =>
    typeof value === "number" ? [-1, value] : [indexOf(value), 0];
  bindings.forEach((binding, i) => {
    const o = i * STRIDE;
    program[o + 1] = binding.offset;
    switch (binding.kind) {
      case "number":
        program[o] = 0;
        program[o + 2] = indexOf(binding.value);
        program[o + 3] = binding.scale;
        break;
      case "translate":
        program[o] = 1;
        program[o + 2] = indexOf(binding.value);
        break;
      case "point":
        program[o] = 2;
        program[o + 2] = indexOf(binding.value);
        break;
      case "transform":
        program[o] = 3;
        program[o + 2] = indexOf(binding.value);
        program[o + 3] = binding.origin ? 1 : 0;
        program[o + 4] = binding.origin?.x ?? 0;
        program[o + 5] = binding.origin?.y ?? 0;
        break;
      case "rect": {
        program[o] = 4;
        const [xi, xc] = source(binding.x);
        const [yi, yc] = source(binding.y);
        const [wi, wc] = source(binding.width);
        const [hi, hc] = source(binding.height);
        program[o + 3] = xi;
        program[o + 4] = yi;
        program[o + 5] = wi;
        program[o + 6] = hi;
        program[o + 7] = xc;
        program[o + 8] = yc;
        program[o + 9] = wc;
        program[o + 10] = hc;
        break;
      }
      default:
        break;
    }
  });
  return { program, values };
};

/** Writes the current value of every binding into the buffer. */
const writeBindings = (
  f32: Float32Array,
  program: Float64Array,
  values: SharedValue<unknown>[]
) => {
  "worklet";
  const read = (index: number, constant: number) =>
    index < 0 ? constant : (values[index].value as number);
  for (let o = 0; o < program.length; o += STRIDE) {
    const offset = program[o + 1];
    switch (program[o]) {
      case 0:
        f32[offset] = (values[program[o + 2]].value as number) * program[o + 3];
        break;
      case 1:
        f32[offset] = values[program[o + 2]].value as number;
        break;
      case 2: {
        const p = values[program[o + 2]].value as Vector;
        f32[offset] = p.x;
        f32[offset + 1] = p.y;
        break;
      }
      case 3: {
        const m = affineOf(
          values[program[o + 2]].value as Transforms3d,
          program[o + 3] === 1 ? { x: program[o + 4], y: program[o + 5] } : null
        );
        f32[offset] = m[0];
        f32[offset + 1] = m[1];
        f32[offset + 2] = m[2];
        f32[offset + 3] = m[3];
        f32[offset + 4] = m[4];
        f32[offset + 5] = m[5];
        break;
      }
      case 4: {
        const x = read(program[o + 3], program[o + 7]);
        const y = read(program[o + 4], program[o + 8]);
        f32[offset] = x;
        f32[offset + 1] = y;
        f32[offset + 2] = x + read(program[o + 5], program[o + 9]);
        f32[offset + 3] = y + read(program[o + 6], program[o + 10]);
        break;
      }
      default:
        break;
    }
  }
};

/**
 * Experimental: compiles the scene graph into a command buffer on every
 * commit (Compiler.ts) and hands the buffer to the view, which the render
 * thread pool replays. The animated values are written into their slots by
 * a Reanimated mapper on the UI runtime, which then asks the view for a
 * frame: the same memory, wrapped for that runtime, with no copy.
 */
export class CommandBufferContainer extends Container {
  private api = getExperimentalApi();
  private cache: PaintCache;
  private compiler: Compiler;
  private buffer: ExperimentalCommandBuffer | null = null;
  private f32: Float32Array | null = null;
  private mapperId: number | null = null;
  private installTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    Skia: Skia,
    nativeId: number,
    private options: CommandBufferContainerOptions
  ) {
    super(Skia, nativeId);
    this.cache = new PaintCache(Skia, this.api);
    this.compiler = new Compiler(this.cache);
  }

  private stopMapper() {
    if (this.mapperId !== null) {
      Rea.stopMapper(this.mapperId);
      this.mapperId = null;
    }
  }

  unmount() {
    super.unmount();
    this.stopMapper();
    if (this.installTimeout !== null) {
      clearTimeout(this.installTimeout);
      this.installTimeout = null;
    }
    if (this.nativeId !== -1) {
      this.api.clearViewContent(this.nativeId);
    }
    // Not disposed: stopMapper() takes effect on the UI thread later, and a
    // last run of the mapper may still reach the buffer. The wrapper goes
    // with the garbage collector, the native memory with its last wrapper.
    this.buffer = null;
    this.f32 = null;
  }

  protected drawFrame(canvas: SkCanvas) {
    if (!this.buffer) {
      throw new Error("No command buffer to draw");
    }
    this.buffer.replay(canvas);
  }

  private ensureBuffer(capacity: number) {
    if (this.buffer && this.buffer.getCapacity() >= capacity) {
      return;
    }
    // The previous buffer is not disposed, for the same reason as in
    // unmount().
    this.buffer = this.api.makeCommandBuffer(capacity);
    this.f32 = new Float32Array(this.buffer.getBuffer());
  }

  redraw() {
    this.stopMapper();
    if (this.unmounted) {
      return;
    }
    const start = performance.now();
    // Grown on demand: a scene that does not fit is compiled again into a
    // buffer twice the size.
    let capacity = Math.max(this.buffer?.getCapacity() ?? 0, 4096);
    let compilation;
    for (;;) {
      this.ensureBuffer(capacity);
      try {
        compilation = this.compiler.compile(this.root, this.f32!);
        break;
      } catch (error) {
        if (error instanceof CapacityError) {
          capacity *= 2;
          continue;
        }
        throw error;
      }
    }
    const compiled = performance.now();
    const buffer = this.buffer!;
    const { count, bindings } = compilation;
    buffer.commit(count);
    if (this.nativeId !== -1) {
      this.install();
      if (bindings.length > 0) {
        if (!HAS_REANIMATED_4) {
          throw new Error("The command buffer container needs Reanimated 4");
        }
        const stats = globalThis.__RNSkiaRecorderStats;
        const timer = this.options.mapperTimer;
        const { program, values } = encodeBindings(bindings);
        this.mapperId = Rea.startMapper(() => {
          "worklet";
          const t0 = timer ? performance.now() : 0;
          const f32 = viewOf(buffer);
          writeBindings(f32, program, values);
          buffer.commit(count);
          if (timer && stats) {
            stats.addSample(timer, (performance.now() - t0) * 1000);
          }
        }, values);
      }
    }
    const installed = performance.now();
    this.options.onCommit?.({
      compileMs: compiled - start,
      installMs: installed - compiled,
      count,
      bindings: bindings.length,
      paintsCreated: compilation.paintsCreated,
      shadersCreated: compilation.shadersCreated,
    });
  }

  /**
   * Hands the buffer to the view. The native view may register after the
   * first commit (the platform mounts it on its own thread): try again a
   * little later until it has.
   */
  private install() {
    if (this.installTimeout !== null) {
      clearTimeout(this.installTimeout);
      this.installTimeout = null;
    }
    const { buffer, nativeId } = this;
    if (!buffer) {
      return;
    }
    const asPicture = this.options.mode === "picture";
    if (!this.api.setViewContent(nativeId, buffer, asPicture)) {
      this.installTimeout = setTimeout(() => {
        this.installTimeout = null;
        if (!this.unmounted) {
          this.install();
        }
      }, 16);
    }
  }
}
