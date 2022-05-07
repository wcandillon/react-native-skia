import type {
  SkiaAnimation,
  AnimationState,
  SkiaReadonlyValue,
  SkiaClockValue,
  SkiaValue,
} from "./types";

export interface ISkiaValueApi {
  /**
   * Creates a new value that holds the initial value and that
   * can be changed.
   */
  createValue: <T>(initialValue: T) => SkiaValue<T>;
  /**
   * Creates a derived value. This is a calculated value that returns the result of
   * a function that is called with the values of the dependencies.
   */
  createDerivedValue: <R>(
    cb: () => R,
    values: Array<SkiaReadonlyValue<unknown>>
  ) => SkiaReadonlyValue<R>;
  /**
   * Creates a clock value where the value is the number of milliseconds elapsed
   * since the clock was created
   */
  createClockValue: () => SkiaClockValue;
  /**
   * Creates an animation that is driven from a clock and updated every frame.
   * @param cb Callback to calculate next value from time.
   * @returns An animation object that can control a value.
   */
  createAnimation: <S extends AnimationState = AnimationState>(
    cb: (t: number, state: S | undefined) => S
  ) => SkiaAnimation;
}

declare global {
  var SkiaValueApi: ISkiaValueApi;
}

export const ValueApi: ISkiaValueApi = {
  createValue: () => ({}),
  createDerivedValue: () => ({}),
  createClockValue: () => ({}),
  createAnimation: () => ({}),
};

export const { createValue, createDerivedValue } = ValueApi;
