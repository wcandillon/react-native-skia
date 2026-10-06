import { Skia, TileMode } from "react-native-skia";
import React from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SerializedProps {
  [key: string]: any;
}

export interface SerializedNode {
  type: string;
  props: SerializedProps;
  children: SerializedNode[];
}

type Assets = { [name: string]: any };

export const parseNode = (
  serializedNode: SerializedNode,
  assets: Assets
): any => {
  const { type, props, children } = serializedNode;
  return React.createElement(
    type,
    { ...parseProps(props, assets), key: `${Math.random()}` },
    children.map((child) => parseNode(child, assets))
  );
};

export const parseProps = (props: SerializedProps, assets: Assets) => {
  const newProps: SerializedProps = {};
  Object.keys(props).forEach((key) => {
    const value = parseProp(props[key], assets);
    newProps[key] = value;
  });
  return newProps;
};

const parseProp = (value: any, assets: Assets): any => {
  if (value && typeof value === "object" && "__typename__" in value) {
    if (value.__typename__ === "Float32Array") {
      return new Float32Array(value.value);
    } else if (value.__typename__ === "Paint") {
      const paint = Skia.Paint();
      paint.setColor(Float32Array.of(...value.color));
      return paint;
    }
    if (value.__typename__ === "Point") {
      return Skia.Point(value.x, value.y);
    } else if (value.__typename__ === "Rect") {
      return Skia.XYWHRect(value.x, value.y, value.width, value.height);
    } else if (value.__typename__ === "RRect") {
      return Skia.RRectXY(
        Skia.XYWHRect(value.x, value.y, value.width, value.height),
        value.rx,
        value.ry
      );
    } else if (value.__typename__ === "Path") {
      return Skia.Path.MakeFromCmds(value.cmds);
    } else if (value.__typename__ === "RawImage") {
      return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(value.data));
    } else if (value.__typename__ === "Image") {
      const asset = assets[value.name];
      if (!asset) {
        throw new Error(`Asset ${value.name} not found`);
      }
      if (asset.value) {
        return asset.value;
      }
      return asset;
    } else if (value.__typename__ === "RuntimeEffect") {
      return Skia.RuntimeEffect.Make(value.source);
    } else if (value.__typename__ === "SVG") {
      return Skia.SVG.MakeFromString(value.source);
    } else if (value.__typename__ === "SkiaObject") {
      return eval(
        `(function Main(){return (${value.source})(this.Skia, this.ctx); })`
      ).call({
        Skia,
        ctx: parseProps(value.context, assets),
      });
    } else if (value.__typename__ === "Font") {
      const asset = assets[value.name];
      if (!asset) {
        throw new Error(`Asset ${value.name} not found`);
      }
      return Skia.Font(asset, value.size);
    } else if (value.__typename__ === "RSXform") {
      return Skia.RSXform(value.scos, value.ssin, value.tx, value.ty);
    } else if (value.__typename__ === "SkottieAnimation") {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const assets: any = {};
      if (value.assets) {
        Object.keys(value.assets).forEach((key) => {
          assets[key] = Skia.Data.fromBytes(new Uint8Array(value.assets[key]));
        });
      }
      return Skia.Skottie.Make(value.source, assets);
    } else if (value.__typename__ === "Function") {
      return eval(
        `(function Main(){ const {Skia, TileMode} = this; return (${value.source}); })`
      ).call({
        Skia,
        TileMode,
      });
    }
  } else if (Array.isArray(value)) {
    return value.map((v) => parseProp(v, assets));
  } else if (value && typeof value === "object") {
    const parsed: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      parsed[key] = parseProp(value[key], assets);
    });
    return parsed;
  }
  return value;
};
