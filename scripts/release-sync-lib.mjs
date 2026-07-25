const RELEASE_REPOSITORY = "gdhucoder/xianyun-releases";
const RELEASE_PREFIX = `https://github.com/${RELEASE_REPOSITORY}/`;
const VERSION_TAG = /^v(?<version>\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

/** @param {unknown} value @param {string} label */
function expectString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

/** @param {unknown} value */
function sha256FromDigest(value) {
  const digest = expectString(value, "asset digest");
  const match = /^sha256:(?<hash>[a-f0-9]{64})$/.exec(digest);
  if (!match?.groups?.hash) throw new Error(`unsupported asset digest: ${digest}`);
  return match.groups.hash;
}

/** @param {any[]} assets @param {RegExp} pattern @param {string} label */
function findUniqueAsset(assets, pattern, label) {
  const matches = assets.filter((asset) => pattern.test(asset?.name ?? ""));
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${label} asset, found ${matches.length}`);
  }
  const asset = matches[0];
  const url = expectString(asset.browser_download_url, `${label} download URL`);
  if (!url.startsWith(`${RELEASE_PREFIX}releases/download/`)) {
    throw new Error(`${label} download URL must use the official release repository`);
  }
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0) {
    throw new Error(`${label} size must be a positive integer`);
  }
  return {
    fileName: expectString(asset.name, `${label} file name`),
    downloadUrl: url,
    sizeBytes: asset.size,
    sha256: sha256FromDigest(asset.digest),
  };
}

/** @param {string} body */
export function extractCurrentReleaseNotes(body) {
  const normalized = expectString(body, "release body").replace(/\r\n/g, "\n");
  const heading = /^## 本次更新\s*$/m.exec(normalized);
  if (!heading) throw new Error('release notes must contain a "## 本次更新" section');
  const remainder = normalized.slice(heading.index + heading[0].length);
  const nextHeading = remainder.search(/^##\s+/m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;

  const bullets = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\S/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());

  if (bullets.length === 0) throw new Error('"## 本次更新" must contain at least one bullet');
  if (bullets.some((line) => /(?:API\s*Key|token|密钥|私钥)/i.test(line))) {
    throw new Error("release summary contains a potentially sensitive term");
  }
  return bullets;
}

/** @param {any} release @param {any} currentManifest */
export function buildWebsiteReleaseUpdate(release, currentManifest) {
  if (!release || typeof release !== "object") throw new Error("release payload must be an object");
  if (release.draft || release.prerelease) throw new Error("latest website release must be published and non-prerelease");

  const tagName = expectString(release.tag_name, "release tag");
  const version = VERSION_TAG.exec(tagName)?.groups?.version;
  if (!version) throw new Error(`release tag must be v<semver>, received ${tagName}`);

  const releasePageUrl = expectString(release.html_url, "release page URL");
  if (releasePageUrl !== `${RELEASE_PREFIX}releases/tag/${tagName}`) {
    throw new Error("release page URL does not match the official repository and tag");
  }
  const publishedAt = expectString(release.published_at, "release published time");
  if (!Number.isFinite(Date.parse(publishedAt))) throw new Error("release published time must be ISO-8601");

  const assets = Array.isArray(release.assets) ? release.assets : [];
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const macos = findUniqueAsset(
    assets,
    new RegExp(`^XianYunAIVoiceInput_${escapedVersion}_aarch64\\.dmg$`),
    "macOS installer",
  );
  const windows = findUniqueAsset(
    assets,
    new RegExp(`^XianYunAIVoiceInput_${escapedVersion}_x64-setup\\.exe$`),
    "Windows installer",
  );
  const bullets = extractCurrentReleaseNotes(release.body);

  const manifest = structuredClone(currentManifest);
  manifest.version = version;
  manifest.publishedAt = publishedAt;
  manifest.releasePageUrl = releasePageUrl;
  Object.assign(manifest.platforms["macos-arm64"], { status: "available", ...macos });
  Object.assign(manifest.platforms["windows-x64"], { status: "available", ...windows });

  const publishedDate = publishedAt.slice(0, 10);
  const changelog = [
    "---",
    `title: ${version} Beta`,
    "status: beta",
    `publishedAt: ${publishedDate}`,
    "---",
    "",
    "### 本次更新",
    "",
    ...bullets.map((bullet) => `- ${bullet}`),
    "",
  ].join("\n");

  return { manifest, changelog, version };
}

export const releaseApiUrl = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
