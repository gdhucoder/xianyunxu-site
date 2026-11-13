import { access, readFile, readdir } from "node:fs/promises";
import { constants, readFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreviewProvenance, validatePublicPreviewPages } from "./public-preview-lib.mjs";
import { readManifest } from "./download-manifest-lib.mjs";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const base = "/xianyunxu-site";
const required = [
  "index.html",
  "download/index.html",
  "install/macos/index.html",
  "privacy/index.html",
  "changelog/index.html",
  "faq/index.html",
  "404.html",
  "robots.txt",
  "sitemap-index.xml",
];

for (const file of required) await access(join(root, file), constants.R_OK);

/** @param {string} directory @returns {Promise<string[]>} */
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
const htmlFiles = files.filter((file) => extname(file) === ".html");
const failures = [];
/** @type {Record<string,string>} */
const pages = {};
const manifest = await readManifest(fileURLToPath(new URL("../src/data/download-manifest.json", import.meta.url)));

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = relative(root, file);
  pages[label] = html;
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${label}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) failures.push(`${label}: missing description`);
  if (!/<link rel="canonical" href="https:\/\/gdhucoder\.github\.io\/xianyunxu-site\//.test(html)) {
    failures.push(`${label}: canonical is outside the project site`);
  }
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = match[1];
    if (!url) continue;
    if (url === base || url.startsWith(`${base}/`)) {
      const clean = decodeURIComponent((url.split(/[?#]/)[0] ?? "").slice(base.length));
      const resolved = resolve(root, `.${clean}`);
      if (!resolved.startsWith(root.endsWith(sep) ? root : root + sep) && resolved !== resolve(root)) {
        failures.push(`${label}: URL escapes build root`); continue;
      }
      const target = extname(resolved) ? resolved : join(resolved, "index.html");
      try { await access(target, constants.R_OK); } catch { failures.push(`${label}: missing local target: ${url}`); }
      continue;
    }
    failures.push(`${label}: root-absolute URL bypasses base path: ${url}`);
  }
}

try {
  const screenshots = join(root, "assets/screenshots");
  validatePreviewProvenance(JSON.parse(await readFile(join(screenshots, "preview-provenance.json"), "utf8")), name => readFileSync(join(screenshots, name)));
  validatePublicPreviewPages(pages);
} catch (error) { failures.push(`Public preview contract: ${error instanceof Error ? error.message : String(error)}`); }

for (const [id, platform] of Object.entries(manifest.platforms)) {
  if (platform.status !== "available") continue;
  for (const page of ["download/index.html", `install/${id === "macos-arm64" ? "macos" : "windows"}/index.html`]) {
    const html = pages[page] ?? "";
    for (const url of [platform.downloadUrl, platform.cnbDownloadUrl].filter(Boolean)) {
      if (!html.includes(`href="${url}"`)) failures.push(`${page}: missing exact verified download link for ${id}`);
    }
    if (platform.cnbDownloadUrl) {
      const anchors = [...html.matchAll(/<a\b([^>]*?)>([^]*?)<\/a>/g)];
      for (const [url, label] of [[platform.downloadUrl, "GitHub"], [platform.cnbDownloadUrl, "CNB（国内）"]]) {
        if (!anchors.some(match => match[1]?.includes(`href="${url}"`) && match[2]?.replace(/<[^>]*>/g, "").trim() === label)) failures.push(`${page}: incorrect download channel mapping for ${id}`);
      }
      if (html.indexOf(`href="${platform.downloadUrl}"`) > html.indexOf(`href="${platform.cnbDownloadUrl}"`)) failures.push(`${page}: GitHub must precede CNB for ${id}`);
    }
  }
  const download = pages["download/index.html"] ?? "";
  const details = /<details\b[^>]*\bdata-install-checks[^>]*>([^]*?)<\/details>/.exec(download)?.[1] ?? "";
  for (const fact of [platform.minimumOsVersion, platform.fileName, platform.sha256].filter(Boolean)) {
    if (!details.includes(fact)) failures.push(`download: missing preserved installation/checksum fact for ${id}`);
  }
  const system = id === "macos-arm64" ? "macOS" : "Windows 10/11";
  if (!new RegExp(`<dt>系统</dt><dd>${system}</dd>`).test(download)) failures.push(`download: system label is not concise for ${id}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Static site check passed for ${htmlFiles.length} HTML pages and ${files.length} files.`);
}
