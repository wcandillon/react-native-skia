import { execFileSync } from "child_process";

import { testPort } from "./globalSetup";

// Left on the device, the mapping keeps a retrying app reaching this machine.
const removeReversedPort = (port: number) => {
  try {
    execFileSync("adb", ["reverse", "--remove", `tcp:${port}`], {
      stdio: "ignore",
    });
  } catch {
    // Not an Android run, or adb is unavailable.
  }
};

const globalTeardown = () => {
  if (process.env.E2E !== "true") {
    return;
  }
  global.testServer.clients.forEach((client) => client.close());
  global.testServer.close();
  removeReversedPort(testPort());
};

// eslint-disable-next-line import/no-default-export
export default globalTeardown;
