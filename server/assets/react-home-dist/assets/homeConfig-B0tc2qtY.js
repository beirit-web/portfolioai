import{D as i,k as a}from"./preact-vendor-BzB9ud5D.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=o=>o.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),c=(...o)=>o.filter((t,r,e)=>!!t&&t.trim()!==""&&e.indexOf(t)===r).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var h={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=i(({color:o="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:e,className:s="",children:n,iconNode:l,...u},g)=>a("svg",{ref:g,...h,width:t,height:t,stroke:o,strokeWidth:e?Number(r)*24/Number(t):r,className:c("lucide",s),...u},[...l.map(([p,m])=>a(p,m)),...Array.isArray(n)?n:[n]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=(o,t)=>{const r=i(({className:e,...s},n)=>a(d,{ref:n,iconNode:t,className:c(`lucide-${b(o)}`,e),...s}));return r.displayName=`${o}`,r},w=globalThis.BEIRIT_HOME_CONFIG||{};function $(){const o=globalThis.location;return!o||!/^517\d$/.test(o.port||"")?"":`${o.protocol}//${o.hostname}:8000`}const f=w.publicPageBaseUrl||$(),B=o=>`${f}${o}`;export{f as a,k as c,$ as g,w as h,B as p};
