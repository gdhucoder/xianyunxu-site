import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readManifest, validateManifest } from "./download-manifest-lib.mjs";

const manifestPath = fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url));
const source = await readManifest(manifestPath);

test("the committed download manifest is valid", () => {
  assert.deepEqual(validateManifest(source), []);
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
