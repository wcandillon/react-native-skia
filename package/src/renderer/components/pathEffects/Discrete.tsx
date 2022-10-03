import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { DiscretePathEffectProps } from "../../../dom/types";

export const DiscretePathEffect = (
  props: SkiaProps<DiscretePathEffectProps>
) => {
  return <skDiscretePathEffect {...props} />;
};

DiscretePathEffect.defaultProps = {
  seed: 0,
};
