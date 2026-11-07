// The same consumer is compiled against each historical package and the candidate.
import {
  createReferences, createReferenceCodec, planReferences, collisionProbability,
  type Reference, type ReferenceOptions, type ReferencePlan, type References,
  type ParseError, type ParseResult, type ParseDiagnostic, type ValidationDetails,
  type ReferenceKind, type ReferenceValue, type EncodedReference,
  type ReferenceCodecOptions, type ReferenceCodec, type DecodeError,
  type DecodeResult, type DecodeDiagnostic
} from 'refmint';
import { createReferenceCodec as standalone, type EncodedReference as StandaloneReference } from 'refmint/codec';

const options: ReferenceOptions<'ticket'> = { prefix: 'ticket', randomLength: 14 };
const refs: References<'ticket'> = createReferences(options);
const random: Reference<'ticket'> = refs.generate();
const plan: ReferencePlan = planReferences(options);
const probability: number = collisionProbability(plan.randomLength, 1000);
const randomResult: ParseResult<'ticket'> = refs.parse('input');
const canonical: ParseResult<'ticket'> = refs.parseCanonical(random);
const diagnosis: ParseDiagnostic<'ticket'> = refs.diagnose('input');
const codecOptions: ReferenceCodecOptions<'btk', 'uint64'> = { prefix: 'btk', kind: 'uint64', version: 1 };
const codec: ReferenceCodec<'btk', 'uint64'> = createReferenceCodec(codecOptions);
const kind: ReferenceKind = codec.kind;
const value: ReferenceValue<'uint64'> = 9007199254740993n;
const encoded: EncodedReference<'btk', 'uint64'> = codec.encode(value);
const subpath: StandaloneReference<'btk', 'uint64'> = standalone(codecOptions).encode(42n);
codec.format(subpath);
const result: DecodeResult<'btk', 'uint64'> = codec.decode(encoded);
const strict: DecodeResult<'btk', 'uint64'> = codec.decodeCanonical(encoded);
const detail: DecodeDiagnostic<'btk', 'uint64'> = codec.diagnose('input');
if (result.ok) {
  const decoded: bigint = result.value;
  const normalized: boolean = result.normalized;
  codec.format(result.id);
  void [decoded, normalized];
} else {
  const error: DecodeError = result.error;
  void error;
}
if (!diagnosis.ok) {
  const error: ParseError = diagnosis.error;
  const details: ValidationDetails = diagnosis.details;
  const position: number | undefined = details.positions?.[0];
  const unit: 'input_code_units' | 'data_symbols' | 'payload_symbols' | undefined = details.unit;
  void [error, position, unit];
}
const uuids = createReferenceCodec({ prefix: 'btk', kind: 'uuid' });
const uuid: ReferenceValue<'uuid'> = '550e8400-e29b-41d4-a716-446655440000';
const uuidResult = uuids.decode(uuids.encode(uuid));
if (uuidResult.ok) { const original: string = uuidResult.value; void original; }
// @ts-expect-error uint64 never accepts an imprecise JS number.
codec.encode(42);
// @ts-expect-error UUID and uint64 brands are distinct.
uuids.format(encoded);
// @ts-expect-error Record namespaces cannot be interchanged.
createReferenceCodec({ prefix: 'other', kind: 'uint64' }).format(encoded);
// @ts-expect-error Unvalidated text is not a canonical reference.
codec.format('btk_1pqp2cy59jf');
// @ts-expect-error Random references cannot be treated as existing-ID references.
codec.format(random);
// @ts-expect-error The version remains wire v1, independently of package version.
createReferenceCodec({ prefix: 'btk', kind: 'uint64', version: 2 });
// @ts-expect-error Factories do not change configuration after construction.
codec.prefix = 'other';
// @ts-expect-error A partial collision budget is invalid.
createReferences({ prefix: 'ticket', expectedCount: 1000 });
// @ts-expect-error Budget and fixed length cannot both be supplied.
createReferences({ prefix: 'ticket', randomLength: 14, expectedCount: 1000, maxCollisionProbability: 1e-9 });
// @ts-expect-error Random-reference brands retain the namespace.
createReferences({ prefix: 'other', randomLength: 14 }).format(random);
void [probability, randomResult, canonical, kind, strict, detail];

// Keep machine-readable discriminants usable by exhaustive consumers.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type ParseCodes = Expect<Equal<ParseError,
  'type' | 'too_long' | 'format' | 'case' | 'character' | 'checksum' | 'prefix' | 'length' | 'non_canonical'>>;
type DecodeCodes = Expect<Equal<DecodeError, ParseError | 'version' | 'kind' | 'overflow'>>;
type Kinds = Expect<Equal<ReferenceKind, 'uint64' | 'uuid'>>;
type NumericValue = Expect<Equal<ReferenceValue<'uint64'>, bigint>>;
type UuidValue = Expect<Equal<ReferenceValue<'uuid'>, string>>;
