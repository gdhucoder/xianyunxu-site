import assert from "node:assert/strict";
import test from "node:test";
import { buildWebsiteReleaseUpdate, extractCurrentReleaseNotes } from "./release-sync-lib.mjs";
import { selectWebsiteScreenshotAssets } from "./website-screenshot-sync-lib.mjs";

const manifest = {
  version: "0.1.5",
  publishedAt: "2026-07-20T00:00:00Z",
  releasePageUrl: "https://github.com/gdhucoder/xianyun-releases/releases/tag/v0.1.5",
  platforms: {
    "macos-arm64": { status: "available", minimumOsVersion: "macOS 10.15" },
    "windows-x64": { status: "available", minimumOsVersion: "Windows 10 x64" },
  },
  models: { "sensevoice-small": { status: "available" } },
};

const release = {
  tag_name: "v0.1.6",
  html_url: "https://github.com/gdhucoder/xianyun-releases/releases/tag/v0.1.6",
  published_at: "2026-07-25T17:56:38Z",
  draft: false,
  prerelease: false,
  body: [
    "# v0.1.6",
    "",
    "## 本次更新",
    "",
    "- 默认使用本地识别。",
    "- 模型安装后立即加载。",
    "",
    "## 当前限制",
    "",
    "- 这部分不应出现在官网更新摘要。",
  ].join("\n"),
  assets: [
    {
      name: "XianYunAIVoiceInput_0.1.6_aarch64.dmg",
      browser_download_url: "https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.6/XianYunAIVoiceInput_0.1.6_aarch64.dmg",
      size: 100,
      digest: `sha256:${"a".repeat(64)}`,
    },
    {
      name: "XianYunAIVoiceInput_0.1.6_x64-setup.exe",
      browser_download_url: "https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.6/XianYunAIVoiceInput_0.1.6_x64-setup.exe",
      size: 200,
      digest: `sha256:${"b".repeat(64)}`,
    },
  ],
};

test("extracts only the concise current-update bullets", () => {
  assert.deepEqual(extractCurrentReleaseNotes(release.body), [
    "默认使用本地识别。",
    "模型安装后立即加载。",
  ]);
});

test("maps the latest public release to website metadata and changelog", () => {
  const result = buildWebsiteReleaseUpdate(release, manifest);
  assert.equal(result.manifest.version, "0.1.6");
  assert.equal(result.manifest.platforms["macos-arm64"].sha256, "a".repeat(64));
  assert.equal(result.manifest.platforms["windows-x64"].sizeBytes, 200);
  assert.match(result.changelog, /默认使用本地识别/);
  assert.doesNotMatch(result.changelog, /这部分不应出现在官网/);
});

test("rejects a release without immutable SHA-256 metadata", () => {
  const invalid = structuredClone(release);
  const [asset] = invalid.assets;
  assert.ok(asset);
  asset.digest = "";
  assert.throws(() => buildWebsiteReleaseUpdate(invalid, manifest), /asset digest/);
});

test("accepts only complete allowlisted website screenshot pairs", () => {
  const screenshotRelease = structuredClone(release);
  screenshotRelease.assets.push(
    {
      name: "site-home-dashboard-macos.jpg",
      browser_download_url: "https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.6/site-home-dashboard-macos.jpg",
      size: 120,
      digest: `sha256:${"c".repeat(64)}`,
    },
    {
      name: "site-home-dashboard-macos.avif",
      browser_download_url: "https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.6/site-home-dashboard-macos.avif",
      size: 90,
      digest: `sha256:${"d".repeat(64)}`,
    },
  );
  assert.equal(selectWebsiteScreenshotAssets(screenshotRelease).length, 2);
  screenshotRelease.assets.pop();
  assert.throws(() => selectWebsiteScreenshotAssets(screenshotRelease), /both jpg and avif/);
});

for (const tag of ['v0.1.7-feature', 'v0.1.7-beta.1', 'v0.1.7-rc.1', 'v0.1.7+feature', 'model-v0.1.7', 'v01.1.7']) {
  test(`rejects non-stable tag ${tag} even without the prerelease flag`, () => {
    assert.throws(() => buildWebsiteReleaseUpdate({ ...release, tag_name: tag }, manifest), /stable/);
  });
}

for (const flags of [{ draft: true }, { prerelease: true }, { draft: undefined }, { prerelease: undefined }]) {
  test(`rejects unpublished or ambiguous metadata ${JSON.stringify(flags)}`, () => {
    assert.throws(() => buildWebsiteReleaseUpdate({ ...release, ...flags }, manifest), /published and non-prerelease/);
  });
}

test('rejects installer URLs pointing at a different release tag', () => {
  const invalid = structuredClone(release);
  const asset = invalid.assets[0];
  assert.ok(asset);
  asset.browser_download_url = asset.browser_download_url.replace('/v0.1.6/', '/feature/');
  assert.throws(() => buildWebsiteReleaseUpdate(invalid, manifest), /download URL/);
});

test('selects the highest clean stable version regardless of API order or feature builds', async () => {
  const { selectStableRelease } = await import('./release-sync-lib.mjs');
  const candidates = ['v0.1.9', 'v0.1.18', 'v9.0.0-feature', 'v0.1.10'].map(tag_name => ({ ...release, tag_name }));
  candidates.push({ ...release, tag_name: 'v9.0.0', prerelease: true });
  candidates.push({ ...release, tag_name: 'v8.0.0', draft: true });
  assert.equal(selectStableRelease(candidates).tag_name, 'v0.1.18');
  assert.equal(selectStableRelease([{ ...release, prerelease: true }]), null);
});
