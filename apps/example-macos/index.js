/**
 * Reuse the shared demo gallery with macOS navigation and dependencies.
 */
import { AppRegistry } from "react-native";

import App from "../example/src/App";

import { name as appName } from "./app.json";

if (!Symbol.dispose) {
  Symbol.dispose = Symbol.for("Symbol.dispose");
}

AppRegistry.registerComponent(appName, () => App);
