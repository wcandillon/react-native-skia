import { useEffect, useRef, useState } from "react";
import { Image } from "react-native";

import { Skia } from "../Skia";
import { isRNModule } from "../types";
import type { SkData, DataModule, DataSourceParam } from "../types";

const resolveAsset = (source: DataModule) => {
  return isRNModule(source)
    ? Image.resolveAssetSource(source).uri
    : source.default;
};

const factoryWrapper = <T>(
  data2: SkData,
  factory: (data: SkData) => T,
  onError?: (err: Error) => void
) => {
  const factoryResult = factory(data2);
  if (factoryResult === null) {
    onError && onError(new Error("Could not load data"));
    return null;
  } else {
    return factoryResult;
  }
};

const loadData = <T>(
  source: DataSourceParam,
  factory: (data: SkData) => T,
  onError?: (err: Error) => void
): Promise<T | null> => {
  if (source === null || source === undefined) {
    return new Promise((resolve) => resolve(null));
  } else if (source instanceof Uint8Array) {
    return new Promise((resolve) =>
      resolve(factoryWrapper(Skia.Data.fromBytes(source), factory, onError))
    );
  } else {
    const uri = typeof source === "string" ? source : resolveAsset(source);
    return Skia.Data.fromURI(uri).then((d) =>
      factoryWrapper(d, factory, onError)
    );
  }
};
const useLoading = <T>(
  source: DataSourceParam,
  loader: () => Promise<T | null>
) => {
  const mounted = useRef(false);
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    mounted.current = true;
    loader().then((value) => {
      if (mounted.current) {
        setData(value);
      }
    });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  return data;
};

export const useRawData = <T>(
  source: DataSourceParam,
  factory: (data: SkData) => T,
  onError?: (err: Error) => void
) => useLoading(source, () => loadData(source, factory, onError));

const identity = (data: SkData) => data;

export const useData = (
  source: DataSourceParam,
  onError?: (err: Error) => void
) => useRawData(source, identity, onError);
