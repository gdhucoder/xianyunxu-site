import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PREVIEW_SCENES, validatePreviewProvenance, validatePublicPreviewPages } from "./public-preview-lib.mjs";

const assetRoot = new URL("../public/assets/screenshots/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("preview-provenance.json", assetRoot), "utf8"));
/** @param {string} name */
const readAsset = name => readFileSync(new URL(name, assetRoot));
const copy = () => structuredClone(manifest);
const pathList = ["index.html", "download/index.html", "privacy/index.html", "faq/index.html", "install/index.html", "install/macos/index.html", "install/windows/index.html"];
/** @returns {Record<string,string>} */
function fixturePages() {
  const header = '<div data-public-preview-notice data-release-phase="preview">尚未发布，干净 Mac 实机验收待完成</div>';
  const figures = PREVIEW_SCENES.map(base => `<figure><img src="/assets/screenshots/${base}.jpg" alt="合成界面"><small class="screenshot-provenance">合成示例 · 非实机验收截图</small></figure>`).join("");
  const pages = Object.fromEntries(pathList.map(path => [path, header]));
  pages["index.html"] += `${figures}AI 整理可选，默认关闭`;
  pages["privacy/index.html"] += '导出的 WAV 是独立副本';
  pages["faq/index.html"] += '不是已验证的识别前 ASR 热词';
  return pages;
}
test("all five approved synthetic scenes have paired, hash-verified assets", () => validatePreviewProvenance(manifest, readAsset));
test("missing, duplicate and substituted scene IDs fail even with equal counts", () => {
  /** @type {Array<(value:import('./public-preview-lib.mjs').PreviewProvenance)=>void>} */
  const changes = [value => { value.scenes.pop(); }, value => { const first=value.scenes[0]; assert.ok(first); value.scenes[4]=first; }, value => { const last=value.scenes[4]; assert.ok(last); last.base='preview-unreviewed'; }];
  for (const change of changes) {
    const value = copy(); change(value); assert.throws(() => validatePreviewProvenance(value, readAsset));
  }
});
test("altered or missing screenshots fail instead of silently keeping old assets", () => {
  assert.throws(() => validatePreviewProvenance(manifest, name => name.endsWith('.avif') ? Buffer.from('not-an-image') : readAsset(name)));
  assert.throws(() => validatePreviewProvenance(manifest, name => { if (name.endsWith('.avif')) throw Error('missing'); return readAsset(name); }));
});
test("synthetic preview cannot be relabelled as native or released evidence", () => {
  /** @type {Array<(value:import('./public-preview-lib.mjs').PreviewProvenance)=>void>} */
  const changes = [value => { value.nativeAcceptance='passed'; }, value => { value.status='released'; }, value => { value.sourceIncludesUncommittedChanges=false; }];
  for (const change of changes) {
    const altered = copy(); change(altered); assert.throws(() => validatePreviewProvenance(altered, readAsset));
  }
});
test("complete preview pages pass the same content validator used after the build", () => validatePublicPreviewPages(fixturePages()));
test("published downloads never relabel synthetic images as native acceptance", () => {
  const pages = fixturePages();
  for (const path of pathList) pages[path] = (pages[path] ?? '').replace('data-release-phase="preview"', 'data-release-phase="published"').replace('尚未发布，干净 Mac 实机验收待完成', '当前公开版本 v0.1.19，合成示例，不代表干净 Mac 实机验收已完成');
  validatePublicPreviewPages(pages);
  pages['index.html'] = (pages['index.html'] ?? '').replace('不代表干净 Mac 实机验收已完成', '已完成全部验收');
  assert.throws(() => validatePublicPreviewPages(pages));
});
test("missing release caveat or screenshot caption is rejected", () => {
  /** @type {Array<(pages:Record<string,string>)=>void>} */
  const changes = [pages => { pages['download/index.html']=''; }, pages => { pages['index.html']=(pages['index.html'] ?? '').replace('data-public-preview-notice', ''); }, pages => { pages['index.html']=(pages['index.html'] ?? '').replace('screenshot-provenance', ''); }];
  for (const change of changes) {
    const pages = fixturePages(); change(pages); assert.throws(() => validatePublicPreviewPages(pages));
  }
});
test("old feature screenshot and extra scene are rejected", () => {
  const pages = fixturePages(); pages['index.html'] += '<figure><img src="/assets/screenshots/file-transcription-speakers-macos.jpg"></figure>';
  assert.throws(() => validatePublicPreviewPages(pages));
});
test("private paths and local test package links cannot enter public pages", () => {
  const pages = fixturePages(); pages['download/index.html'] += '<a href="file:///Users/test/private.dmg">download</a>';
  assert.throws(() => validatePublicPreviewPages(pages));
});
