const { configureProjects } = require("react-native-test-app");

// Generate only the desktop project with this workspace's native dependencies.
module.exports = {
  project: configureProjects({ macos: { sourceDir: "macos" } }),
  dependencies: {
    // RN macOS runs Apple Codegen as "ios". Exclude WebGPU there as well as
    // from macOS linking so Fabric never registers its missing native view.
    "react-native-webgpu": { platforms: { ios: null, macos: null } },
  },
};
