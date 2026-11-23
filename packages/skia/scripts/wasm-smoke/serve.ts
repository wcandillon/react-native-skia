/**
 * Serves the built smoke test over http://localhost, which browsers treat as
 * a secure context: WebGPU is not exposed to pages opened from file://.
 */
import fs from "fs";
import http from "http";
import path from "path";

import { SmokeDir } from "./build";

const port = Number(process.env.PORT ?? 8792);

const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const file = path.join(SmokeDir, path.normalize(pathname));
    // normalize() resolves ".." segments; anything still outside is refused.
    if (
      !file.startsWith(SmokeDir + path.sep) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, "localhost", () => {
    console.log(`http://localhost:${port}/index.html`);
  });
