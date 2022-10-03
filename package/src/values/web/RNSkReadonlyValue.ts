import type { SkiaValue } from "../types";

export class RNSkReadonlyValue<T> implements SkiaValue<T> {
  constructor(value: T) {
    this._current = value;
  }

  private _current: T;
  private _listeners: Array<(value: T) => void> = [];

  private notifyListeners(): void {
    this._listeners.forEach((cb) => cb(this._current));
  }

  protected update(nextValue: T): void {
    this._current = nextValue;
    this.notifyListeners();
  }

  public readonly __typename__ = "RNSkValue";

  public get current(): T {
    return this._current;
  }

  public addListener(cb: (value: T) => void) {
    this._listeners.push(cb);
    return () => {
      this._listeners.splice(this._listeners.indexOf(cb), 1);
    };
  }

  public __invalidate(): void {
    this._listeners = [];
  }
}
