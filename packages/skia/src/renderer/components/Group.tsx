import React, { isValidElement } from "react";

import type { SkiaProps } from "../processors";
import type { GroupProps } from "../../dom/types";
import type { ChildrenProps } from "../../dom/types/Common";

export interface PublicGroupProps extends Omit<GroupProps, "layer"> {
  layer?: GroupProps["layer"] | ChildrenProps["children"];
}

export const Group = ({
  layer,
  backdropFilter,
  saveLayerFlags,
  ...props
}: SkiaProps<PublicGroupProps>) => {
  if (isValidElement(layer) && typeof layer === "object") {
    return (
      // keep the saveLayerFlags on whichever node triggers saveLayer
      <skLayer backdropFilter={backdropFilter} saveLayerFlags={saveLayerFlags}>
        {layer}
        <skGroup {...props} />
      </skLayer>
    );
  }
  return (
    <skGroup
      layer={layer as GroupProps["layer"]}
      backdropFilter={backdropFilter}
      saveLayerFlags={saveLayerFlags}
      {...props}
    />
  );
};
