import type * as WorkletsT from "react-native-worklets";

import {
  OptionalDependencyNotInstalledError,
  createModuleProxy,
} from "../ModuleProxy";
type TWorklets = typeof WorkletsT;

export const Worklets = createModuleProxy<TWorklets>(() => {
  try {
    return require("react-native-worklets");
  } catch (e) {
    throw new OptionalDependencyNotInstalledError("react-native-worklets");
  }
});
