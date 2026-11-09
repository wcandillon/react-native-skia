import type { FC } from "react";

import {
  ClippedSubviewsBack,
  ClippedSubviewsSharedValueChanged,
  ClippedSubviewsStateChanged,
  ClippedSubviewsTwice,
} from "./ClippedSubviews";
import { Empty } from "./Empty";
import { GpuReplacement } from "./GpuReplacement";
import { GraphiteView, GraphiteViewTransform } from "./GraphiteView";
import { IsOnMainThread } from "./IsOnMainThread";
import { OnLayout } from "./OnLayout";
import { ResizeGrow, ResizeShrink } from "./Resize";
import { SharedImage } from "./SharedImage";
import { SharedValueReads } from "./SharedValueReads";

// When Tests snapshots a screen: once it is mounted, or once it says it has
// settled (see useScreenDone), which it does anew each time it is requested.
export interface Screen {
  readonly snapshot: "onMount" | "onDone";
  readonly component: FC;
}

const shown = (component: FC): Screen => ({ snapshot: "onMount", component });
const settling = (component: FC): Screen => ({
  snapshot: "onDone",
  component,
});

export const Screens: Readonly<Record<string, Screen>> = {
  ClippedSubviewsBack: settling(ClippedSubviewsBack),
  ClippedSubviewsSharedValueChanged: settling(
    ClippedSubviewsSharedValueChanged
  ),
  ClippedSubviewsStateChanged: settling(ClippedSubviewsStateChanged),
  ClippedSubviewsTwice: settling(ClippedSubviewsTwice),
  Empty: shown(Empty),
  GpuReplacement: shown(GpuReplacement),
  GraphiteView: shown(GraphiteView),
  GraphiteViewTransform: shown(GraphiteViewTransform),
  IsOnMainThread: shown(IsOnMainThread),
  OnLayout: shown(OnLayout),
  ResizeGrow: shown(ResizeGrow),
  ResizeShrink: shown(ResizeShrink),
  SharedImage: shown(SharedImage),
  SharedValueReads: shown(SharedValueReads),
};
