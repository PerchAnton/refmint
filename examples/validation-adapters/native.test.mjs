import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWith} from './server.mjs';
import {good,bad,wrong} from './reference.mjs';
for(const library of ['vine','class-validator','typebox','express-validator','validatorjs']) {
 for(const [name,raw,expected] of [['printed',good,true],['checksum',bad,false],['namespace',wrong,false],['empty','',false],['non-ascii','О'+good.slice(1),false]]) {
  test(`${library}: ${name}`,async()=>{const result=await validateWith(library,raw);assert.equal(result.ok,expected);assert.equal(result.raw,raw);if(library==='express-validator')assert.deepEqual(result.matched,expected?{reference:raw}:{})});
 }
}
