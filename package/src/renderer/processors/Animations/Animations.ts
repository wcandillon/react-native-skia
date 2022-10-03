import type { SkiaSelector, SkiaValue } from "../../../values";

export const isValue = (value: unknown): value is SkiaValue<unknown> => {
  if (value === undefined || value === null) {
    return false;
  }
  try {
    if (
      typeof value === "object" &&
      "__typename__" in value &&
      (value as unknown as SkiaValue<unknown>).__typename__ === "RNSkValue"
    ) {
      return true;
    }
  } catch {}
  return false;
};

export const isSelector = <T, R>(
  value: unknown
): value is {
  selector: (v: T) => R;
  value: SkiaValue<T>;
} => {
  if (value) {
    return (
      typeof value === "object" &&
      "selector" in value &&
      "value" in value &&
      (value as Record<string, unknown>).selector !== undefined &&
      (value as Record<string, unknown>).value !== undefined
    );
  }
  return false;
};

export const isAnimated = <T>(props: AnimatedProps<T>) => {
  for (const value of Object.values(props)) {
    if (isValue(value) || isSelector(value)) {
      return true;
    }
  }
  return false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnimatedProp<T, P = any> = T | SkiaValue<T> | SkiaSelector<T, P>;

export type AnimatedProps<T, O extends keyof T | never = never> = {
  [K in keyof T]: K extends "children"
    ? T[K]
    : K extends O
    ? T[K]
    : AnimatedProp<T[K]>;
};

// TODO: switch to AnimatedProps<GroupProps> and remove duplicate properties.
// For instance matrix in color filter becomes colorMatrix

export type SkiaProps<
  P = object,
  O extends keyof P | never = never
> = AnimatedProps<P, O>;
