import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fetchPublishedReleases } from "./download-stats-client.mjs";

test("statistics workflow passes its built-in token to the collector", async () => {
  const workflow = await readFile(new URL("../.github/workflows/update-download-stats.yml", import.meta.url), "utf8");
  const step = workflow.match(/- name: Collect public release download counts([\s\S]*?)(?=\n      - name:)/)?.[1];
  assert.ok(step);
  assert.match(step, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
  const collector = await readFile(new URL("./update-download-stats.mjs", import.meta.url), "utf8");
  assert.match(collector, /token: process\.env\.GITHUB_TOKEN/);
  assert.match(collector, /requireToken: process\.env\.GITHUB_ACTIONS === "true"/);
});

test("sends authenticated requests only to the public releases API", async () => {
  const result = await fetchPublishedReleases({
    token: "synthetic-test-token", requireToken: true,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.github.com/repos/gdhucoder/xianyun-releases/releases?per_page=100&page=1");
      assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer synthetic-test-token");
      assert.ok(options?.signal instanceof AbortSignal);
      return Response.json([{ tag_name: "v0.1.19", assets: [] }]);
    },
  });
  assert.equal(result[0]?.tag_name, "v0.1.19");
});

test("allows local public-data collection without a token", async () => {
  assert.deepEqual(await fetchPublishedReleases({ fetchImpl: async (_url, options) => {
    assert.equal(new Headers(options?.headers).has("Authorization"), false);
    return Response.json([]);
  } }), []);
});

test("missing Actions token fails before making an anonymous request", async () => {
  let requests = 0;
  await assert.rejects(fetchPublishedReleases({ requireToken: true, fetchImpl: async () => {
    requests += 1;
    return Response.json([]);
  } }), /GITHUB_TOKEN is required/);
  assert.equal(requests, 0);
});

test("rate limits and invalid credentials fail without anonymous fallback or token logging", async () => {
  for (const status of [401, 403, 429]) {
    let requests = 0;
    await assert.rejects(fetchPublishedReleases({ token: "synthetic-secret", fetchImpl: async () => {
      requests += 1;
      return new Response(null, { status, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000000" } });
    } }), error => {
      assert.ok(error instanceof Error);
      assert.match(error.message, new RegExp(`request failed: ${status}`));
      assert.match(error.message, /authentication=workflow-token; rate-limit remaining=0, reset=1800000000/);
      assert.doesNotMatch(error.message, /synthetic-secret/);
      return true;
    });
    assert.equal(requests, 1);
  }
});

test("keeps authentication on every page and collects all returned releases", async () => {
  let requests = 0;
  const result = await fetchPublishedReleases({ token: "synthetic-test-token", fetchImpl: async (url, options) => {
    requests += 1;
    assert.equal(new URL(String(url)).searchParams.get("page"), String(requests));
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer synthetic-test-token");
    return Response.json(requests === 1 ? Array.from({ length: 100 }, () => ({ assets: [] })) : [{ assets: [] }]);
  } });
  assert.equal(requests, 2);
  assert.equal(result.length, 101);
});

test("does not return partial statistics when a later page fails", async () => {
  let requests = 0;
  await assert.rejects(fetchPublishedReleases({ fetchImpl: async () => {
    requests += 1;
    if (requests === 1) return Response.json(Array.from({ length: 100 }, () => ({ assets: [] })));
    throw new Error("synthetic network failure");
  } }), /synthetic network failure/);
  assert.equal(requests, 2);
});

test("rejects an unexpected successful API response instead of treating it as zero downloads", async () => {
  await assert.rejects(fetchPublishedReleases({ fetchImpl: async () => Response.json({ message: "not a release list" }) }), /not an array/);
});
