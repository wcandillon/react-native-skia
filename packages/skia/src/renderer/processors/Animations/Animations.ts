import type { SharedValue } from "react-native-reanimated";

/**
 * Binds a prop to a single key of a "grouped" shared value: one shared value
 * whose `.value` is an object can drive many props (one key each) instead of
 * requiring a separate shared value per prop.
 *
 * Created via {@link select}. `T` is the type of the selected value; `__type`
 * is a phantom marker carrying that type and is never present at runtime.
 */
export type SharedValueSelector<T> = {
  __sv: { value: Record<string, unknown> };
  __key: string;
  readonly __type?: T;
};

export type AnimatedProp<T> = T | { value: T } | SharedValueSelector<T>;

/**
 * Selects a single key of a shared value so it can drive an animated prop.
 * This lets one shared value (whose value is an object) drive multiple props
 * — one per key — instead of using a separate shared value for each.
 *
 * @example
 * const data = useSharedValue({ x: 0, y: 0, r: 10 });
 * <Circle cx={select(data, "x")} cy={select(data, "y")} r={select(data, "r")} />
 */
export const select = <T extends object, K extends keyof T & string>(
  value: SharedValue<T>,
  key: K
): SharedValueSelector<T[K]> => ({
  __sv: value as unknown as { value: Record<string, unknown> },
  __key: key,
});

export type AnimatedProps<T, O extends keyof T | never = never> = {
  [K in keyof T]: K extends "children"
    ? T[K]
    : K extends O
      ? T[K]
      : AnimatedProp<T[K]>;
};

export type SkiaProps<
  P = object,
  O extends keyof P | never = never,
> = AnimatedProps<P, O>;

type WithOptional<T extends object, N extends keyof T> = Omit<T, N> & {
  [K in N]?: T[K];
};

export type SkiaDefaultProps<
  T extends object,
  N extends keyof T,
> = WithOptional<SkiaProps<T>, N>;
