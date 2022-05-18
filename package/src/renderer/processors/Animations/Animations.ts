import { useEffect, useMemo } from "react";

import type { SkiaReadonlyValue } from "../../../values";
import type { DrawingContext } from "../../DrawingContext";
import { mapKeys } from "../../typeddash";

export type FrameValue<T> = (ctx: DrawingContext) => T;

export const isValue = (
  value: unknown
): value is SkiaReadonlyValue<unknown> => {
  if (value === undefined || value === null) {
    return false;
  }
  try {
    if (
      typeof value === "object" &&
      "__typename__" in value &&
      (value as unknown as SkiaReadonlyValue<unknown>).__typename__ ===
        "RNSkValue"
    ) {
      return true;
    }
  } catch {}
  return false;
};

export const isAnimated = <T>(props: AnimatedProps<T>) => {
  for (const value of Object.values(props)) {
    if (isValue(value)) {
      return true;
    }
  }
  return false;
};

export const materialize = <T>(props: AnimatedProps<T>) => {
  const result = { ...props };
  mapKeys(props).forEach((key) => {
    const value = props[key];
    if (isValue(value)) {
      result[key] = (value as SkiaReadonlyValue<T[typeof key]>).current;
    }
  });
  return result as T;
};

export type AnimatedProps<T> = {
  [K in keyof T]: T[K] | SkiaReadonlyValue<T[K]>;
};
