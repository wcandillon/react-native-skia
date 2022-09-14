import React from "react";

import type { PictureProps } from "../../dom/types";
import type { SkiaProps } from "../processors";

export const Picture = (props: SkiaProps<PictureProps>) => {
  return <skPicture {...props} />;
};
