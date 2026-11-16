import {render} from 'solid-js/web';
import {createSignal} from 'solid-js';
import {createForm} from '@modular-forms/solid';
import {valid,message} from './reference.mjs';
export function mountSolid(target){
 return render(()=>{
  const [status,setStatus]=createSignal('');
  const [, {Form,Field}]=createForm({initialValues:{reference:''}});
  return <Form onSubmit={()=>setStatus('Valid code; authorization not checked.')}>
   <Field name="reference" validate={value=>valid(value)?'':message}>{(field,props)=><>
    <label>Reference<input {...props} value={field.value??''} onInput={event=>{props.onInput(event);setStatus('')}} /></label>
    <p role="alert">{field.error}</p>
   </>}</Field><button type="submit">Validate</button><p role="status">{status()}</p>
  </Form>;
 },target);
}
