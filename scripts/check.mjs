import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

for (const file of ["index.html", "src/tclk.mjs", "src/app.mjs", "src/styles.css", "dist/app.js", "vendor/tclk/UPSTREAM.md"]) {
  readFileSync(file, "utf8");
}

const html = readFileSync("index.html", "utf8");
if (!html.includes('src="dist/app.js"')) {
  throw new Error("index.html must load the bundled GitHub Pages entrypoint");
}

for (const file of readdirSync("tests")) {
  if (!file.endsWith(".mjs")) continue;
  readFileSync(join("tests", file), "utf8");
}

console.log("Static checks passed.");
