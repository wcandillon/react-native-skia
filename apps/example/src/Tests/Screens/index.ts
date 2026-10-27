import type { FC } from "react";

import {
  ClippedStaticBack,
  ClippedStaticSharedValueChanged,
  ClippedStaticStateChanged,
  ClippedStaticTwice,
  ClippedSubviewsBack,
  ClippedSubviewsDeviceLost,
  ClippedSubviewsSharedValueChanged,
  ClippedSubviewsStateChanged,
  ClippedSubviewsTwice,
} from "./ClippedSubviews";
import { GraphiteView, GraphiteViewTransform } from "./GraphiteView";
import { CanvasAboveImageView, ImageView, ImageViewRounded } from "./ImageView";
import { ImageViewMinified, ImageViewMinifiedOdd } from "./ImageViewMinified";
import { ImageViewOversized } from "./ImageViewOversized";
import { ImageViewWide } from "./ImageViewWide";
import { IsOnMainThread } from "./IsOnMainThread";
import { OnLayout } from "./OnLayout";
import { ResizeGrow, ResizeShrink } from "./Resize";
import { SharedImage } from "./SharedImage";
import { SharedValueReads } from "./SharedValueReads";
import {
  CanvasAboveStaticCanvas,
  StaticCanvas,
  StaticCanvasChurn,
} from "./StaticCanvas";

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
  CanvasAboveImageView: shown(CanvasAboveImageView),
  CanvasAboveStaticCanvas: shown(CanvasAboveStaticCanvas),
  ClippedStaticBack: settling(ClippedStaticBack),
  ClippedStaticSharedValueChanged: settling(ClippedStaticSharedValueChanged),
  ClippedStaticStateChanged: settling(ClippedStaticStateChanged),
  ClippedStaticTwice: settling(ClippedStaticTwice),
  ClippedSubviewsBack: settling(ClippedSubviewsBack),
  ClippedSubviewsDeviceLost: settling(ClippedSubviewsDeviceLost),
  ClippedSubviewsSharedValueChanged: settling(
    ClippedSubviewsSharedValueChanged
  ),
  ClippedSubviewsStateChanged: settling(ClippedSubviewsStateChanged),
  ClippedSubviewsTwice: settling(ClippedSubviewsTwice),
  GraphiteView: shown(GraphiteView),
  GraphiteViewTransform: shown(GraphiteViewTransform),
  ImageView: shown(ImageView),
  ImageViewMinified: shown(ImageViewMinified),
  ImageViewMinifiedOdd: shown(ImageViewMinifiedOdd),
  ImageViewOversized: shown(ImageViewOversized),
  ImageViewRounded: shown(ImageViewRounded),
  ImageViewWide: shown(ImageViewWide),
  IsOnMainThread: shown(IsOnMainThread),
  OnLayout: shown(OnLayout),
  ResizeGrow: shown(ResizeGrow),
  ResizeShrink: shown(ResizeShrink),
  SharedImage: shown(SharedImage),
  SharedValueReads: shown(SharedValueReads),
  StaticCanvas: shown(StaticCanvas),
  StaticCanvasChurn: settling(StaticCanvasChurn),
};
