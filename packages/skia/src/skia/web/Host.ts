import type { CanvasKit, EmbindEnumEntity } from "canvaskit-wasm";

import type { SkJSIInstance } from "../types";

export const throwNotImplementedOnRNWeb = <T>(): T => {
  if (typeof jest !== "undefined") {
    return jest.fn() as unknown as T;
  }
  throw new Error("Not implemented on React Native Web");
};

export abstract class Host {
  readonly CanvasKit: CanvasKit;

  constructor(CanvasKit: CanvasKit) {
    this.CanvasKit = CanvasKit;
  }
}

export abstract class BaseHostObject<T, N extends string>
  extends Host
  implements SkJSIInstance<N>
{
  readonly __typename__: N;
  ref: T;

  constructor(CanvasKit: CanvasKit, ref: T, typename: N) {
    super(CanvasKit);
    this.ref = ref;
    this.__typename__ = typename;
  }

  abstract dispose(): void;
}

export abstract class HostObject<T, N extends string> extends BaseHostObject<
  T,
  N
> {
  static fromValue<T>(value: SkJSIInstance<string>) {
    return (value as HostObject<T, string>).ref;
  }
}

export const getEnum = (
  CanvasKit: CanvasKit,
  name: keyof CanvasKit,
  v: number
): EmbindEnumEntity => {
  const e = CanvasKit[name];
  if (typeof e !== "function") {
    throw new Error(`${name} is not an number`);
  }
  const result = Object.values(e).find(({ value }) => value === v);
  if (!result) {
    throw new Error(
      `Enum ${name} does not have value ${v} on React Native Web`
    );
  }
  return result;
};

export const optEnum = (
  CanvasKit: CanvasKit,
  name: keyof CanvasKit,
  v: number | undefined
): EmbindEnumEntity | undefined => {
  return v === undefined ? undefined : getEnum(CanvasKit, name, v);
};
