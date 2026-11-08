/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SharedValue } from "react-native-reanimated";

import { NodeType } from "../../dom/types";
import type { Skia, SkRect, Transforms3d, Vector } from "../../skia/types";
import { processTransform3d, TileMode } from "../../skia/types";
import type { Node } from "../Node";
import { sortNodeChildren } from "../Node";
import { isSharedValue } from "../utils";

import { CommandOp } from "./Experimental";
import type { ExperimentalApi } from "./Experimental";

/**
 * Experimental: compiles the scene graph into a command buffer (see
 * Experimental.ts). This is the minimal compiler of the recorder benchmark:
 * it covers <Group>, <Circle>, <Rect>, <Fill> and a <LinearGradient> child,
 * with the paint semantics of the native recorder (an inherited paint, an
 * opacity multiplied down the tree, a color that clears an inherited shader,
 * children sorted on zIndex, a clip rect). Anything else throws: the point
 * is to measure, not to replace the renderer.
 *
 * A shared value in a prop becomes a binding: the offset of the float(s) it
 * drives in the buffer, written by a mapper on the UI runtime on every
 * change (see Container.ts). Transforms are bound two ways: a shared value
 * holding the whole transform array, as the recorder accepts, which the
 * mapper turns into a matrix on every frame; and a transform array whose
 * entries hold shared values, which binds each entry straight to its slot.
 */

export type Binding =
  | {
      kind: "number";
      value: SharedValue<number>;
      offset: number;
      /** The static factor the value is multiplied by (an opacity). */
      scale: number;
    }
  | {
      kind: "point";
      value: SharedValue<Vector>;
      offset: number;
    }
  | {
      kind: "transform";
      value: SharedValue<Transforms3d>;
      offset: number;
      origin: Vector | null;
    }
  | {
      kind: "translate";
      value: SharedValue<number>;
      /** The offset of the e (x) or f (y) operand of the Concat. */
      offset: number;
    }
  | {
      kind: "rect";
      offset: number;
      x: number | SharedValue<number>;
      y: number | SharedValue<number>;
      width: number | SharedValue<number>;
      height: number | SharedValue<number>;
    };

export interface Compilation {
  /** The number of floats written. */
  count: number;
  bindings: Binding[];
  /** How many paints the paint cache made for this compilation. */
  paintsCreated: number;
  shadersCreated: number;
}

interface PaintState {
  color: [number, number, number, number];
  /** The product of the opacities of the ancestors, baked into the alpha. */
  opacity: number;
  /** The animated opacities of the ancestors: each one needs a SetAlpha. */
  animatedOpacities: SharedValue<number>[];
  strokeWidth: number;
  style: number;
  shader: number;
}

/**
 * Paints and shaders by their resolved value, kept across commits: a
 * recompilation reuses the paint of an unchanged node instead of making a
 * new one, as a real compiler would diff. Handles are never released in
 * this prototype.
 */
export class PaintCache {
  private paints = new Map<string, number>();
  private shaders = new Map<string, number>();
  private colors = new Map<string, [number, number, number, number]>();
  paintsCreated = 0;
  shadersCreated = 0;

  constructor(
    private Skia: Skia,
    private api: ExperimentalApi
  ) {}

  color(value: unknown): [number, number, number, number] {
    let key: string;
    if (typeof value === "string") {
      key = value;
    } else if (typeof value === "number") {
      key = `#${value}`;
    } else {
      key = Array.from(value as ArrayLike<number>).join(",");
    }
    let color = this.colors.get(key);
    if (!color) {
      const c = this.Skia.Color(value as string);
      color = [c[0], c[1], c[2], c[3]];
      this.colors.set(key, color);
    }
    return color;
  }

  linearGradient(props: Record<string, any>) {
    const { start, end, colors, positions, mode } = props;
    const key = `lg|${start.x},${start.y}|${end.x},${end.y}|${colors.join(
      "/"
    )}|${positions ? positions.join("/") : ""}|${mode ?? ""}`;
    let handle = this.shaders.get(key);
    if (handle === undefined) {
      const shader = this.Skia.Shader.MakeLinearGradient(
        start,
        end,
        colors.map((c: unknown) => this.Skia.Color(c as string)),
        positions ?? null,
        tileMode(mode)
      );
      handle = this.api.registerShader(shader);
      this.shaders.set(key, handle);
      this.shadersCreated++;
    }
    return handle;
  }

