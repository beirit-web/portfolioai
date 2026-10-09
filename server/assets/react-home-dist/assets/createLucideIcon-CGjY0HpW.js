import{D as i,k as a}from"./preact-vendor-BzB9ud5D.js";const b=globalThis.BEIRIT_HOME_CONFIG||{};function h(){const o=globalThis.location;return!o||!/^517\d$/.test(o.port||"")?"":`${o.protocol}//${o.hostname}:8000`}const d=b.publicPageBaseUrl||h(),k=o=>`${d}${o}`;/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=o=>o.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),c=(...o)=>o.filter((t,r,e)=>!!t&&t.trim()!==""&&e.indexOf(t)===r).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var $={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=i(({color:o="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:e,className:s="",children:n,iconNode:l,...u},g)=>a("svg",{ref:g,...$,width:t,height:t,stroke:o,strokeWidth:e?Number(r)*24/Number(t):r,className:c("lucide",s),...u},[...l.map(([p,m])=>a(p,m)),...Array.isArray(n)?n:[n]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=(o,t)=>{const r=i(({className:e,...s},n)=>a(f,{ref:n,iconNode:t,className:c(`lucide-${w(o)}`,e),...s}));return r.displayName=`${o}`,r};export{d as a,B as c,h as g,b as h,k as p};
