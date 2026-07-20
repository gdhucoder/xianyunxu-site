import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = relative(root, file);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${label}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) failures.push(`${label}: missing description`);
  if (!/<link rel="canonical" href="https:\/\/gdhucoder\.github\.io\/xianyunxu-site\//.test(html)) {
    failures.push(`${label}: canonical is outside the project site`);
  }
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = match[1];
    if (!url) continue;
    if (url === base || url.startsWith(`${base}/`)) continue;
    failures.push(`${label}: root-absolute URL bypasses base path: ${url}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Static site check passed for ${htmlFiles.length} HTML pages and ${files.length} files.`);
}
