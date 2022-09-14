import React from "react";

import type { CustomDrawingNodeProps } from "../../dom/types";

export const Drawing = (props: CustomDrawingNodeProps) => {
  return <skDrawing {...props} />;
};
