/** Full installers became the public download contract at 0.1.19.
 * @param {string | null} version
 */
export function hasOfflineInstallers(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return false;
  const [major = 0n, minor = 0n, patch = 0n] = version.split('.').map(BigInt);
  return major > 0n || minor > 1n || (minor === 1n && patch >= 19n);
}