  /**
   * The handle of a paint with these values. A paint whose alpha a shared
   * value drives is not shared: SetAlpha writes into it on every frame.
   */
  paint(state: PaintState, shared: boolean) {
    const [r, g, b, a] = state.color;
    const color = argb(r, g, b, a * state.opacity);
    // Integers only: formatting a float takes longer than the lookup.
    const key = `${color}|${state.strokeWidth}|${state.style}|${state.shader}`;
    let handle = shared ? this.paints.get(key) : undefined;
    if (handle === undefined) {
      handle = this.api.createPaint();
      this.api.setColor(handle, color);
      if (state.strokeWidth !== 0) {
        this.api.setStrokeWidth(handle, state.strokeWidth);
      }
      if (state.style !== 0) {
        this.api.setStyle(handle, state.style);
      }
      if (state.shader !== -1) {
        this.api.setShader(handle, state.shader);
      }
      this.paintsCreated++;
      if (shared) {
        this.paints.set(key, handle);
      }
    }
    return handle;
  }
}

const tileModes: Record<string, TileMode> = {
  clamp: TileMode.Clamp,
  repeat: TileMode.Repeat,
  mirror: TileMode.Mirror,
  decal: TileMode.Decal,
};

const tileMode = (mode: string | undefined) =>
  mode === undefined ? TileMode.Clamp : (tileModes[mode] ?? TileMode.Clamp);

const argb = (r: number, g: number, b: number, a: number) => {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  // Unsigned: a JS bitwise or would make 0xFF... negative.
  return c(a) * 0x1000000 + c(r) * 0x10000 + c(g) * 0x100 + c(b);
};

class Writer {
  count = 0;
  constructor(private buffer: Float32Array) {}

  /** One float; a rest parameter would allocate an array per call. */
  push(value: number) {
    if (this.count >= this.buffer.length) {
      throw new CapacityError();
    }
    this.buffer[this.count++] = value;
  }

  write(
    a: number,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
    g?: number
  ) {
    this.push(a);
    if (b !== undefined) {
      this.push(b);
    }
    if (c !== undefined) {
      this.push(c);
    }
    if (d !== undefined) {
      this.push(d);
    }
    if (e !== undefined) {
      this.push(e);
    }
    if (f !== undefined) {
      this.push(f);
    }
    if (g !== undefined) {
      this.push(g);
    }
  }

  /** Reserves `n` operands for a binding; returns the offset of the first. */
  reserve(n: number) {
    if (this.count + n > this.buffer.length) {
      throw new CapacityError();
    }
    const offset = this.count;
    this.count += n;
    return offset;
  }

  /** Writes the static value of a reserved operand. */
  set(offset: number, value: number) {
    this.buffer[offset] = value;
  }
}

/** The buffer is too small for the scene: the caller grows it and retries. */
export class CapacityError extends Error {
  constructor() {
    super("The command buffer is full");
  }
}

const unsupported = (what: string): never => {
  throw new Error(`The command buffer compiler does not support ${what}`);
};

const affine = (m: ReadonlyArray<number>) =>
  // The 4x4 is row major: [a c . e; b d . f; ...].
  [m[0], m[4], m[1], m[5], m[3], m[7]] as const;

const withOrigin = (
  [a, b, c, d, e, f]: readonly [number, number, number, number, number, number],
  origin: Vector | null
) => {
  if (!origin) {
    return [a, b, c, d, e, f] as const;
  }
  // T(origin) * M * T(-origin)
  return [
    a,
    b,
    c,
    d,
    e + origin.x - a * origin.x - c * origin.y,
    f + origin.y - b * origin.x - d * origin.y,
  ] as const;
};

/**
 * The affine matrix of a transform array and an origin, as the Concat
 * operands. Runs on the UI runtime too (a transform held by a shared value).
 */
export const affineOf = (transforms: Transforms3d, origin: Vector | null) => {
  "worklet";
  const m = processTransform3d(transforms);
  const a = m[0];
  const b = m[4];
  const c = m[1];
  const d = m[5];
  const e = m[3];
  const f = m[7];
  if (!origin) {
    return [a, b, c, d, e, f];
  }
  return [
    a,
    b,
    c,
    d,
    e + origin.x - a * origin.x - c * origin.y,
    f + origin.y - b * origin.x - d * origin.y,
  ];
};

export class Compiler {
  private writer!: Writer;
  private bindings: Binding[] = [];

  constructor(private cache: PaintCache) {}

