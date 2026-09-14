import type { SharedValue } from "react-native-reanimated";

import { mapKeys } from "../renderer/typeddash";

export const isSharedValue = <T = unknown>(
  value: unknown
): value is SharedValue<T> => {
  "worklet";
  // We cannot use `in` operator here because `value` could be a HostObject and therefore we cast.
  return (value as Record<string, unknown>)?._isReanimatedSharedValue === true;
};

export const isSharedValueSelector = (
  value: unknown
): value is { __sv: SharedValue<unknown>; __key: string } => {
  "worklet";
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return isSharedValue(obj.__sv) && typeof obj.__key === "string";
};

export const materialize = <T extends object>(props: T) => {
  "worklet";
  const result: T = Object.assign({}, props);
  mapKeys(result).forEach((key) => {
    const value = result[key];
    if (isSharedValue(value)) {
      result[key] = value.value as never;
    } else if (isSharedValueSelector(value)) {
      const group = value.__sv.value;
      result[key] = (
        group && typeof group === "object"
          ? (group as Record<string, unknown>)[value.__key]
          : undefined
      ) as never;
    }
  });
  return result;
};

type Composer<T> = (outer: T, inner: T) => T;

export const composeDeclarations = <T>(filters: T[], composer: Composer<T>) => {
  "worklet";
  const len = filters.length;
  if (len <= 1) {
    return filters[0];
  }
  return filters.reduceRight((inner, outer) =>
    inner ? composer(outer, inner) : outer
  );
};
