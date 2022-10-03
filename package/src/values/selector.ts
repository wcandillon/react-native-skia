import type { SkiaValue } from "./types";

export type SkiaSelector<TReturn, TInput = unknown> = {
  value: SkiaValue<TInput>;
  selector: (v: TInput) => TReturn;
};

/**
 * Wraps a Skia Value with a selector function. The selector function can access the
 * inner values of the Skia Value so that we can dynamically ready array values and
 * object values when doing animations in Skia.
 * @param value Dependant value
 * @param selector Selector function to calculate new value from the Skia Value's value
 * @returns A descriptor that will be used by the reconciler to calculate the value
 */
export const Selector = <TInput, TReturn>(
  value: SkiaValue<TInput>,
  selector: (v: TInput) => TReturn
): SkiaSelector<TReturn, TInput> => {
  return {
    selector,
    value,
  };
};
