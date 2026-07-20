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

test("coming-soon platforms cannot expose a download", () => {
  const manifest = structuredClone(source);
  manifest.platforms["windows-x64"].downloadUrl = "https://example.com/setup.exe";
  assert.match(validateManifest(manifest).join("\n"), /downloadUrl must be null/);
});

test("the official English product capitalization is enforced", () => {
  const manifest = structuredClone(source);
  manifest.product.nameEn = "Qianyunxu";
  assert.match(validateManifest(manifest).join("\n"), /official XianYun AI Voice Input capitalization/);
});
