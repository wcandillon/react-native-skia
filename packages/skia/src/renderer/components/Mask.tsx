import type { ReactNode } from "react";
import React from "react";

import { Group } from "./Group";
import { LumaColorFilter } from "./colorFilters/LumaColorFilter";
import { Paint } from "./Paint";

interface MaskProps {
  mode?: "luminance" | "alpha";
  clip?: boolean;
  mask: ReactNode | ReactNode[];
  children: ReactNode | ReactNode[];
}

export const Mask = ({
  children,
  mask,
  mode = "alpha",
  clip = true,
}: MaskProps) => {
  return (
    <Group layer>
      {children}
      {/* The children composite against each other in the layer above; the
          mask is then applied once, when its own layer is restored. A blend
          mode attached to a <Group> without a layer would instead be applied
          per draw call, compositing every child after the first against the
          previous child rather than against the mask (issue #3254).
          dstIn keeps the children where the mask is opaque and erases them
          where it is transparent. Without clip, dstATop additionally keeps
          the mask artwork itself wherever the children leave it uncovered. */}
      <Group
        layer={
          <Paint blendMode={clip ? "dstIn" : "dstATop"}>
            {mode === "luminance" && <LumaColorFilter />}
          </Paint>
        }
      >
        {mask}
      </Group>
    </Group>
  );
};
