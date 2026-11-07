import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReleaseChannel, releaseTag } from '../scripts/release-channel.mjs';

test('stable majors use latest; previews never use latest', () => {
  for (const [version, tag] of [
    ['1.0.0', 'latest'], ['1.0.1', 'latest'], ['2.0.0', 'latest'],
    ['0.1.0-alpha.3', 'alpha'], ['0.1.0-beta.2', 'beta'],
    ['1.0.0-rc.1', 'beta'], ['1.1.0-beta.0', 'beta']
  ]) {
    assert.equal(releaseTag(version), tag);
    assertReleaseChannel({ name: 'refmint', version, publishConfig: { access: 'public', tag } });
    for (const wrong of ['latest', 'alpha', 'beta', 'stable'].filter(value => value !== tag)) {
      assert.throws(() => assertReleaseChannel({ name: 'refmint', version,
        publishConfig: { access: 'public', tag: wrong } }));
    }
  }
});

test('release policy rejects ambiguous, malformed and unsupported versions', () => {
  for (const version of [undefined, null, 1, '', '0.1.0', 'v1.0.0', '01.0.0',
    '1.00.0', '1.0.01', '1.0.0-beta', '1.0.0-beta.01', '1.0.0-dev.1',
    '1.0.0+build', '1.0.0-rc.1+build', '1.0.0\n', ' 1.0.0']) {
    assert.throws(() => releaseTag(version), String(version));
  }
});

test('manifest identity and explicit public channel are required', () => {
  const valid = { name: 'refmint', version: '1.0.0', publishConfig: { access: 'public', tag: 'latest' } };
  for (const invalid of [
    { ...valid, name: 'another-package' }, { ...valid, publishConfig: undefined },
    { ...valid, publishConfig: { access: 'public' } },
    { ...valid, publishConfig: { access: 'restricted', tag: 'latest' } }
  ]) assert.throws(() => assertReleaseChannel(invalid));
});
