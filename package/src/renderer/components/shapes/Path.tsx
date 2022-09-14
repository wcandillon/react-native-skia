import React from "react";

import type { SkiaProps } from "../../processors";
import type { PathProps } from "../../../dom/types";

export const Path = (props: SkiaProps<PathProps>) => {
  return <skPath {...props} />;
};

Path.defaultProps = {
  start: 0,
  end: 1,
};
