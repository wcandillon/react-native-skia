import React from "react";

import type { SkiaProps } from "../../processors";
import type { LineProps } from "../../../dom/types";

export const Line = (props: SkiaProps<LineProps>) => {
  return <skLine {...props} />;
};
