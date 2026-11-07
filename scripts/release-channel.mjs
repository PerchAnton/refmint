import assert from 'node:assert/strict';

// Release policy is intentionally narrower than arbitrary valid SemVer:
// alpha/beta/rc.N previews, and stable majors starting at 1. No build aliases.
export function releaseTag(version) {
  assert.equal(typeof version, 'string', 'Version must be a string');
  const number = '(?:0|[1-9][0-9]*)';
  const match = new RegExp(`^(${number})\\.${number}\\.${number}(?:-(alpha|beta|rc)\\.(${number}))?$`).exec(version);
  assert.ok(match && match[0] === version, 'Use X.Y.Z or X.Y.Z-alpha/beta/rc.N without build metadata');
  if (match[2]) return match[2] === 'alpha' ? 'alpha' : 'beta';
  assert.notEqual(match[1], '0', 'Stable releases start at major 1');
  return 'latest';
}

export function assertReleaseChannel(manifest) {
  assert.equal(manifest.name, 'refmint');
  assert.equal(manifest.publishConfig?.access, 'public');
  assert.equal(manifest.publishConfig?.tag, releaseTag(manifest.version),
    'The publication tag must match the version channel');
}
