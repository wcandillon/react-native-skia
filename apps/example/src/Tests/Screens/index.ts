import type { FC } from "react";

import { Snapshot1 } from "./Snapshot1";
import { Snapshot2 } from "./Snapshot2";
import { Snapshot3 } from "./Snapshot3";
import { Snapshot4 } from "./Snapshot4";
import { Snapshot5 } from "./Snapshot5";

export const Screens: Record<string, FC> = {
  Snapshot1,
  Snapshot2,
  Snapshot3,
  Snapshot4,
  Snapshot5,
};
