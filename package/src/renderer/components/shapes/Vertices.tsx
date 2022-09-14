import React from "react";

import type { SkiaProps } from "../../processors";
import type { VerticesProps } from "../../../dom/types";

export const Vertices = (props: SkiaProps<VerticesProps>) => {
  return <skVertices {...props} />;
};

Vertices.defaultProps = {
  mode: "triangles",
};
