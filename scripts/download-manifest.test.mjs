import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { cnbReleasePrefix, readManifest, validateManifest } from "./download-manifest-lib.mjs";

const manifestPath = fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url));
const source = await readManifest(manifestPath);

test("the committed download manifest is valid", () => {
  assert.deepEqual(validateManifest(source), []);
});

test("CNB mirrors must use the exact allowlisted repository, version and installer", () => {
  const expected = `${cnbReleasePrefix}v${source.version}/${source.platforms["macos-arm64"].fileName}`;
  for (const url of [
    "https://cnb.cool/other/releases/-/releases/download/v0.1.19/setup.exe",
    expected.replace(`/v${source.version}/`, "/v0.0.0/"),
    `${expected}?download=unverified`,
  ]) {
    const manifest = structuredClone(source);
    manifest.platforms["macos-arm64"].cnbDownloadUrl = url;
    assert.match(validateManifest(manifest).join("\n"), /CNB URL must match/);
  }
  const legacy = structuredClone(source);
  delete legacy.platforms["macos-arm64"].cnbDownloadUrl;
  legacy.platforms["windows-x64"].cnbDownloadUrl = null;
  assert.deepEqual(validateManifest(legacy), []);
});

test("available platforms require complete immutable metadata", () => {
  const manifest = structuredClone(source);
  manifest.platforms["macos-arm64"].sha256 = null;
  assert.match(validateManifest(manifest).join("\n"), /requires a lowercase SHA-256/);
});

test("non-available platforms cannot expose a download", () => {
  const manifest = structuredClone(source);
  manifest.platforms["windows-x64"].status = "coming-soon";
  manifest.platforms["windows-x64"].fileName = null;
  manifest.platforms["windows-x64"].sizeBytes = null;
  manifest.platforms["windows-x64"].sha256 = null;
  manifest.platforms["windows-x64"].downloadUrl = "https://example.com/setup.exe";
  assert.match(validateManifest(manifest).join("\n"), /downloadUrl must be null/);
});

test("the Windows release exposes verified immutable metadata", () => {
  const windows = source.platforms["windows-x64"];
  assert.equal(windows.status, "available");
  assert.equal(windows.fileName, `XianYunAIVoiceInput_${source.version}_x64-setup.exe`);
  assert.match(windows.downloadUrl, new RegExp(`/releases/download/v${source.version}/`));
  assert.ok(windows.sizeBytes > 1_000_000);
  assert.match(windows.sha256, /^[a-f0-9]{64}$/);
});

test("the official English product capitalization is enforced", () => {
  const manifest = structuredClone(source);
  manifest.product.nameEn = "Qianyunxu";
  assert.match(validateManifest(manifest).join("\n"), /official XianYun AI Voice Input capitalization/);
});

test('rejects prerelease versions and mismatched download tags at build time', () => {
  const manifest = structuredClone(source);
  manifest.version = '0.2.0-feature';
  assert.match(validateManifest(manifest).join('\n'), /stable semantic/);
  assert.match(validateManifest(manifest).join('\n'), /must match the manifest version/);
});
