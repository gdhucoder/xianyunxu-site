import { fileURLToPath } from "node:url";
import { readManifest, validateManifest } from "./download-manifest-lib.mjs";

const manifestPath = fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url));
const errors = validateManifest(await readManifest(manifestPath));

if (errors.length > 0) {
  console.error("Download manifest validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Download manifest is valid.");
}
