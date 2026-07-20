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
  assert.equal(windows.fileName, "XianYunAIVoiceInput_0.1.5_x64-setup.exe");
  assert.equal(windows.sizeBytes, 5208405);
  assert.equal(windows.sha256, "0111210bd1bd1629fb6ab7ba38bc2f17712f9ef22ee190e2948599625d1f4d19");
});

test("the official English product capitalization is enforced", () => {
  const manifest = structuredClone(source);
  manifest.product.nameEn = "Qianyunxu";
  assert.match(validateManifest(manifest).join("\n"), /official XianYun AI Voice Input capitalization/);
});
