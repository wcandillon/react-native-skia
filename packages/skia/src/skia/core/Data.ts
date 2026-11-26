import { useEffect, useRef, useState } from "react";

import { Skia } from "../Skia";
import type { SkData, DataSourceParam, SkJSIInstance } from "../types";
import { Platform } from "../../Platform";

/**
 * Loads the bytes of `source` and makes an object of them with `factory`.
 * Resolves to null for a null source; rejects with what loading the bytes
 * or the factory raised (a SkiaDecodeError for bytes the factory cannot
 * decode, say).
 */
export const loadData = <T>(
  source: DataSourceParam,
  factory: (data: SkData) => T
): Promise<T | null> => {
  if (source === null || source === undefined) {
    return Promise.resolve(null);
  } else if (source instanceof Uint8Array) {
    return new Promise((resolve) =>
      resolve(factory(Skia.Data.fromBytes(source)))
    );
  } else {
    const uri =
      typeof source === "string" ? source : Platform.resolveAsset(source);
    return Skia.Data.fromURI(uri).then((d) => factory(d));
  }
};

export const reportError = (err: unknown, onError?: (err: Error) => void) => {
  const error = err instanceof Error ? err : new Error(String(err));
  if (onError) {
    onError(error);
  } else {
    console.warn(error);
  }
};

export const useLoading = <T extends SkJSIInstance<string>>(
  source: DataSourceParam,
  loader: () => Promise<T | null>,
  onError?: (err: Error) => void
) => {
  const mounted = useRef(false);
  const [data, setData] = useState<T | null>(null);
  const dataRef = useRef<T | null>(null);
  useEffect(() => {
    mounted.current = true;
    loader().then(
      (value) => {
        if (mounted.current) {
          setData(value);
          dataRef.current = value;
        }
      },
      (err) => {
        if (mounted.current) {
          setData(null);
          dataRef.current = null;
        }
        reportError(err, onError);
      }
    );
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  return data;
};

export const useRawData = <T extends SkJSIInstance<string>>(
  source: DataSourceParam,
  factory: (data: SkData) => T,
  onError?: (err: Error) => void
) => useLoading(source, () => loadData<T>(source, factory), onError);

const identity = (data: SkData) => data;

export const useData = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, identity, onError);
