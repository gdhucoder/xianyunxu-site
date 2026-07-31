import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateManifest } from "./download-manifest-lib.mjs";
import { buildWebsiteReleaseUpdate, releaseApiUrl } from "./release-sync-lib.mjs";
import { syncWebsiteScreenshots } from "./website-screenshot-sync-lib.mjs";

const manifestPath = fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url));
const changelogPath = fileURLToPath(new URL("../src/content/changelog/current.md", import.meta.url));
const screenshotsPath = fileURLToPath(new URL("../public/assets/screenshots", import.meta.url));
/** @type {Record<string, string>} */
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "xianyunxu-site-release-sync",
  "X-GitHub-Api-Version": "2022-11-28",
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const response = await fetch(releaseApiUrl, { headers });
if (!response.ok) {
  throw new Error(`GitHub latest release request failed: HTTP ${response.status}`);
}

const release = await response.json();
const currentManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const update = buildWebsiteReleaseUpdate(release, currentManifest);
const errors = validateManifest(update.manifest);
if (errors.length) throw new Error(`refusing to write invalid manifest:\n${errors.join("\n")}`);

await writeFile(manifestPath, `${JSON.stringify(update.manifest, null, 2)}\n`, "utf8");
await writeFile(changelogPath, update.changelog, "utf8");
const screenshots = await syncWebsiteScreenshots(release, screenshotsPath);
console.log(`Website release metadata synchronized to v${update.version}; ${screenshots.length} screenshot assets refreshed.`);
