import test from 'node:test';
import assert from 'node:assert/strict';
import { hasOfflineInstallers } from '../src/lib/release-capabilities.mjs';
test('old downloads stay legacy until an actual 0.1.19-or-newer manifest is published', () => {
  for (const version of [null,'','0.1.18','0.0.99','0.1.19-beta','invalid']) assert.equal(hasOfflineInstallers(version),false);
  for (const version of ['0.1.19','0.1.20','0.2.0','1.0.0']) assert.equal(hasOfflineInstallers(version),true);
});
