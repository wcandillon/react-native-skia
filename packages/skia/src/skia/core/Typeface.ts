import { useEffect, useState } from "react";

import { Skia } from "../Skia";
import type { DataSourceParam, SkTypeface } from "../types";

import { loadData } from "./Data";

const tfFactory = Skia.Typeface.MakeFreeTypeFaceFromData.bind(Skia.Typeface);
const typefaces = new Map<DataSourceParam, SkTypeface>();
const loading = new Map<DataSourceParam, Promise<SkTypeface | null>>();

/**
 * Returns a Skia Typeface object
 * */
export const useTypeface = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => {
  const [, setVersion] = useState(0);
  const typeface = typefaces.get(source) ?? null;

  useEffect(() => {
    const cached = typefaces.get(source);
    if (cached || source == null) {
      if (cached && !typeface) setVersion((version) => version + 1);
      return;
    }

    let mounted = true;
    let promise = loading.get(source);
    if (!promise) {
      promise = loadData(source, tfFactory)
        .then((loaded) => {
          if (loaded) typefaces.set(source, loaded);
          return loaded;
        })
        .finally(() => loading.delete(source));
      loading.set(source, promise);
    }
    promise.then((loaded) => {
      if (!mounted) return;
      if (!loaded) onError?.(new Error("Could not load data"));
      else setVersion((version) => version + 1);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return typeface;
};
