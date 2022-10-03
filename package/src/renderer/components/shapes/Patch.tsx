import React from "react";

import type { SkiaProps } from "../../processors";
import type { PatchProps } from "../../../dom/types";

export const Patch = (props: SkiaProps<PatchProps>) => {
  return <skPatch {...props} />;
};
