import React from "react";

import type { SkiaProps } from "../../processors";
import type { TextBlobProps } from "../../../dom/types";

export const TextBlob = (props: SkiaProps<TextBlobProps>) => {
  return <skTextBlob {...props} />;
};

TextBlob.defaultProps = {
  x: 0,
  y: 0,
};
