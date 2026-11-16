import { submitReference } from './reference.mjs';

export function latestLookup(publish, request = submitReference) {
  let revision = 0;
  return {
    dispose() {
      revision++;
    },
    invalidate() {
      revision++;
      publish(null);
    },
    async submit(raw) {
      const ownRevision = ++revision;
      publish(null);
      try {
        const result = await request(raw);
        if (ownRevision === revision) publish(result);
      } catch {
        if (ownRevision === revision) publish({ ok: false, error: 'Lookup failed. Please retry.' });
      }
    },
  };
}
