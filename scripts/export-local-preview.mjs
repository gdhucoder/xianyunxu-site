// Export a local-only review copy. It has no server, tracking, repository sync
// or deployment side effects; external release links still target public files.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv.length !== 4 || process.argv[2] !== "--output" || !process.argv[3]) throw Error("Use --output <new review directory>");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const output = resolve(process.argv[3]);
mkdirSync(output, { mode: 0o700 });
const base = "/xianyunxu-site";
const routes = new Map([
  ["/", "index.html"], ["/download/", "download.html"], ["/privacy/", "privacy.html"],
  ["/faq/", "faq.html"], ["/changelog/", "changelog.html"], ["/install/", "install.html"],
  ["/install/macos/", "install-macos.html"], ["/install/windows/", "install-windows.html"],
  ["/404.html", "404.html"],
]);
/** @type {Record<string,string>} */
const types = { ".jpg": "image/jpeg", ".avif": "image/avif", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
for (const [route, target] of routes) {
  const original = join(root, route === "/404.html" ? "404.html" : `${route.slice(1)}index.html`);
  let html = readFileSync(original, "utf8");
  html = html.replace(/<link\s+rel="stylesheet"\s+href="(\/xianyunxu-site\/[^\"]+)"[^>]*>/g,
    (_, href) => `<style>${readFileSync(join(root, href.slice(base.length)), "utf8")}</style>`);
  html = html.replace(/(href|src|srcset)="(\/xianyunxu-site(?:\/[^\"]*)?)"/g, (_, attribute, url) => {
    const local = url.slice(base.length) || "/";
    if (attribute === "href") {
      const [page = "/", fragment] = local.split("#");
      const destination = routes.get(page);
      if (destination) return `${attribute}="${destination}${fragment ? `#${fragment}` : ""}"`;
    }
    const type = types[extname(local)];
    if (!type) throw Error(`Unmapped local review asset: ${local}`);
    return `${attribute}="data:${type};base64,${readFileSync(join(root, local)).toString("base64")}"`;
  });
  if (/(?:href|src|srcset)="\/xianyunxu-site/.test(html)) throw Error(`Unresolved local URL in ${target}`);
  writeFileSync(join(output, target), html, { flag: "wx", mode: 0o600 });
}
console.log(`Exported ${routes.size} self-contained local review pages.`);
