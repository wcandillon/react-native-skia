import { useMemo } from "react";

import { ValueApi } from "../api";
import { isValue } from "../../renderer/processors/Animations";

/**
 * Creates a new computed value - a value that will calculate its value depending
 * on other values.
 * @param cb Callback to calculate new value
 * @param values Dependant values
 * @returns A readonly value
 */
export const useComputedValue = <R>(cb: () => R, values: unknown[]) =>
  useMemo(
    () => ValueApi.createComputedValue<R>(cb, values.filter(isValue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    values
  );
