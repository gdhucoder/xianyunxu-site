import statsData from "./download-stats.json";

export interface DownloadTotals {
  macosInstallerDownloads: number;
  windowsPackageDownloads: number;
  identifiableUpdateDownloads: number;
  updateMetadataDownloads: number;
  modelDownloads: number;
  appPackageDownloads: number;
}

export interface VersionDownloadStats {
  version: string;
  tagName: string;
  publishedAt: string | null;
  macosInstallerDownloads: number;
  windowsPackageDownloads: number;
  identifiableUpdateDownloads: number;
  updateMetadataDownloads: number;
  appPackageDownloads: number;
}

export interface ModelDownloadStats {
  tagName: string;
  platform: "macos-arm64" | "windows-x64" | "other";
  publishedAt: string | null;
  modelDownloads: number;
}

export interface DownloadSnapshot extends DownloadTotals {
  capturedAt: string;
}

export interface DownloadStats {
  schemaVersion: 1;
  source: { repository: string; releasesUrl: string };
  generatedAt: string;
  collectionIntervalDays: number;
  totals: DownloadTotals;
  versions: VersionDownloadStats[];
  models: ModelDownloadStats[];
  snapshots: DownloadSnapshot[];
}

export const downloadStats = statsData as DownloadStats;

export function formatDownloadCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatStatsUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
