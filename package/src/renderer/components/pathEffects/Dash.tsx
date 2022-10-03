import React from "react";

import type { DashPathEffectProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const DashPathEffect = (props: SkiaProps<DashPathEffectProps>) => {
  return <skDashPathEffect {...props} />;
};
