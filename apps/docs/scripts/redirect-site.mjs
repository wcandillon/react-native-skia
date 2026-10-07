// Turns a built docs site into redirect stubs pointing to another origin.
// GitHub Pages has no server-side redirects, so every page becomes an HTML file
// with an instant meta refresh + canonical link (treated as a permanent redirect
// by search engines), and 404.html redirects any other path.
// Usage: node scripts/redirect-site.mjs <buildDir> <targetOrigin>
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const [buildDir, targetOrigin] = process.argv.slice(2);
if (!buildDir || !targetOrigin) {
  console.error("Usage: node redirect-site.mjs <buildDir> <targetOrigin>");
  process.exit(1);
}
const origin = targetOrigin.replace(/\/$/, "");
const baseUrl = "/react-native-skia/";

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const pages = walk(buildDir)
  .filter((file) => file.endsWith(".html") && !file.endsWith("404.html"))
  .map((file) => relative(buildDir, file).split(sep).join("/"));

const stub = (target) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>React Native Skia has moved</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head>
<body>
<p>React Native Skia documentation has moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

for (const page of pages) {
  // docs/foo/index.html -> /react-native-skia/docs/foo (matches Docusaurus canonical URLs)
  const path = page.replace(/(^|\/)index\.html$/, "").replace(/\/$/, "");
  const target = `${origin}${baseUrl}${path}`;
  const out = join(buildDir, page);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, stub(target));
}

writeFileSync(
  join(buildDir, "404.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>React Native Skia has moved</title>
<meta name="robots" content="noindex">
<script>location.replace(${JSON.stringify(origin)} + location.pathname + location.search + location.hash);</script>
</head>
<body>
<p>React Native Skia documentation has moved to <a href="${origin}${baseUrl}">${origin}${baseUrl}</a>.</p>
</body>
</html>
`
);
writeFileSync(join(buildDir, ".nojekyll"), "");

console.log(`Wrote ${pages.length} redirect stubs to ${origin}`);
