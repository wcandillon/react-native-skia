import type { ReactNode } from "react";
import React from "react";

import type { GroupProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";
import { Group } from "../Group";

export interface BackdropFilterProps extends GroupProps {
  filter: ReactNode | ReactNode[];
}

export const BackdropFilter = ({
  filter,
  children: groupChildren,
  ...props
}: SkiaProps<BackdropFilterProps, "filter">) => {
  return (
    <Group {...props}>
      <skBackdropFilter>{filter}</skBackdropFilter>
      {groupChildren}
    </Group>
  );
};
