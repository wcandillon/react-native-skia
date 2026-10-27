import type { FC } from "react";

import { GraphiteView, GraphiteViewTransform } from "./GraphiteView";
import { IsOnMainThread } from "./IsOnMainThread";
import { OnLayout } from "./OnLayout";
import { ResizeGrow, ResizeShrink } from "./Resize";
import { SharedImage } from "./SharedImage";
import { SharedValueReads } from "./SharedValueReads";

export const Screens: Record<string, FC> = {
  GraphiteView,
  GraphiteViewTransform,
  IsOnMainThread,
  OnLayout,
  ResizeGrow,
  ResizeShrink,
  SharedImage,
  SharedValueReads,
};
