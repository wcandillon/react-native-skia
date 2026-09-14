import type { CSSProperties } from "react";
import React, { useMemo } from "react";
import type { ViewComponent, ViewProps } from "react-native";

import type { DataModule } from "../skia/types";
import { isRNModule, unwrapModule } from "../skia/types";

import type { IPlatform } from "./IPlatform";

// Layout is observed by the views themselves (see SkiaPictureView.web.tsx):
// this shim only reproduces react-native-web's default View styling.
const View = (({ children, style: rawStyle }: ViewProps) => {
  const style = useMemo(() => (rawStyle ?? {}) as CSSProperties, [rawStyle]);
  const cssStyles = useMemo(() => {
    return {
      alignItems: "stretch" as const,
      backgroundColor: "transparent" as const,
      border: "0 solid black" as const,
      boxSizing: "border-box" as const,
      display: "flex" as const,
      flexBasis: "auto" as const,
      flexDirection: "column" as const,
      flexShrink: 0,
      listStyle: "none" as const,
      margin: 0,
      minHeight: 0,
      minWidth: 0,
      padding: 0,
      position: "relative" as const,
      textDecoration: "none" as const,
      zIndex: 0,
      ...style,
    };
  }, [style]);

  return <div style={cssStyles}>{children}</div>;
}) as unknown as typeof ViewComponent;

export const Platform: IPlatform = {
  OS: "web",
  PixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1, // window is not defined on node
  resolveAsset: (source: DataModule) => {
    const asset = unwrapModule(source);
    if (typeof asset === "string") {
      return asset;
    }
    if (isRNModule(asset)) {
      if (typeof require === "function") {
        const {
          getAssetByID,
        } = require("react-native/Libraries/Image/AssetRegistry");
        const { httpServerLocation, name, type } = getAssetByID(asset);
        const uri = `${httpServerLocation}/${name}.${type}`;
        return uri;
      }
      throw new Error(
        "Asset source is a number - this is not supported on the web"
      );
    }
    return asset.uri;
  },
  findNodeHandle: () => {
    throw new Error("findNodeHandle is not supported on the web");
  },
  View,
};
