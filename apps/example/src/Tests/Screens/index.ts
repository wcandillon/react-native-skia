import type { FC } from "react";

import { GraphiteView, GraphiteViewTransform } from "./GraphiteView";
import { IsOnMainThread } from "./IsOnMainThread";
import { Snapshot1 } from "./Snapshot1";
import { Snapshot2 } from "./Snapshot2";
import { Snapshot3 } from "./Snapshot3";
import { Snapshot4 } from "./Snapshot4";
import { Snapshot5 } from "./Snapshot5";
import { Snapshot6 } from "./Snapshot6";
import { Snapshot7 } from "./Snapshot7";
import { OnLayout } from "./OnLayout";
import { OnSize, OnSizeEmpty } from "./OnSize";

export const Screens: Record<string, FC> = {
  GraphiteView,
  GraphiteViewTransform,
  IsOnMainThread,
  Snapshot1,
  Snapshot2,
  Snapshot3,
  Snapshot4,
  Snapshot5,
  Snapshot6,
  Snapshot7,
  OnLayout,
  OnSize,
  OnSizeEmpty,
};
