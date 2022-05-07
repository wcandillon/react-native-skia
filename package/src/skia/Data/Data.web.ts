import type { DependencyList } from "react";
import { useEffect, useState } from "react";

import type { SkJSIInstance } from "../JsiInstance";
import { Skia } from "../Skia";

export type Data = SkJSIInstance<"Data">;

type Require = number;
export type DataSource = Require | string | Uint8Array;

export const useDataCollection = <T>(
  sources: DataSource[],
  factory: (data: Data[]) => T,
  deps: DependencyList = []
) => {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    const bytesOrURIs = sources.map((source) => {
      if (source instanceof Uint8Array) {
        return source;
      }
      return typeof source === "string" ? source : null; // TODO: RNWEB Image.resolveAssetSource(source).uri;
    });
    Promise.all(
      bytesOrURIs.map((bytesOrURI) =>
        bytesOrURI instanceof Uint8Array
          ? Skia.Data.fromBytes(bytesOrURI)
          : Skia.Data.fromURI(bytesOrURI)
      )
    ).then((d) => setData(factory(d)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
};

export const useRawData = <T>(
  source: DataSource,
  factory: (data: Data) => T
) => {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (source instanceof Uint8Array) {
      setData(factory(Skia.Data.fromBytes(source)));
    } else {
      const uri =
        typeof source === "string"
          ? source
          : Image.resolveAssetSource(source).uri;
      Skia.Data.fromURI(uri).then((d) => setData(factory(d)));
    }
  }, [factory, source]);
  return data;
};

const identity = (data: Data) => data;

export const useData = (source: DataSource) => useRawData(source, identity);
