import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://gdhucoder.github.io",
  base: "/xianyunxu-site",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
});
