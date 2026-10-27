// Independent application adapter around bech32@2.0.0, matching RefMint v1.
// No RefMint imports. Both implementations receive the same input contract.
export function createBech32Adapter(bech32m, { prefix, kind }) {
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const tag = kind === 'uint64' ? 0 : 1;
  const bits = kind === 'uint64' ? 64n : 128n;
  if (!/^[a-z][a-z0-9]{0,15}$/.test(prefix) || !['uint64', 'uuid'].includes(kind)) throw new TypeError('Invalid configuration');
  function diagnose(input) {
    const fail = (error, details = {}) => ({ ok: false, error, details });
    if (typeof input !== 'string') return fail('type');
    if (input.length > 128) return fail('too_long', { expected: 128, actual: input.length, unit: 'input_code_units' });
    const nonAscii = [];
    let pos = 0;
    for (const ch of input) { if (ch.codePointAt(0) > 127) nonAscii.push(pos); pos += ch.length; }
    if (nonAscii.length) return fail('character', { positions: nonAscii });
    const offset = input.match(/^[ \t\r\n]*/)[0].length;
    let text = input.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
    if (text !== text.toLowerCase() && text !== text.toUpperCase()) return fail('case');
    text = text.toLowerCase();
    const sep = text.lastIndexOf('1');
    if (sep < 1 || !/^[a-z][a-z0-9]{0,15}_$/.test(text.slice(0, sep))) return fail('format');
    const body = text.slice(sep + 1);
    const groups = body.split('-');
    if (groups.length > 1 && groups.some((g, i) => i < groups.length - 1 ? g.length !== 4 : g.length < 1 || g.length > 4)) return fail('format');
    const positions = [];
    for (let i = 0; i < body.length; i++) if (body[i] !== '-' && !alphabet.includes(body[i])) positions.push(offset + sep + 1 + i);
    if (positions.length) return fail('character', { positions });
    text = text.slice(0, sep + 1) + groups.join('');
    let decoded;
    try { decoded = bech32m.decode(text); } catch { return fail('checksum'); }
    if (decoded.prefix !== prefix + '_') return fail('prefix', { expected: prefix, actual: decoded.prefix.slice(0, -1) });
    const { words } = decoded;
    if (words.length < 2) return fail('length', { expected: 'at least 2', actual: words.length, unit: 'data_symbols' });
    if (words[0] !== 1) return fail('version', { expected: 1, actual: words[0] });
    if (words[1] !== tag) return fail('kind', { expected: kind, actual: words[1] === 0 ? 'uint64' : words[1] === 1 ? 'uuid' : words[1] });
    const data = words.slice(2);
    if (kind === 'uuid' ? data.length !== 26 : data.length < 1 || data.length > 13) return fail('length', { expected: kind === 'uuid' ? 26 : '1–13', actual: data.length, unit: 'payload_symbols' });
    const n = data.reduce((value, word) => value * 32n + BigInt(word), 0n);
    if (n >= 2n ** bits) return fail('overflow');
    if (kind === 'uint64' && data.length > 1 && data[0] === 0) return fail('non_canonical');
    const hex = n.toString(16).padStart(32, '0');
    const value = kind === 'uint64' ? n : [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
    return { ok: true, id: text, value, normalized: text !== input };
  }
  function encode(input) {
    if (kind === 'uint64' ? typeof input !== 'bigint' : typeof input !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input)) throw new TypeError('Invalid source ID');
    let n = kind === 'uint64' ? input : BigInt('0x' + input.replaceAll('-', ''));
    if (n < 0n || n >= 2n ** bits) throw new RangeError('Source ID out of range');
    const words = [];
    do { words.unshift(Number(n % 32n)); n /= 32n; } while (n > 0n);
    if (kind === 'uuid') while (words.length < 26) words.unshift(0);
    return bech32m.encode(prefix + '_', [1, tag, ...words]);
  }
  return {
    encode, diagnose,
    format(id) {
      const p = diagnose(id);
      if (!p.ok || p.normalized) throw new TypeError('Expected a canonical reference');
      const start = id.lastIndexOf('1') + 1;
      return id.slice(0, start) + id.slice(start).match(/.{1,4}/g).join('-');
    }
  };
}
