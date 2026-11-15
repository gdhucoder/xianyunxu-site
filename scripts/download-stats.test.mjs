import assert from "node:assert/strict";
import test from "node:test";
import { buildDownloadStats, isCollectionDue, summarizeReleases, validateDownloadSummaryPages } from "./download-stats-lib.mjs";

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
    intervalDays: 1,
  });
  assert.equal(stats.snapshots.length, 2);
  assert.equal(stats.snapshots[1]?.windowsPackageDownloads, 3);
});

test("keeps only the latest snapshot from the same UTC day", () => {
  const stats = buildDownloadStats({
    releases,
    previous: { snapshots: [{ capturedAt: "2026-07-21T00:15:00Z", windowsPackageDownloads: 1 }] },
    generatedAt: "2026-07-21T22:30:00Z",
  });
  assert.equal(stats.snapshots.length, 1);
  assert.equal(stats.snapshots[0]?.capturedAt, "2026-07-21T22:30:00Z");
  assert.equal(stats.snapshots[0]?.windowsPackageDownloads, 3);
});

test("requires the complete configured interval before collecting again", () => {
  assert.equal(isCollectionDue("2026-07-01T00:00:00Z", "2026-07-01T23:59:59Z", 1), false);
  assert.equal(isCollectionDue("2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z", 1), true);
});

test("counts separate Windows lightweight updaters exactly once and excludes their signatures", () => {
  const result = summarizeReleases([{
    tag_name: "v0.1.19", draft: false,
    assets: [
      { name: "App_0.1.19_aarch64.dmg", download_count: 2 },
      { name: "App_0.1.19_x64-setup.exe", download_count: 3 },
      { name: "App_0.1.19_x64-update.exe", download_count: 4 },
      { name: "App_0.1.19_aarch64.app.tar.gz", download_count: 5 },
      { name: "App_0.1.19_x64-update.exe.sig", download_count: 90 },
      { name: "latest.json", download_count: 80 },
      { name: "NOTICE.txt", download_count: 70 },
    ],
  }, {
    tag_name: "model-synthetic-v1", draft: false,
    assets: [{ name: "synthetic.onnx", download_count: 15 }],
  }, {
    tag_name: "v0.2.0", draft: true,
    assets: [{ name: "App_0.2.0_x64-update.exe", download_count: 100 }],
  }]);
  assert.equal(result.totals.windowsPackageDownloads, 3);
  assert.equal(result.totals.identifiableUpdateDownloads, 9);
  assert.equal(result.totals.appPackageDownloads, 14);
  assert.equal(result.totals.modelDownloads, 15);
});

const snapshot = { generatedAt: "2026-11-14T01:53:42.146Z", totals: { appPackageDownloads: 128, modelDownloads: 15 } };

function summary({ count = 128, visible = new Intl.NumberFormat("zh-CN").format(count), generatedAt = snapshot.generatedAt, metric = "appPackageDownloads", source = "github-releases" } = {}) {
  return `<p data-download-summary="${metric}" data-download-source="${source}" data-download-count="${count}" data-stats-updated-at="${generatedAt}">GitHub 累计下载 <strong data-download-count-value>${visible}</strong> 次</p>`;
}

test("home and download pages use the same application-only total and snapshot", () => {
  assert.deepEqual(validateDownloadSummaryPages({ "index.html": summary(), "download/index.html": summary() }, snapshot), []);
});

test("regresses the reported 143-vs-128 mismatch caused by adding 15 model downloads", () => {
  const errors = validateDownloadSummaryPages({ "index.html": summary({ count: 143 }), "download/index.html": summary() }, snapshot);
  assert.match(errors.join("\n"), /index\.html: download count/);
  assert.ok(errors.every(error => error.startsWith("index.html:")));
});

test("matching displayed totals still fail when both incorrectly include model downloads", () => {
  const errors = validateDownloadSummaryPages({ "index.html": summary({ count: 143 }), "download/index.html": summary({ count: 143 }) }, snapshot);
  assert.match(errors.join("\n"), /index\.html: download count/);
  assert.match(errors.join("\n"), /download\/index\.html: download count/);
});

test("checks visible text, not only a correct data attribute", () => {
  assert.match(validateDownloadSummaryPages({ "index.html": summary({ visible: "143" }), "download/index.html": summary() }, snapshot).join("\n"), /visible download count/);
});

test("rejects mixed sources, metrics, snapshot dates and missing summaries", () => {
  for (const { options, expected } of [
    { options: { source: "cnb-and-github" }, expected: /wrong download source/ },
    { options: { metric: "modelDownloads" }, expected: /wrong download metric/ },
    { options: { generatedAt: "2026-11-13T01:53:42.146Z" }, expected: /snapshot date/ },
  ]) {
    assert.match(validateDownloadSummaryPages({ "index.html": summary(options), "download/index.html": summary() }, snapshot).join("\n"), expected);
  }
  assert.match(validateDownloadSummaryPages({ "index.html": "", "download/index.html": summary() }, snapshot).join("\n"), /exactly one application download summary/);
});

test("accepts formatted five-digit totals in real small/span summary markup", () => {
  const value = { generatedAt: snapshot.generatedAt, totals: { appPackageDownloads: 12345 } };
  const html = summary({ count: 12345 });
  const compact = html.replaceAll("<p ", "<small ").replaceAll("</p>", "</small>").replaceAll("strong", "span");
  assert.deepEqual(validateDownloadSummaryPages({ "index.html": html, "download/index.html": compact }, value), []);
});
