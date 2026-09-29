import { useEffect, useState } from "react";
import { Image } from "react-native";
import { Skia, useSVG } from "@shopify/react-native-skia";
import type { SkSVG } from "@shopify/react-native-skia";

/** SVGs of different complexity for the multiple views benchmark. */
export type SvgKind = "tiger" | "tigerFills" | "octocat";
export const SVG_KINDS: SvgKind[] = ["tiger", "tigerFills", "octocat"];
export const SVG_LABELS: Record<SvgKind, string> = {
  tiger: "Tiger",
  tigerFills: "Tiger, fills only",
  octocat: "Octocat",
};

/** The asset's text (Metro serves it over http in development). */
const useSvgText = (source: number) => {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const { uri } = Image.resolveAssetSource(source);
    fetch(uri)
      .then((response) => response.text())
      .then(setText)
      .catch((error) => console.warn(`could not load svg: ${error}`));
  }, [source]);
  return text;
};

/**
 * The tiger (240 paths, most with a fill and a stroke), the same tiger with
 * every stroke removed (fills only, so Graphite's tessellation and atlas do
 * half the work), and the octocat (5 filled paths, many curves).
 */
export const useSvgs = (): Record<SvgKind, SkSVG | null> => {
  const tigerText = useSvgText(require("../../../assets/tiger.svg"));
  const octocat = useSVG(require("../../../assets/icons8-octocat.svg"));
  const [tiger, setTiger] = useState<SkSVG | null>(null);
  const [tigerFills, setTigerFills] = useState<SkSVG | null>(null);
  useEffect(() => {
    if (!tigerText) {
      return;
    }
    setTiger(Skia.SVG.MakeFromString(tigerText));
    setTigerFills(
      Skia.SVG.MakeFromString(
        tigerText.replace(/stroke:#[0-9a-fA-F]+/g, "stroke:none")
      )
    );
  }, [tigerText]);
  return { tiger, tigerFills, octocat };
};
