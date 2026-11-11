import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const PREVIEW_SCENES = ["preview-home-macos", "preview-dictionary-macos", "preview-model-ready-macos", "preview-cleanup-macos", "preview-first-use-macos"];

/** @typedef {{schema:string,status:string,nativeAcceptance:string,publicInput:string,sourceIncludesUncommittedChanges:boolean,sourceCommit:string,captureScriptSha256:string,syntheticFixtureSha256:string,scenes:Array<{base:string,width:number,height:number,jpgSha256:string,avifSha256:string}>}} PreviewProvenance */
/** @param {PreviewProvenance} value @param {(name:string)=>Buffer} readAsset */
export function validatePreviewProvenance(value, readAsset) {
  assert.equal(value.schema, "xianyunxu-public-ui-previews-v1");
  assert.equal(value.status, "unreleased-preview");
  assert.equal(value.nativeAcceptance, "paused-not-performed");
  assert.equal(value.publicInput, "system-microphone-only");
  assert.equal(value.sourceIncludesUncommittedChanges, true);
  assert.match(value.captureScriptSha256, /^[a-f0-9]{64}$/);
  assert.match(value.syntheticFixtureSha256, /^[a-f0-9]{64}$/);
  assert.match(value.sourceCommit, /^[a-f0-9]{40}$/);
  assert.ok(Array.isArray(value.scenes));
  assert.deepEqual(value.scenes.map(scene => scene.base).sort(), [...PREVIEW_SCENES].sort());
  for (const scene of value.scenes) {
    assert.ok(Number.isSafeInteger(scene.width) && scene.width > 0);
    assert.ok(Number.isSafeInteger(scene.height) && scene.height > 0);
    for (const extension of ["jpg", "avif"]) {
      const bytes = readAsset(`${scene.base}.${extension}`);
      assert.ok(Buffer.isBuffer(bytes) && bytes.length > 12 && bytes.length <= 5 * 1024 * 1024);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), scene[extension === "jpg" ? "jpgSha256" : "avifSha256"], `${scene.base}.${extension}: content identity`);
      if (extension === "jpg") assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff");
      else assert.ok(bytes.subarray(4, 12).toString("ascii").startsWith("ftypavi"));
    }
  }
}

/** @param {Record<string,string>} pages */
export function validatePublicPreviewPages(pages) {
  for (const path of ["index.html", "download/index.html", "privacy/index.html", "faq/index.html", "install/index.html", "install/macos/index.html", "install/windows/index.html"]) {
    const html = pages[path];
    assert.ok(typeof html === "string" && html.length > 0, `missing page ${path}`);
    assert.match(html, /data-public-preview-notice/, `${path}: preview/release distinction`);
    assert.match(html, /尚未发布/);
    assert.match(html, /干净 Mac 实机验收/);
    assert.doesNotMatch(html, /file:\/\/|\/Users\/|first-use-offline-public-preview-2026/);
  }
  const home = pages["index.html"];
  assert.ok(home);
  const shown = [...home.matchAll(/assets\/screenshots\/(preview-[\w-]+)\.jpg/g)].map(match => match[1]);
  assert.deepEqual(shown.sort(), [...PREVIEW_SCENES].sort(), "all five current previews exactly once");
  const figures = [...home.matchAll(/<figure\b[^]*?<\/figure>/g)].map(match => match[0]);
  assert.equal(figures.length, 5);
  for (const figure of figures) {
    assert.match(figure, /screenshot-provenance/);
    assert.match(figure, /合成示例/);
    assert.match(figure, /非实机验收截图/);
    assert.match(figure, /alt="[^"]+"/);
  }
  assert.doesNotMatch(home, /file-transcription-speakers|云端识别语音|MG24|下面都是实际运行截图/);
  assert.match(home, /AI 整理.*可选|AI 文字整理/);
  assert.match(home, /默认关闭/);
  assert.match(pages["privacy/index.html"] ?? "", /已导出.*副本|导出的 WAV 是独立副本/);
  assert.match(pages["faq/index.html"] ?? "", /不是已验证的识别前 ASR 热词/);
}
