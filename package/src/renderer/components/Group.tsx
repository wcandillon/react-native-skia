import React from "react";

import type { SkiaProps } from "../processors";
import type { GroupProps } from "../../dom/types";

export const Group = (props: SkiaProps<GroupProps>) => {
  return <skGroup {...props} />;
};
