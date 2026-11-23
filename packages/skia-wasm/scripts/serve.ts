/**
 * Serves this package over http://localhost, which browsers treat as a secure
 * context: WebGPU is not exposed to pages opened from file://.
 */
import fs from "fs";
import http from "http";
import path from "path";

import { PackageRoot } from "./skia";

const Port = Number(process.env.PORT ?? 8790);

const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const file = path.join(PackageRoot, path.normalize(pathname));
    // normalize() resolves ".." segments; anything still outside is refused.
    if (!file.startsWith(PackageRoot + path.sep) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    if (fs.statSync(file).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(Port, "localhost", () => {
    console.log(`http://localhost:${Port}/smoke/index.html`);
  });
