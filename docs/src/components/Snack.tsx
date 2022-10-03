/* global  HTMLDivElement */
import React, { useEffect, useRef } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { useColorMode } from "@docusaurus/theme-common";

import { ExpoSnack } from "./ExpoSnackApi";

interface SnackProps {
  id: string;
}

export const Snack = ({ id }: SnackProps) => {
  const { colorMode } = useColorMode();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ExpoSnack.remove(ref.current!);
    ExpoSnack.append(ref.current!);
  }, [colorMode]);
  return (
    <div
      ref={ref}
      data-snack-id={id}
      data-snack-platform="web"
      data-snack-preview="true"
      data-snack-theme={colorMode === "dark" ? "dark" : "light"}
      style={{
        overflow: "hidden",
        background: "#f9f9f9",
        border: "1px solid var(--color-border)",
        borderRadius: 4,
        height: 505,
        width: "100%",
      }}
    />
  );
};
