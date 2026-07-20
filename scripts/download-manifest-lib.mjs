import { readFile } from "node:fs/promises";

export const allowedStatuses = new Set(["available", "preparing", "coming-soon", "unavailable"]);
export const officialReleasePrefix = "https://github.com/gdhucoder/xianyun-releases/";

/** @param {unknown} value */
function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

/** @param {unknown} value */
function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @param {string} id
 * @param {any} platform
 * @param {any} manifest
 * @param {string[]} errors
 */
function validatePlatform(id, platform, manifest, errors) {
  if (!platform || typeof platform !== "object") {
    errors.push(`platforms.${id} must be an object`);
    return;
  }
  if (!allowedStatuses.has(platform.status)) {
    errors.push(`platforms.${id}.status is invalid`);
  }

  if (platform.status === "available") {
    if (!manifest.version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
      errors.push(`available platform ${id} requires a semantic manifest version`);
    }
    if (!isHttpUrl(platform.downloadUrl) || !platform.downloadUrl.startsWith(officialReleasePrefix)) {
      errors.push(`available platform ${id} requires a real xianyun-releases HTTPS URL`);
    }
    if (typeof platform.fileName !== "string" || !platform.fileName.trim()) {
      errors.push(`available platform ${id} requires fileName`);
    }
    if (!Number.isSafeInteger(platform.sizeBytes) || platform.sizeBytes <= 0) {
      errors.push(`available platform ${id} requires a positive integer sizeBytes`);
    }
    if (!isSha256(platform.sha256)) {
      errors.push(`available platform ${id} requires a lowercase SHA-256`);
    }
  } else {
    for (const field of ["downloadUrl", "fileName", "sizeBytes", "sha256"]) {
      if (platform[field] !== null) {
        errors.push(`${id} is ${platform.status}; ${field} must be null`);
      }
    }
  }
}

/** @param {any} manifest */
export function validateManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== "object") return ["manifest must be an object"];
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (manifest.product?.nameZh !== "纤云叙") errors.push("product.nameZh must be 纤云叙");
  if (manifest.product?.nameEn !== "XianYun AI Voice Input") {
    errors.push("product.nameEn must preserve the official XianYun AI Voice Input capitalization");
  }
  if (!["beta", "stable"].includes(manifest.channel)) errors.push("channel must be beta or stable");
  if (!isHttpUrl(manifest.releasePageUrl) || !manifest.releasePageUrl.startsWith(officialReleasePrefix)) {
    errors.push("releasePageUrl must point to the public xianyun-releases repository");
  }
  if (manifest.publishedAt !== null && Number.isNaN(Date.parse(manifest.publishedAt))) {
    errors.push("publishedAt must be null or an ISO-8601 date-time");
  }

  for (const id of ["macos-arm64", "windows-x64"]) {
    validatePlatform(id, manifest.platforms?.[id], manifest, errors);
  }

  const model = manifest.models?.["sensevoice-small"];
  if (!model || typeof model !== "object") {
    errors.push("models.sensevoice-small must be present");
  } else {
    if (!allowedStatuses.has(model.status)) errors.push("models.sensevoice-small.status is invalid");
    if (model.status === "available") {
      if (!isHttpUrl(model.downloadUrl) || !model.downloadUrl.startsWith(officialReleasePrefix)) {
        errors.push("available model must link to xianyun-releases");
      }
      if (!model.version) errors.push("available model requires version");
      if (!Number.isSafeInteger(model.sizeBytes) || model.sizeBytes <= 0) errors.push("available model requires sizeBytes");
      if (!isSha256(model.sha256)) errors.push("available model requires SHA-256");
      for (const platformId of ["macos-arm64", "windows-x64"]) {
        const releaseUrl = model.platformReleaseUrls?.[platformId];
        if (!isHttpUrl(releaseUrl) || !releaseUrl.startsWith(officialReleasePrefix)) {
          errors.push(`available model requires a ${platformId} release URL`);
        }
      }
    }
  }

  const serialized = JSON.stringify(manifest);
  if (/\[[^\]]+\]\(https?:\/\//.test(serialized)) {
    errors.push("manifest values must be raw URLs, not Markdown links");
  }
  return errors;
}

/** @param {string} path */
export async function readManifest(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
