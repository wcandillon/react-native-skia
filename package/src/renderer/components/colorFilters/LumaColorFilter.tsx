import React from "react";

import type { ChildrenProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const LumaColorFilter = (props: SkiaProps<ChildrenProps>) => {
  return <skLumaColorFilter {...props} />;
};
