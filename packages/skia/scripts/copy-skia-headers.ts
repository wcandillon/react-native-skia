import { copyHeaders } from "./skia-configuration";

// Surface preparation/copy errors before CI proceeds to compile the package.
copyHeaders().catch((error: Error) => {
  console.error(`Skia header copy failed: ${error.message}`);
  process.exitCode = 1;
});
