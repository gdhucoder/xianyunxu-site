import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildDownloadStats, isCollectionDue } from "./download-stats-lib.mjs";
import { fetchPublishedReleases } from "./download-stats-client.mjs";

const outputPath = fileURLToPath(new URL("../src/data/download-stats.json", import.meta.url));
const args = process.argv.slice(2);
const force = args.includes("--force");
const dueIndex = args.indexOf("--if-due-days");
const intervalDays = dueIndex >= 0 ? Number.parseInt(args[dueIndex + 1] ?? "1", 10) : 1;

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

const releases = await fetchPublishedReleases({
  token: process.env.GITHUB_TOKEN ?? "",
  requireToken: process.env.GITHUB_ACTIONS === "true",
});
const stats = buildDownloadStats({ releases, previous, generatedAt, intervalDays });
await writeFile(outputPath, `${JSON.stringify(stats, null, 2)}\n`, "utf8");

console.log(
  `Saved ${stats.versions.length} app releases, ${stats.models.length} model releases, and ${stats.snapshots.length} snapshots.`,
);
