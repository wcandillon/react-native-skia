import { AppRegistry } from "react-native";

import App from "./src/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);

const rootTag = document.getElementById("root");

if (process.env.NODE_ENV !== "production") {
  if (!rootTag) {
    throw new Error(
      'Required HTML element with id "root" was not found in the document HTML.'
    );
  }
}

CanvasKitInit({
  locateFile: (file) => `https://unpkg.com/canvaskit-wasm@0.41.1/bin/full/${file}`,
}).then((CanvasKit) => {
  window.CanvasKit = global.CanvasKit = CanvasKit;
  AppRegistry.runApplication(appName, { rootTag });
});
