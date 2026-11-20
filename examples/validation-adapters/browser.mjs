import {createApp,h,reactive,ref} from 'vue';
import useVuelidate from '@vuelidate/core';
import {helpers,required} from '@vuelidate/validators';
import {useRegle,createRule} from '@regle/core';
import {createForm as createFelte} from '@felte/vanilla';
import jsonEditorURL from '@json-editor/json-editor/dist/jsoneditor.js?url';
import {mountSolid} from './solid.jsx';
import {good,valid,message} from './reference.mjs';
const names=['modular-forms','vuelidate','regle','felte','json-editor'];
const name=new URLSearchParams(location.search).get('library')??names[0];
document.querySelector('#nav').innerHTML=names.map(n=>`<a href="?library=${n}">${n}</a>`).join('');
document.querySelector('#sample').textContent=good;
const target=document.querySelector('#app');
const success='Valid code; authorization not checked.';
if(name==='modular-forms') mountSolid(target);
else if(name==='vuelidate'||name==='regle') {
 createApp({setup(){
  const state=reactive({reference:''}),status=ref(''),error=ref('');
  const validation=name==='vuelidate'?useVuelidate({reference:{required,order:helpers.withMessage(message,valid)}},state):useRegle(state,{reference:{order:createRule({type:'order',validator:valid,message})}});
  async function submit(e){e.preventDefault();const result=name==='vuelidate'?await validation.value.$validate():await validation.r$.$validate();const ok=name==='vuelidate'?result:result.valid;status.value=ok?success:'';error.value=ok?'':message}
  return ()=>h('form',{onSubmit:submit},[
   h('label',['Reference',h('input',{value:state.reference,onInput:e=>{state.reference=e.target.value;status.value='';error.value=''}})]),
   h('p',{role:'alert'},error.value),h('button',{type:'submit'},'Validate'),h('p',{role:'status'},status.value)]);
 }}).mount(target);
} else if(name==='felte') {
 target.innerHTML='<form><label>Reference<input name="reference"></label><p role="alert"></p><button type="submit">Validate</button><p role="status"></p></form>';
 const form=createFelte({initialValues:{reference:''},validate:values=>valid(values.reference)?{}:{reference:message},onSubmit:()=>{target.querySelector('[role=status]').textContent=success}});
 form.errors.subscribe(errors=>{target.querySelector('[role=alert]').textContent=errors.reference?.join?.(' ')??errors.reference??''});
 form.form(target.querySelector('form'));
 // This demo uses full-page navigation; a SPA must call the returned destroy hook.
 target.querySelector('input').addEventListener('input',()=>{target.querySelector('[role=status]').textContent=''});
} else if(name==='json-editor') {
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=jsonEditorURL;script.onload=resolve;script.onerror=()=>reject(new Error('Cannot load JSON Editor'));document.head.append(script)});
 const JSONEditor=window.JSONEditor;
 JSONEditor.defaults.custom_validators.push((schema,value,path)=>schema.format==='order-reference-v1'&&!valid(value)?[{path,property:'format',message}]:[]);
 const editor=new JSONEditor(target,{schema:{type:'object',required:['reference'],properties:{reference:{type:'string',title:'Reference',format:'order-reference-v1'}}},startval:{reference:''},disable_edit_json:true,disable_properties:true,no_additional_properties:true,show_errors:'always'});
 const button=document.createElement('button');button.textContent='Validate';button.type='button';target.after(button);
 const status=document.createElement('p');status.setAttribute('role','status');button.after(status);
 let validatedValue=null;
 button.onclick=()=>{const value=editor.getValue();const ok=editor.validate(value).length===0;validatedValue=ok?JSON.stringify(value):null;status.textContent=ok?success:''};
 editor.on('change',()=>{if(JSON.stringify(editor.getValue())!==validatedValue)status.textContent=''});
 target.addEventListener('input',()=>{validatedValue=null;status.textContent=''})
} else throw new Error('Unknown library');
