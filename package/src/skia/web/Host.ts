import type { CanvasKit, EmbindEnumEntity } from "canvaskit-wasm";

import type { SkJSIInstance } from "../types";

export class NotImplementedOnRNWeb extends Error {
  constructor(msg?: string) {
    super(msg ?? "Not implemented on React Native Web");
  }
}

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
}

export abstract class HostObject<T, N extends string> extends BaseHostObject<
  T,
  N
> {
  static fromValue<T>(value: SkJSIInstance<string>) {
    return (value as HostObject<T, string>).ref;
  }
}

export const ckEnum = (value: number): EmbindEnumEntity => ({ value });
export const optEnum = (
  value: number | undefined
): EmbindEnumEntity | undefined =>
  value === undefined ? undefined : { value };
