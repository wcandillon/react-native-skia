import type { DependencyList } from "react";

import { RNSkReadonlyValue } from "./RNSkReadonlyValue";

export class RNSkComputedValue<T> extends RNSkReadonlyValue<T> {
  constructor(callback: () => T, dependencies: DependencyList) {
    // Initialize dependencies - we can't call this yet, since
    // super if not called and it requires a start value to be set.
    const unsubscribers: Array<() => void> = [];
    const notifyUpdateRef: { current: (() => void) | undefined } = {
      current: undefined,
    };
    dependencies.forEach((dep) => {
      if (
        dep &&
        typeof dep === "object" &&
        "__typename__" in dep &&
        "addListener" in dep
      ) {
        unsubscribers.push(
          (dep as RNSkReadonlyValue<unknown>).addListener(() =>
            notifyUpdateRef.current?.()
          )
        );
      }
    });
    super(callback());
    this._unsubscribers = unsubscribers;
    notifyUpdateRef.current = this.dependecyUpdated.bind(this);
    this._callback = callback;
  }

  private dependecyUpdated() {
    this.update(this._callback());
  }

  private _callback: () => T;
  private _unsubscribers: Array<() => void>;

  public unsubscribe() {
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
  }

  public __invalidate(): void {
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
  }
}
