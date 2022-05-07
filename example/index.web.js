import { AppRegistry } from "react-native";

import App from "./src/App";
import appInfo from "./app.json";

if (module.hot) {
  module.hot.accept();
}

AppRegistry.registerComponent(appInfo.name, () => App);
AppRegistry.runApplication(appInfo.name, {
  initialProps: {},
  rootTag: document.getElementById("app-root"),
});
