import vine, {ValidationError} from '@vinejs/vine';
import {ValidateBy,validateSync} from 'class-validator';
import Type from 'typebox';
import Value from 'typebox/value';
import Format from 'typebox/format';
import {body,validationResult,matchedData} from 'express-validator';
import Validator from 'validatorjs';
import {valid,checked,message} from './reference.mjs';

const orderRule=vine.createRule((value,_options,field)=>{if(!valid(value))field.report(message,'orderReference',field)});
const vineSchema=vine.compile(vine.object({reference:vine.string().use(orderRule())}));
class Request {constructor(reference){this.reference=reference}}
ValidateBy({name:'orderReference',validator:{validate:valid,defaultMessage:()=>message}})(Request.prototype,'reference');
// A format annotation alone does not validate the checksum. Register its implementation.
Format.Set('order-reference-v1',valid);
const typeSchema=Type.Object({reference:Type.String({format:'order-reference-v1'})});
Validator.register('order_reference_v1',valid,message);
export async function validateWith(library,raw) {
 const original=raw;
 if(library==='vine') {try{const value=await vineSchema.validate({reference:raw});return {ok:true,raw,value:value.reference}}catch(e){if(!(e instanceof ValidationError))throw e;return {ok:false,raw,error:e.messages}}}
 if(library==='class-validator') {const errors=validateSync(new Request(raw));return {ok:errors.length===0,raw,error:errors.map(e=>e.constraints)}}
 if(library==='typebox') return {ok:Value.Check(typeSchema,{reference:raw}),raw};
 if(library==='express-validator') {const req={body:{reference:raw}};await body('reference').custom(checked).run(req);const errors=validationResult(req);return {ok:errors.isEmpty(),raw:req.body.reference,matched:matchedData(req)}}
 if(library==='validatorjs') {const validation=new Validator({reference:raw},{reference:'required|order_reference_v1'});return {ok:validation.passes(),raw:original,error:validation.errors.all()}}
 throw new Error('Unknown validator');
}
