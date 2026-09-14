import type { SkJSIInstance } from "../JsiInstance";

export type SkData = SkJSIInstance<"Data">;

type RNModule = number;
type MetroAsset = {
  uri: string;
  width: number;
  height: number;
};
type ESModule = {
  __esModule: true;
  default: RNModule | MetroAsset | string;
};

export type DataModule = RNModule | ESModule | MetroAsset;
export type DataSource = DataModule | string | Uint8Array;
export type DataSourceParam = DataSource | null | undefined;

export const isRNModule = (mod: DataModule): mod is RNModule =>
  typeof mod === "number";

// Since Expo SDK 52, on web, require() may return an ES module interop
// object ({ default: <asset> }) instead of the asset itself.
// See https://github.com/Shopify/react-native-skia/issues/2784
export const unwrapModule = (
  mod: DataModule
): RNModule | MetroAsset | string =>
  typeof mod === "object" && mod !== null && "default" in mod
    ? mod.default
    : mod;
