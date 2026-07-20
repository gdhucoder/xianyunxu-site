import manifestData from "./download-manifest.json";

export type AvailabilityStatus = "available" | "preparing" | "coming-soon" | "unavailable";

export interface PlatformDownload {
  status: AvailabilityStatus;
  displayName: string;
  architecture: string;
  minimumOsVersion: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  installGuideUrl: string | null;
  signingStatus: "self-signed-not-notarized" | "unsigned" | "signed";
}

export interface ModelDownload {
  status: AvailabilityStatus;
  displayName: string;
  version: string | null;
  downloadUrl: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  installMode: "in-app" | "manual";
  platformReleaseUrls: {
    "macos-arm64": string;
    "windows-x64": string;
  };
}

export interface DownloadManifest {
  schemaVersion: 1;
  product: {
    nameZh: "纤云叙";
    nameEn: "XianYun AI Voice Input";
  };
  channel: "beta" | "stable";
  version: string | null;
  publishedAt: string | null;
  releasePageUrl: string;
  platforms: {
    "macos-arm64": PlatformDownload;
    "windows-x64": PlatformDownload;
  };
  models: {
    "sensevoice-small": ModelDownload;
  };
}

export const downloadManifest = manifestData as DownloadManifest;

export function formatBytes(value: number | null): string {
  if (value === null) return "待公布";
  const mib = value / 1024 / 1024;
  return `${mib >= 100 ? mib.toFixed(0) : mib.toFixed(1)} MiB`;
}

export function formatPublishedDate(value: string | null): string {
  if (!value) return "待公布";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
