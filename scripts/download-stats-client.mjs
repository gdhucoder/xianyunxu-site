/**
 * Collect only public release metadata. In Actions, use the workflow's built-in
 * token instead of sharing the runner IP's much smaller anonymous rate limit.
 * @param {{ token?: string, requireToken?: boolean, fetchImpl?: typeof fetch }} options
 * @returns {Promise<import("./download-stats-lib.mjs").GitHubRelease[]>}
 */
export async function fetchPublishedReleases({ token = "", requireToken = false, fetchImpl = fetch } = {}) {
  if (requireToken && !token) {
    throw new Error("GITHUB_TOKEN is required for download statistics in GitHub Actions");
  }

  /** @type {Record<string, string>} */
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "xianyunxu-site-download-stats",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  /** @type {import("./download-stats-lib.mjs").GitHubRelease[]} */
  const releases = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetchImpl(
      `https://api.github.com/repos/gdhucoder/xianyun-releases/releases?per_page=100&page=${page}`,
      { headers, signal: AbortSignal.timeout(20_000) },
    );

    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining") ?? "unknown";
      const reset = response.headers.get("x-ratelimit-reset") ?? "unknown";
      // Never log credentials or retry with anonymous access after auth fails.
      // Throw before returning any partial result, preserving the last snapshot.
      throw new Error(
        `GitHub Releases request failed: ${response.status} ${response.statusText}; ` +
        `authentication=${token ? "workflow-token" : "anonymous"}; rate-limit remaining=${remaining}, reset=${reset}`,
      );
    }

    const pageItems = await response.json();
    if (!Array.isArray(pageItems)) throw new Error("GitHub Releases response was not an array");
    releases.push(...pageItems);
    if (pageItems.length < 100) break;
  }
  return releases;
}
