/// <reference lib="esnext.disposable" preserve="true" />

export interface SkJSIInstance<T extends string> extends Disposable {
  __typename__: T;
  dispose(): void;
}
