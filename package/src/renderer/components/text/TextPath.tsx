import React from "react";

import type { SkiaProps } from "../../processors";
import type { TextPathProps } from "../../../dom/types";

export const TextPath = (props: SkiaProps<TextPathProps>) => {
  return <skTextPath {...props} />;
};

TextPath.defaultProps = {
  initialOffset: 0,
};
