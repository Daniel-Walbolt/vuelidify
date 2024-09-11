var A=(a,t,e)=>new Promise((i,o)=>{var r=n=>{try{u(e.next(n))}catch(V){o(V)}},d=n=>{try{u(e.throw(n))}catch(V){o(V)}},u=n=>n.done?i(n.value):Promise.resolve(n.value).then(r,d);u((e=e.apply(a,t)).next())});function w(a){let t=0,e;return(...i)=>{var r;let o=++t;return e=(r=e==null?void 0:e.then(()=>{if(t==o)return e=a(...i).then(d=>(e=void 0,d)),e}))!=null?r:a(...i).then(d=>(e=void 0,d)),e}}function O(a,t){let e=0,i;return(...o)=>new Promise(r=>{let d=++e,u=new Date().getTime();i!=null||(i=u-t);let n=u-i-t;n<0?new Promise(V=>setTimeout(V,-1*n)).then(()=>{i=new Date().getTime(),d==e&&r(a(...o)),r(void 0)}):(i=u,r(a(...o)))})}function k(a,t=e=>e){return a.reduce((e,i)=>{if(i!==void 0){let o=t(i);o!==void 0&&e.push(o)}return e},[])}function C(a){return a.reduce((t,e)=>{if(e!==void 0)if(e instanceof Array)for(let i of e)i!==void 0&&t.push(i);else t.push(e);return t},[])}function _(){return a=>({isValid:a.value!=null&&String(a.value).trim().length>0,errorMessage:"This field is required"})}function aa(a,t){return e=>A(this,null,function*(){return a(e)==!1?{isValid:!0}:t})}function ea(a){return t=>{var i;let e=String((i=t.value)!=null?i:"");return{isValid:e.length>=a,errorMessage:`Too short (${e.length} / ${a})`}}}function ta(a){return t=>{var e,i,o,r;return{isValid:((i=(e=t.value)==null?void 0:e.length)!=null?i:0)<=a,errorMessage:`Too long (${(r=(o=t.value)==null?void 0:o.length)!=null?r:0} / ${a})`}}}function ia(a){return t=>({isValid:t.value!=null&&t.value>=a,errorMessage:`Must be atleast ${a}`})}function na(){return a=>({isValid:a.value?RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(a.value):!1,errorMessage:"Invalid email format"})}import{ref as q,computed as G,watch as W,reactive as S}from"vue";import{computed as E}from"vue";import{computed as g,reactive as N,ref as b}from"vue";function D(){return`${Date.now()}-${Math.floor(Math.random()*1e3)}`}function T(a,t,e){let i=[],o=r=>`${t?"reactive":"lazy"}-${D()}`;e!=null&&(o=r=>`${e}-${r}`);for(let[r,d]of a.entries())i.push({validatorId:o(r),validator:d,optimized:!1,isReactive:t,previouslyReturnedValidators:!1,previouslySpawnedValidators:{},spawnedValidators:{}});return i}function h(a,t,e=[]){var V,c,f,s;let i=N({isValid:g(()=>{var P,l;let y=(P=n.lazyIsValid.value)!=null?P:!1,m=(l=n.reactiveIsValid.value)!=null?l:!1;return y&&m}),isValidating:g(()=>n.validatingReactive.value||n.validatingLazy.value),isErrored:g(()=>i.validationResults.some(y=>y.isValid==!1)),errorMessages:g(()=>C(k(i.validationResults,y=>y.isValid?void 0:y.errorMessage))),validationResults:g(()=>n.validationResults.value),arrayState:g(()=>{if(Array.isArray(a.value)===!1||n.elementValidation===void 0)return[];let y=a.value,m=n.elementValidation,P=n.arrayConfigMap,l,v=[];for(let p=0;p<y.length;p++){if(y[p].$ffId===void 0&&Object.defineProperty(y[p],"$ffId",{value:`${n.id}-${n.elementId++}`,writable:!1,configurable:!1,enumerable:!1}),l=y[p].$ffId,v.push(l),P[l])continue;let I=g(()=>y[p]);if(L(m)){let x=h(I,m,n.arrayParents.concat(I));P[l]={validationConfigs:[x],validationState:x.validationState}}else{let j=y[p],M=$(j,m,n.arrayParents.concat(I));P[l]={validationConfigs:M.validationConfigs,validationState:M.state}}}let R=[],K={};for(let p of v)R.push(P[p].validationState),K[p]=P[p];return n.arrayConfigMap=K,R})}),o=!(((c=(V=t.$lazy)==null?void 0:V.length)!=null?c:-1)>0),r=!(((s=(f=t.$reactive)==null?void 0:f.length)!=null?s:-1)>0),d=t.$reactive?T(t.$reactive,!0):[],u=t.$lazy?T(t.$lazy,!1):[],n={id:D(),validationIterationId:0,reactiveIsValid:b(r),validatingReactive:b(!1),reactiveProcessedValidators:d,lazyIsValid:b(o),validatingLazy:b(!1),lazyProcessedValidators:u,property:a,validation:t,validationState:i,validationResults:b([]),arrayConfigMap:{},elementId:0,elementValidation:t.$each,arrayParents:N(e)};return n}function $(a,t,e=[]){let i=[],o={};t!==void 0&&r(a,t);function r(d,u){for(let n in u){let V=g(()=>d[n]);if(L(u[n])){let c=u[n],f=h(V,c,e);i.push(f),o[n]=f.validationState}else{let c={},f=u[n];o[n]=c,r(V,f)}}}return{validationConfigs:i,state:o}}function L(a){return(a==null?void 0:a.$reactive)!==void 0||(a==null?void 0:a.$lazy)!==void 0||(a==null?void 0:a.$each)!==void 0}var z=500;function J(a,t,e,i,o){return A(this,null,function*(){let r=!0,d=(V,c)=>{if(o!==a.validationIterationId)return;c.isValid===!1&&(r=!1),c.identifier=V.validatorId;let f=a.validationResults.value.find(s=>s.identifier===c.identifier);f!==void 0?Object.assign(f,c):a.validationResults.value.push(c)},{asyncPromises:u,validatorsWhichPreviouslyReturnedValidators:n}=Q(a,t,e,i,o,d,!0,1);if(yield Promise.all(u),o===a.validationIterationId){for(let V of n)for(let c of Object.keys(V.previouslySpawnedValidators))if(V.spawnedValidators[c]==null){let f=a.validationResults.value.findIndex(s=>s.identifier===c);f!==-1&&a.validationResults.value.splice(f)}}return r})}function Q(a,t,e,i,o,r,d,u){let n=a.property.value,V=[],c=[],f=[];for(let s of i){let y=!1;s.previouslyReturnedValidators&&(s.previouslySpawnedValidators=s.spawnedValidators,s.spawnedValidators={},y=!0),s.previouslyReturnedValidators=!1;let m;if(s.computedValidator===void 0){let P={value:n,parent:t,args:e,arrayParents:a.arrayParents.map(l=>l.value)};m=s.validator(P)}else m=s.computedValidator.value;if(m instanceof Promise){let P=Date.now();V.push(m.then(l=>A(this,null,function*(){if(l===void 0){y&&f.push(s);return}let v=Date.now()-P;if(d&&v>z&&s.optimized===!1&&(s.optimized=!0,v<2*z?s.validator=O(s.validator,z):s.validator=w(s.validator)),Array.isArray(l)){let{asyncPromises:R,syncResults:K}=B(a,t,e,o,r,s,l,u);c.push(...K),yield Promise.all(R);return}else y&&f.push(s);r(s,l)})))}else if(Array.isArray(m)){let{asyncPromises:P,syncResults:l}=B(a,t,e,o,r,s,m,u);V.push(...P),c.push(...l)}else if(y&&f.push(s),m!==void 0){if(d&&s.optimized===!1){let P=s.validator;s.computedValidator=E(()=>{console.log("computed ran instead");let l={value:a.property.value,parent:t,args:e,arrayParents:a.arrayParents.map(v=>v.value)};return P(l)}),s.optimized=!0,s.validator=()=>s.computedValidator.value}c.push(m),r(s,m)}}return{asyncPromises:V,syncResults:c,validatorsWhichPreviouslyReturnedValidators:f}}function B(a,t,e,i,o,r,d,u){let n=T(d,r.isReactive,r.validatorId),V=Q(a,t,e,n,i,o,!1,++u),c={};for(let f of n)c[f.validatorId]=f;return r.spawnedValidators=c,r.previouslyReturnedValidators=!0,V}function U(a,t,e,i){return A(this,null,function*(){a.validatingReactive.value=!0;let o=a.reactiveProcessedValidators,r=yield J(a,t,e,o,i);return i===a.validationIterationId&&(a.reactiveIsValid.value=r,a.validatingReactive.value=!1),a.reactiveIsValid.value})}function Z(a,t,e,i){return A(this,null,function*(){a.validatingLazy.value=!0;let o=a.lazyProcessedValidators,r=yield J(a,t,e,o,i);return i===a.validationIterationId&&(a.lazyIsValid.value=r,a.validatingLazy.value=!1),a.lazyIsValid.value})}function F(a,t,e,i,o){return A(this,null,function*(){let r=[];for(let d of a){let u=++d.validationIterationId;if(i&&d.validation.$reactive!==void 0&&r.push(U(d,t.value,e,u)),o&&d.validation.$lazy!==void 0&&r.push(Z(d,t.value,e,u)),d.elementValidation!==void 0){let n=[];for(let V in d.arrayConfigMap)n.push(...d.arrayConfigMap[V].validationConfigs);r.push(F(n,t,e,i,o))}}return Promise.all(r).then(d=>d.every(u=>u===!0))})}function H(a){var P;(P=a.delayReactiveValidation)!=null||(a.delayReactiveValidation=!0);let{objectToValidate:t,validation:e,delayReactiveValidation:i,args:o}=a,r=q(!1),d=G(()=>n.some(l=>l.validationState.isValidating)),u=G(()=>n.every(v=>v.reactiveIsValid.value&&v.lazyIsValid.value)),n=[],V=S({}),c=q(JSON.stringify(a.objectToValidate.value)),f=G(()=>c.value!==JSON.stringify(a.objectToValidate.value));if((e==null?void 0:e.$reactive)!=null||(e==null?void 0:e.$lazy)!=null||(e==null?void 0:e.$each)!=null){let R=h(t,e);V=S(R.validationState),n=[R]}else{let l=t,v=e,R=$(l.value,v);V=S(R.state),n=R.validationConfigs}W(a.objectToValidate,()=>{i?r.value==!0&&F(n,t,o,!0,!1):(console.time("Reactive validation"),F(n,t,o,!0,!1),console.timeEnd("Reactive validation"))},{deep:!0});function y(){return A(this,null,function*(){let l=yield F(n,t,o,!0,!0);return r.value=!0,l})}function m(l){c.value=JSON.stringify(l)}return S({hasValidated:r,validate:y,isValidating:d,propertyState:G(()=>V),isValid:u,setReference:m,isDirty:f})}export{w as bufferAsync,na as isEmailSync,ta as maximumLength,ia as minValue,ea as minimumLength,_ as required,O as throttleQueueAsync,H as useValidation,aa as validateIf};
