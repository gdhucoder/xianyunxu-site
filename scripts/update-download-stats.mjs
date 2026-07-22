import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildDownloadStats, isCollectionDue } from "./download-stats-lib.mjs";

const outputPath = fileURLToPath(new URL("../src/data/download-stats.json", import.meta.url));
const args = process.argv.slice(2);
const force = args.includes("--force");
const dueIndex = args.indexOf("--if-due-days");
const intervalDays = dueIndex >= 0 ? Number.parseInt(args[dueIndex + 1] ?? "5", 10) : 5;

if (!Number.isInteger(intervalDays) || intervalDays < 1) {
  throw new Error("--if-due-days must be a positive integer");
}

let previous = null;
try {
  previous = JSON.parse(await readFile(outputPath, "utf8"));
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error)?.code !== "ENOENT") throw error;
}

const generatedAt = new Date().toISOString();
if (!force && !isCollectionDue(previous?.generatedAt, generatedAt, intervalDays)) {
  console.log(`Download statistics are not due yet. Last snapshot: ${previous.generatedAt}`);
  process.exit(0);
}

async function fetchPublishedReleases() {
  /** @type {import("./download-stats-lib.mjs").GitHubRelease[]} */
  const releases = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/gdhucoder/xianyun-releases/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "xianyunxu-site-download-stats",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub Releases request failed: ${response.status} ${response.statusText}`);
    }

    const pageItems = await response.json();
    if (!Array.isArray(pageItems)) throw new Error("GitHub Releases response was not an array");
    releases.push(...pageItems);
    if (pageItems.length < 100) break;
  }
  return releases;
}

const releases = await fetchPublishedReleases();
const stats = buildDownloadStats({ releases, previous, generatedAt, intervalDays });
await writeFile(outputPath, `${JSON.stringify(stats, null, 2)}\n`, "utf8");

console.log(
  `Saved ${stats.versions.length} app releases, ${stats.models.length} model releases, and ${stats.snapshots.length} snapshots.`,
);
