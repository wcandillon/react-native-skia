import type { FC } from "react";

import { Empty } from "./Empty";
import { GpuReplacement } from "./GpuReplacement";
import { GraphiteView, GraphiteViewTransform } from "./GraphiteView";
import { IsOnMainThread } from "./IsOnMainThread";
import { OnLayout } from "./OnLayout";
import { ResizeGrow, ResizeShrink } from "./Resize";
import { SharedImage } from "./SharedImage";
import { SharedValueReads } from "./SharedValueReads";

export const Screens: Record<string, FC> = {
  Empty,
  GpuReplacement,
  GraphiteView,
  GraphiteViewTransform,
  IsOnMainThread,
  OnLayout,
  ResizeGrow,
  ResizeShrink,
  SharedImage,
  SharedValueReads,
};
