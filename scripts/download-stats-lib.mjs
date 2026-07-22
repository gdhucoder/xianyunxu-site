const APP_RELEASE_TAG = /^v(?<version>\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

/** @typedef {{ name?: string, download_count?: number }} ReleaseAsset */
/** @typedef {{ tag_name?: string, published_at?: string | null, created_at?: string | null, draft?: boolean, assets?: ReleaseAsset[] }} GitHubRelease */
/** @typedef {{ macosInstallerDownloads: number, windowsPackageDownloads: number, identifiableUpdateDownloads: number, updateMetadataDownloads: number, modelDownloads: number, appPackageDownloads: number }} DownloadTotals */
/** @typedef {{ version: string, tagName: string, publishedAt: string | null, macosInstallerDownloads: number, windowsPackageDownloads: number, identifiableUpdateDownloads: number, updateMetadataDownloads: number, appPackageDownloads: number }} VersionStats */
/** @typedef {{ tagName: string, platform: string, publishedAt: string | null, modelDownloads: number }} ModelStats */

/** @param {ReleaseAsset | undefined} asset */
const count = (asset) => {
  const value = asset?.download_count;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
};

/** @param {ReleaseAsset[]} assets @param {(asset: ReleaseAsset) => boolean} predicate */
const sumAssets = (assets, predicate) => assets
  .filter(predicate)
  .reduce((total, asset) => total + count(asset), 0);

/** @param {string} name */
const isMacInstaller = (name) => name.toLowerCase().endsWith(".dmg");
/** @param {string} name */
const isWindowsPackage = (name) => /(?:setup\.exe|\.msi)$/i.test(name);
/** @param {string} name */
const isUpdaterPackage = (name) => /(?:\.app\.tar\.gz|\.nsis\.zip|\.msi\.zip)$/i.test(name);
/** @param {string} name */
const isUpdateMetadata = (name) => name.toLowerCase() === "latest.json";
/** @param {string} name */
const isModelWeight = (name) => /\.(?:gguf|onnx|safetensors)$/i.test(name);

/** @param {GitHubRelease} release */
function releaseTimestamp(release) {
  return release.published_at ?? release.created_at ?? null;
}

/** @param {GitHubRelease[]} releases */
export function summarizeReleases(releases) {
  const published = releases.filter((release) => !release.draft);
  /** @type {VersionStats[]} */
  const versions = [];
  /** @type {ModelStats[]} */
  const models = [];

  for (const release of published) {
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const appMatch = APP_RELEASE_TAG.exec(release.tag_name ?? "");

    if (appMatch?.groups?.version) {
      const macosInstallerDownloads = sumAssets(assets, (asset) => isMacInstaller(asset.name ?? ""));
      const windowsPackageDownloads = sumAssets(assets, (asset) => isWindowsPackage(asset.name ?? ""));
      const identifiableUpdateDownloads = sumAssets(assets, (asset) => isUpdaterPackage(asset.name ?? ""));
      const updateMetadataDownloads = sumAssets(assets, (asset) => isUpdateMetadata(asset.name ?? ""));

      versions.push({
        version: appMatch.groups.version,
        tagName: release.tag_name ?? "",
        publishedAt: releaseTimestamp(release),
        macosInstallerDownloads,
        windowsPackageDownloads,
        identifiableUpdateDownloads,
        updateMetadataDownloads,
        appPackageDownloads: macosInstallerDownloads + windowsPackageDownloads + identifiableUpdateDownloads,
      });
      continue;
    }

    if ((release.tag_name ?? "").startsWith("model-")) {
      const platform = (release.tag_name ?? "").includes("windows")
        ? "windows-x64"
        : (release.tag_name ?? "").includes("macos") ? "macos-arm64" : "other";
      models.push({
        tagName: release.tag_name ?? "",
        platform,
        publishedAt: releaseTimestamp(release),
        modelDownloads: sumAssets(assets, (asset) => isModelWeight(asset.name ?? "")),
      });
    }
  }

  versions.sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));
  models.sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));

  /** @type {DownloadTotals} */
  const totals = {
    macosInstallerDownloads: versions.reduce((total, item) => total + item.macosInstallerDownloads, 0),
    windowsPackageDownloads: versions.reduce((total, item) => total + item.windowsPackageDownloads, 0),
    identifiableUpdateDownloads: versions.reduce((total, item) => total + item.identifiableUpdateDownloads, 0),
    updateMetadataDownloads: versions.reduce((total, item) => total + item.updateMetadataDownloads, 0),
    modelDownloads: models.reduce((total, item) => total + item.modelDownloads, 0),
    appPackageDownloads: 0,
  };

  totals.appPackageDownloads = totals.macosInstallerDownloads
    + totals.windowsPackageDownloads
    + totals.identifiableUpdateDownloads;

  return { totals, versions, models };
}

/**
 * @param {{ releases: GitHubRelease[], previous?: { snapshots?: Array<Record<string, unknown>> } | null, generatedAt: string, intervalDays?: number }} input
 */
export function buildDownloadStats({ releases, previous, generatedAt, intervalDays = 5 }) {
  const summary = summarizeReleases(releases);
  const snapshots = Array.isArray(previous?.snapshots) ? [...previous.snapshots] : [];
  const snapshot = { capturedAt: generatedAt, ...summary.totals };

  if (snapshots.at(-1)?.capturedAt === generatedAt) snapshots[snapshots.length - 1] = snapshot;
  else snapshots.push(snapshot);

  return {
    schemaVersion: 1,
    source: {
      repository: "gdhucoder/xianyun-releases",
      releasesUrl: "https://github.com/gdhucoder/xianyun-releases/releases",
    },
    generatedAt,
    collectionIntervalDays: intervalDays,
    totals: summary.totals,
    versions: summary.versions,
    models: summary.models,
    snapshots,
    countingNotes: {
      macosInstaller: "Counts .dmg release asset downloads.",
      windowsPackage: "Counts Windows setup packages; the same file may be used for a website download or an in-app update.",
      identifiableUpdates: "Counts updater-only assets such as .app.tar.gz; current Windows updates share the setup executable and cannot be separated.",
      models: "Counts model weight assets such as .gguf, excluding runtimes, licenses, manifests, and checksums.",
    },
  };
}

/** @param {string | null | undefined} previousGeneratedAt @param {string} now @param {number} intervalDays */
export function isCollectionDue(previousGeneratedAt, now, intervalDays) {
  if (!previousGeneratedAt) return true;
  const previous = Date.parse(previousGeneratedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return true;
  return current - previous >= intervalDays * 24 * 60 * 60 * 1000;
}
