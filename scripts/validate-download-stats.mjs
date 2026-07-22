import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const statsPath = fileURLToPath(new URL("../src/data/download-stats.json", import.meta.url));
const stats = JSON.parse(await readFile(statsPath, "utf8"));
const errors = [];

/** @param {unknown} value */
const nonNegativeInteger = (value) => Number.isInteger(value) && /** @type {number} */ (value) >= 0;

if (stats.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (stats.source?.repository !== "gdhucoder/xianyun-releases") errors.push("unexpected source repository");
if (!Number.isFinite(Date.parse(stats.generatedAt))) errors.push("generatedAt must be an ISO timestamp");
if (!Number.isInteger(stats.collectionIntervalDays) || stats.collectionIntervalDays < 1) {
  errors.push("collectionIntervalDays must be a positive integer");
}

for (const [name, value] of Object.entries(stats.totals ?? {})) {
  if (!nonNegativeInteger(value)) errors.push(`totals.${name} must be a non-negative integer`);
}

if (!Array.isArray(stats.versions) || stats.versions.length === 0) errors.push("versions must not be empty");
if (!Array.isArray(stats.models)) errors.push("models must be an array");
if (!Array.isArray(stats.snapshots) || stats.snapshots.length === 0) errors.push("snapshots must not be empty");

const versionTags = new Set();
for (const version of stats.versions ?? []) {
  if (versionTags.has(version.tagName)) errors.push(`duplicate version ${version.tagName}`);
  versionTags.add(version.tagName);
  for (const field of ["macosInstallerDownloads", "windowsPackageDownloads", "identifiableUpdateDownloads", "updateMetadataDownloads", "appPackageDownloads"]) {
    if (!nonNegativeInteger(version[field])) errors.push(`${version.tagName}.${field} must be a non-negative integer`);
  }
  if (version.appPackageDownloads !== version.macosInstallerDownloads + version.windowsPackageDownloads + version.identifiableUpdateDownloads) {
    errors.push(`${version.tagName}.appPackageDownloads does not match its component counts`);
  }
}

for (const snapshot of stats.snapshots ?? []) {
  if (!Number.isFinite(Date.parse(snapshot.capturedAt))) errors.push("snapshot capturedAt must be an ISO timestamp");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Download statistics are valid: ${stats.versions.length} versions, ${stats.snapshots.length} snapshots.`);
