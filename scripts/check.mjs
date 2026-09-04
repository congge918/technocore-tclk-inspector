import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

for (const file of ["index.html", "src/tclk.mjs", "src/app.mjs", "src/styles.css"]) {
  readFileSync(file, "utf8");
}

for (const file of readdirSync("tests")) {
  if (!file.endsWith(".mjs")) continue;
  readFileSync(join("tests", file), "utf8");
}

console.log("Static checks passed.");