  compile(root: Node[], buffer: Float32Array): Compilation {
    this.writer = new Writer(buffer);
    this.bindings = [];
    const created = this.cache.paintsCreated;
    const shaders = this.cache.shadersCreated;
    const paint: PaintState = {
      color: [0, 0, 0, 1],
      opacity: 1,
      animatedOpacities: [],
      strokeWidth: 0,
      style: 0,
      shader: -1,
    };
    this.visitChildren(root, paint);
    return {
      count: this.writer.count,
      bindings: this.bindings,
      paintsCreated: this.cache.paintsCreated - created,
      shadersCreated: this.cache.shadersCreated - shaders,
    };
  }

  private visitChildren(children: Node[], paint: PaintState) {
    // The recorder plays the groups of a level in zIndex order (stable).
    const sorted = children.every((c) => (c.props as any).zIndex === undefined)
      ? children
      : children
          .map((node, order) => ({ node, order }))
          .sort((x, y) => {
            const zx = (x.node.props as any).zIndex ?? 0;
            const zy = (y.node.props as any).zIndex ?? 0;
            return zx === zy ? x.order - y.order : zx - zy;
          })
          .map(({ node }) => node);
    sorted.forEach((node) => this.visitNode(node, paint));
  }

  private visitNode(node: Node<any>, inherited: PaintState) {
    const props = node.props as Record<string, any>;
    const { drawings, shaders, paints, colorFilters, imageFilters } =
      sortNodeChildren(node);
    if (paints.length > 0) {
      unsupported("<Paint> children");
    }
    if (colorFilters.length > 0 || imageFilters.length > 0) {
      unsupported("filters");
    }
    // The paint of this node: the inherited one, overridden by its props.
    const paint: PaintState = {
      ...inherited,
      animatedOpacities: inherited.animatedOpacities,
    };
    let alphaAnimated: SharedValue<number> | null = null;
    if (props.opacity !== undefined) {
      if (isSharedValue<number>(props.opacity)) {
        alphaAnimated = props.opacity;
        paint.animatedOpacities = [
          ...inherited.animatedOpacities,
          alphaAnimated,
        ];
      } else {
        paint.opacity = inherited.opacity * props.opacity;
      }
    }
    if (props.color !== undefined) {
      if (isSharedValue(props.color)) {
        unsupported("an animated color");
      }
      paint.color = this.cache.color(props.color);
      // As the recorder: a color clears an inherited shader.
      paint.shader = -1;
    }
    if (props.strokeWidth !== undefined) {
      if (isSharedValue(props.strokeWidth)) {
        unsupported("an animated strokeWidth");
      }
      paint.strokeWidth = props.strokeWidth;
    }
    if (props.style !== undefined) {
      paint.style = props.style === "stroke" ? 1 : 0;
    }
    shaders.forEach((shader) => {
      if (shader.type !== NodeType.LinearGradient) {
        unsupported(`the shader ${shader.type}`);
      }
      paint.shader = this.cache.linearGradient(
        shader.props as Record<string, any>
      );
    });
    if (paint.animatedOpacities.length > 1) {
      unsupported("nested animated opacities");
    }

    // CTM
    let saved = false;
    if (props.transform !== undefined || props.matrix !== undefined) {
      this.writer.write(CommandOp.Save);
      saved = true;
      this.writeConcat(props);
    }
    if (props.clip !== undefined) {
      if (!saved) {
        this.writer.write(CommandOp.Save);
        saved = true;
      }
      const { clip } = props;
      if (typeof clip !== "object" || clip === null || !("width" in clip)) {
        unsupported("a clip that is not a rect");
      }
      const rect = clip as SkRect;
      this.writer.write(
        CommandOp.ClipRect,
        rect.x,
        rect.y,
        rect.x + rect.width,
        rect.y + rect.height
      );
    }

    // Drawing
    switch (node.type) {
      case NodeType.Group:
        break;
      case NodeType.Circle:
        this.drawCircle(props, paint);
        break;
      case NodeType.Rect:
        this.drawRect(props, paint);
        break;
      case NodeType.Fill:
        this.writer.write(CommandOp.DrawPaint, this.paintHandle(paint));
        break;
      default:
        unsupported(`the node ${node.type}`);
    }

    this.visitChildren(drawings, paint);

    if (saved) {
      this.writer.write(CommandOp.Restore);
    }
  }

  /**
   * The paint handle of a drawing, with a SetAlpha bound to the animated
   * opacity of the node or its ancestor when there is one.
   */
  private paintHandle(paint: PaintState) {
    const animated = paint.animatedOpacities[0];
    const handle = this.cache.paint(paint, animated === undefined);
    if (animated !== undefined) {
      this.writer.write(CommandOp.SetAlpha, handle);
      const offset = this.writer.reserve(1);
      this.bindings.push({
        kind: "number",
        value: animated,
        offset,
        scale: paint.color[3] * paint.opacity,
      });
    }
    return handle;
  }

