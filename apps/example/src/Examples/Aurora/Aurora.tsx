import React from "react";

import { CoonsPatchMeshGradient } from "./components/CoonsPatchMeshGradient";

export const Aurora = () => {
  return (
    <CoonsPatchMeshGradient
      rows={3}
      cols={3}
      colors={palette.otto}
      lines
      handles
    />
  );
};

const palette = {
  otto: [
    "#FEF8C4",
    "#E1F1D5",
    "#C4EBE5",
    "#ECA171",
    "#FFFCF3",
    "#D4B3B7",
    "#B5A8D2",
    "#F068A1",
    "#EDD9A2",
    "#FEEFAB",
    "#A666C0",
    "#8556E5",
    "#DC4C4C",
    "#EC795A",
    "#E599F0",
    "#96EDF2",
  ],
  will: [
    "#2D4CD2",
    "#36B6D9",
    "#3CF2B5",
    "#37FF5E",
    "#59FB2D",
    "#AFF12D",
    "#DABC2D",
    "#D35127",
    "#D01252",
    "#CF0CAA",
    "#A80DD8",
    "#5819D7",
  ],
  skia: [
    "#61DAFB",
    "#dafb61",
    "#61fbcf",
    "#61DAFB",
    "#fb61da",
    "#61fbcf",
    "#dafb61",
    "#fb61da",
    "#61DAFB",
    "#fb61da",
    "#dafb61",
    "#61fbcf",
    "#fb61da",
    "#61DAFB",
    "#dafb61",
    "#61fbcf",
  ],
};
