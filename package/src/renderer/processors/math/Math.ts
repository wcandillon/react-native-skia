/**
 * Linear interpolation
 * @param value
 * @param x
 * @param y
 */
export const mix = (value: number, x: number, y: number) => {
  "worklet";
  return x * (1 - value) + y * value;
};

/**
 *  @summary Clamps a node with a lower and upper bound.
 *  @example
    clamp(-1, 0, 100); // 0
    clamp(1, 0, 100); // 1
    clamp(101, 0, 100); // 100
  */
export const clamp = (value: number, lowerBound: number, upperBound: number) =>
  Math.min(Math.max(lowerBound, value), upperBound);
