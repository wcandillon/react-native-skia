import { Image, PixelRatio } from "react-native";
import { getAssetByID } from "react-native-web/dist/modules/AssetRegistry";

// react-native-web does not support resolveAssetSource out of the box
// https://github.com/necolas/react-native-web/issues/1666
function resolveAssetUri(source) {
  let uri = null;
  if (typeof source === "number") {
    // get the URI from the packager
    const asset = getAssetByID(source);
    if (asset == null) {
      throw new Error(
        `Image: asset with ID "${source}" could not be found. Please check the image source or packager.`
      );
    }
    // eslint-disable-next-line prefer-destructuring
    let scale = asset.scales[0];
    if (asset.scales.length > 1) {
      const preferredScale = PixelRatio.get();
      // Get the scale which is closest to the preferred scale
      scale = asset.scales.reduce((prev, curr) =>
        Math.abs(curr - preferredScale) < Math.abs(prev - preferredScale)
          ? curr
          : prev
      );
    }
    const scaleSuffix = scale !== 1 ? `@${scale}x` : "";
    uri = asset
      ? `${asset.httpServerLocation}/${asset.name}${scaleSuffix}.${asset.type}`
      : "";
  } else if (typeof source === "string") {
    uri = source;
  } else if (source && typeof source.uri === "string") {
    // eslint-disable-next-line prefer-destructuring
    uri = source.uri;
  }

  if (uri) {
    const svgDataUriPattern = /^(data:image\/svg\+xml;utf8,)(.*)/;
    const match = uri.match(svgDataUriPattern);
    // inline SVG markup may contain characters (e.g., #, ") that need to be escaped
    if (match) {
      const [, prefix, svg] = match;
      const encodedSvg = encodeURIComponent(svg);
      return `${prefix}${encodedSvg}`;
    }
  }

  return uri;
}

Image.resolveAssetSource = (source) => {
  const uri = resolveAssetUri(source) || "";
  return { uri };
};
