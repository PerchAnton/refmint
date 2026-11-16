import { useEffect, useMemo, useState } from 'react';
import { latestLookup } from './latest-lookup.mjs';
export function useLookup() {
  const [result, setResult] = useState<any>(null);
  const lookup = useMemo(() => latestLookup(setResult), []);
  useEffect(() => () => lookup.dispose(), [lookup]);
  return { ...lookup, result };
}
export function Result({ value }) {
  return <output data-testid="result">{value?.ok ? value.canonical : value?.error}</output>;
}
