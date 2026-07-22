import assert from "node:assert/strict";
import test from "node:test";
import { buildDownloadStats, isCollectionDue, summarizeReleases } from "./download-stats-lib.mjs";

const releases = [
  {
    tag_name: "v0.1.5",
    published_at: "2026-07-20T00:00:00Z",
    draft: false,
    assets: [
      { name: "App_0.1.5_aarch64.dmg", download_count: 2 },
      { name: "App_0.1.5_x64-setup.exe", download_count: 3 },
      { name: "App_0.1.5_aarch64.app.tar.gz", download_count: 4 },
      { name: "latest.json", download_count: 9 },
      { name: "App_0.1.5_aarch64.app.tar.gz.sig", download_count: 20 },
    ],
  },
  {
    tag_name: "model-sensevoice-small-q8-macos-arm64-v1",
    published_at: "2026-07-19T00:00:00Z",
    draft: false,
    assets: [
      { name: "sensevoice-small-q8.gguf", download_count: 5 },
      { name: "runtime.tar.gz", download_count: 8 },
      { name: "INSTALLATION.md", download_count: 12 },
    ],
  },
];

test("classifies app, updater, metadata, and model downloads without counting signatures", () => {
  const result = summarizeReleases(releases);
  assert.deepEqual(result.totals, {
    macosInstallerDownloads: 2,
    windowsPackageDownloads: 3,
    identifiableUpdateDownloads: 4,
    updateMetadataDownloads: 9,
    modelDownloads: 5,
    appPackageDownloads: 9,
  });
  assert.equal(result.versions[0]?.appPackageDownloads, 9);
  assert.equal(result.models[0]?.modelDownloads, 5);
});

test("appends a compact cumulative snapshot", () => {
  const stats = buildDownloadStats({
    releases,
    previous: { snapshots: [{ capturedAt: "2026-07-01T00:00:00Z", macosInstallerDownloads: 1 }] },
    generatedAt: "2026-07-21T00:00:00Z",
    intervalDays: 5,
  });
  assert.equal(stats.snapshots.length, 2);
  assert.equal(stats.snapshots[1]?.windowsPackageDownloads, 3);
});

test("requires the complete configured interval before collecting again", () => {
  assert.equal(isCollectionDue("2026-07-01T00:00:00Z", "2026-07-05T23:59:59Z", 5), false);
  assert.equal(isCollectionDue("2026-07-01T00:00:00Z", "2026-07-06T00:00:00Z", 5), true);
});