  private writeConcat(props: Record<string, any>) {
    const origin: Vector | null = props.origin ?? null;
    if (isSharedValue(origin)) {
      unsupported("an animated origin");
    }
    if (props.matrix !== undefined) {
      if (isSharedValue(props.matrix)) {
        unsupported("an animated matrix");
      }
      const m: number[] =
        typeof props.matrix.get === "function"
          ? props.matrix.get()
          : props.matrix;
      const [a, b, c, d, e, f] =
        m.length === 9
          ? withOrigin([m[0], m[3], m[1], m[4], m[2], m[5]], origin)
          : withOrigin(affine(m), origin);
      this.writer.write(CommandOp.Concat, a, b, c, d, e, f);
      return;
    }
    const { transform } = props;
    if (isSharedValue<Transforms3d>(transform)) {
      this.writer.write(CommandOp.Concat);
      const offset = this.writer.reserve(6);
      this.bindings.push({
        kind: "transform",
        value: transform,
        offset,
        origin,
      });
      return;
    }
    const transforms = transform as Transforms3d;
    // Translations only, static or not: the common case needs no matrix.
    let e = 0;
    let f = 0;
    let eValue: SharedValue<number> | null = null;
    let fValue: SharedValue<number> | null = null;
    let translationsOnly = true;
    for (let i = 0; i < transforms.length && translationsOnly; i++) {
      const t = transforms[i] as Record<string, unknown>;
      if ("translateX" in t) {
        const value = t.translateX;
        if (isSharedValue<number>(value)) {
          eValue = value;
        } else {
          e += value as number;
        }
      } else if ("translateY" in t) {
        const value = t.translateY;
        if (isSharedValue<number>(value)) {
          fValue = value;
        } else {
          f += value as number;
        }
      } else {
        translationsOnly = false;
      }
    }
    if (translationsOnly && !origin) {
      this.writer.write(CommandOp.Concat, 1, 0, 0, 1);
      const offset = this.writer.reserve(2);
      this.writer.set(offset, e);
      this.writer.set(offset + 1, f);
      if (eValue) {
        this.bindings.push({ kind: "translate", value: eValue, offset });
      }
      if (fValue) {
        this.bindings.push({
          kind: "translate",
          value: fValue,
          offset: offset + 1,
        });
      }
      return;
    }
    const hasNested = transforms.some((t) =>
      Object.values(t).some((v) => isSharedValue(v))
    );
    if (!hasNested) {
      const [a, b, c, d, te, tf] = withOrigin(
        affine(processTransform3d(transforms)),
        origin
      );
      this.writer.write(CommandOp.Concat, a, b, c, d, te, tf);
      return;
    }
    unsupported(
      "a shared value in a transform entry other than translateX or translateY, or an origin with one"
    );
  }

  private drawCircle(props: Record<string, any>, paint: PaintState) {
    const handle = this.paintHandle(paint);
    this.writer.write(CommandOp.DrawCircle);
    if (props.c !== undefined) {
      if (isSharedValue<Vector>(props.c)) {
        const offset = this.writer.reserve(2);
        this.bindings.push({ kind: "point", value: props.c, offset });
      } else {
        this.writer.write(props.c.x, props.c.y);
      }
    } else {
      this.scalar(props.cx ?? 0);
      this.scalar(props.cy ?? 0);
    }
    this.scalar(props.r);
    this.writer.write(handle);
  }

  private drawRect(props: Record<string, any>, paint: PaintState) {
    const handle = this.paintHandle(paint);
    this.writer.write(CommandOp.DrawRect);
    if (props.rect !== undefined) {
      if (isSharedValue(props.rect)) {
        unsupported("an animated rect");
      }
      const { x, y, width, height } = props.rect as SkRect;
      this.writer.write(x, y, x + width, y + height);
    } else {
      const x = props.x ?? 0;
      const y = props.y ?? 0;
      const { width, height } = props;
      if (
        isSharedValue(x) ||
        isSharedValue(y) ||
        isSharedValue(width) ||
        isSharedValue(height)
      ) {
        const offset = this.writer.reserve(4);
        this.bindings.push({ kind: "rect", offset, x, y, width, height });
      } else {
        this.writer.write(x, y, x + width, y + height);
      }
    }
    this.writer.write(handle);
  }

  private scalar(value: number | SharedValue<number>) {
    if (isSharedValue<number>(value)) {
      const offset = this.writer.reserve(1);
      this.bindings.push({ kind: "number", value, offset, scale: 1 });
    } else {
      this.writer.write(value);
    }
  }
}
