import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readManifest, validateManifest } from "./download-manifest-lib.mjs";

const manifestPath = fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, received: ${argument}`);
  return [match[1], match[2]];
}));

if (!args.platform || !["macos-arm64", "windows-x64"].includes(args.platform)) {
  throw new Error("--platform must be macos-arm64 or windows-x64");
}
if (!args.status || !["available", "preparing", "coming-soon", "unavailable"].includes(args.status)) {
  throw new Error("--status must be available, preparing, coming-soon, or unavailable");
}

const manifest = await readManifest(manifestPath);
const platform = manifest.platforms[args.platform];
platform.status = args.status;

if (args.status === "available") {
  const required = ["version", "published-at", "download-url", "file-name", "size-bytes", "sha256"];
  const missing = required.filter((key) => !args[key]);
  if (missing.length) throw new Error(`available requires: ${missing.map((key) => `--${key}`).join(", ")}`);
  manifest.version = args.version;
  manifest.publishedAt = args["published-at"];
  manifest.releasePageUrl = args["release-page-url"] ?? manifest.releasePageUrl;
  platform.downloadUrl = args["download-url"];
  platform.fileName = args["file-name"];
  platform.sizeBytes = Number(args["size-bytes"]);
  platform.sha256 = args.sha256.toLowerCase();
} else {
  platform.downloadUrl = null;
  platform.fileName = null;
  platform.sizeBytes = null;
  platform.sha256 = null;
}

const errors = validateManifest(manifest);
if (errors.length) throw new Error(`Refusing to write invalid manifest:\n${errors.join("\n")}`);

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Updated ${args.platform} locally. No network request or release-repository change was made.`);
