/**
 * @format
 */
import { AppRegistry } from "react-native";

import App from "./src/App";
import { name as appName } from "./app.json";
import { RELOAD_STRESS_TEST } from "./src/ReloadStress/config";

if (!Symbol.dispose) {
  Symbol.dispose = Symbol.for("Symbol.dispose");
}

if (RELOAD_STRESS_TEST) {
  // Reproduction for https://github.com/Shopify/react-native-skia/issues/4003
  // — see src/ReloadStress/README.md
  const { ReloadStressApp } = require("./src/ReloadStress/ReloadStressApp");
  AppRegistry.registerComponent(appName, () => ReloadStressApp);
} else {
  AppRegistry.registerComponent(appName, () => App);
}
