import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const RELEASE_PREFIX = "https://github.com/gdhucoder/xianyun-releases/";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_BASES = new Set([
  "home-dashboard-macos",
  "history-sanitized-macos",
  "file-transcription-speakers-macos",
  "file-transcription-speakers-sanitized-macos",
  "personal-dictionary-macos",
  "local-model-macos",
  "status-overlay-recording-macos",
]);

/** @param {Buffer} buffer */
function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/** @param {Buffer} buffer */
function isAvif(buffer) {
  return buffer.length >= 12 && buffer.subarray(4, 12).toString("ascii").startsWith("ftypavi");
}

/** @param {{assets?: Array<{name?: string, browser_download_url?: string, size?: number}>}} release */
export function selectWebsiteScreenshotAssets(release) {
  /** @type {Array<{base: string, extension: "jpg" | "avif", url: string, size: number}>} */
  const selected = [];
  /** @type {Map<string, Set<string>>} */
  const grouped = new Map();
  for (const asset of release?.assets ?? []) {
    const name = String(asset?.name ?? "");
    if (!name.startsWith("site-")) continue;
    const match = /^site-(?<base>.+)\.(?<extension>jpg|avif)$/i.exec(name);
    const base = match?.groups?.base;
    const rawExtension = match?.groups?.extension?.toLowerCase();
    if (!base || (rawExtension !== "jpg" && rawExtension !== "avif") || !ALLOWED_BASES.has(base)) {
      throw new Error(`release contains an unsupported website screenshot: ${name}`);
    }
    const url = String(asset.browser_download_url ?? "");
    if (!url.startsWith(`${RELEASE_PREFIX}releases/download/`)) {
      throw new Error(`website screenshot must use the official release repository: ${name}`);
    }
    const size = asset.size;
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0 || size > MAX_BYTES) {
      throw new Error(`website screenshot has an invalid size: ${name}`);
    }
    const extension = rawExtension;
    const extensions = grouped.get(base) ?? new Set();
    extensions.add(extension);
    grouped.set(base, extensions);
    selected.push({ base, extension, url, size });
  }
  for (const [base, extensions] of grouped) {
    if (!extensions.has("jpg") || !extensions.has("avif")) {
      throw new Error(`website screenshot ${base} must include both jpg and avif assets`);
    }
  }
  return selected;
}

/**
 * @param {{assets?: Array<{name?: string, browser_download_url?: string, size?: number}>}} release
 * @param {string} outputDirectory
 * @param {typeof fetch} fetchImpl
 */
export async function syncWebsiteScreenshots(release, outputDirectory, fetchImpl = fetch) {
  const selected = selectWebsiteScreenshotAssets(release);
  if (selected.length === 0) return [];
  await mkdir(resolve(outputDirectory), { recursive: true });
  const written = [];
  for (const asset of selected) {
    const response = await fetchImpl(asset.url, { redirect: "follow" });
    if (!response.ok) throw new Error(`website screenshot download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== asset.size || bytes.length > MAX_BYTES) {
      throw new Error(`website screenshot size changed during download: ${asset.base}.${asset.extension}`);
    }
    if ((asset.extension === "jpg" && !isJpeg(bytes)) || (asset.extension === "avif" && !isAvif(bytes))) {
      throw new Error(`website screenshot content is invalid: ${asset.base}.${asset.extension}`);
    }
    const name = `${asset.base}.${asset.extension}`;
    await writeFile(resolve(outputDirectory, name), bytes);
    written.push(name);
  }
  return written.sort();
}
