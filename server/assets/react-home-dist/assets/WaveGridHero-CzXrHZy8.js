import{g as z,u as ne}from"./preact-vendor-BzB9ud5D.js";import{S as oe,W as re,a as se,A as ce,P as le,b as ue,D as te,B as de,I as fe,c as me,R as he,F as pe,C as y,M as ge,d as ve,O as we,e as xe,f as Me,g as ye,h as be,V as Ce,i as Te}from"./three-vendor-BMZE3j17.js";const h=96;function We(r){return r.replace("#include <common>",`#include <common>
      varying float vHeight;
      attribute vec2 aOffset;
      uniform sampler2D uTrailTexture;
      uniform int uTrailCount;
      uniform float uWaveSpeed;
      uniform float uWaveFreq;
      uniform float uWaveWidth;
      uniform float uFadeTime;
      uniform float uAmplitude;
      uniform float uJitter;
      uniform float uMaxHeight;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453123) - 0.5;
      }`).replace("#include <begin_vertex>",`#include <begin_vertex>

      vHeight = 0.0;

      if (position.y > 0.0) {
        vec2 jitter = hash2(aOffset) * uJitter;
        vec2 worldXZ = aOffset + jitter;
        float waveHeight = 0.0;
        float totalWeight = 0.0;

        for (int i = 0; i < ${h}; i++) {
          if (i >= uTrailCount) break;

          vec4 td = texture2D(
            uTrailTexture,
            vec2((float(i) + 0.5) / ${h}.0, 0.5)
          );
          float dist = length(worldXZ - td.rg);
          float wavefront = uWaveSpeed * td.b;
          float relDist = dist - wavefront;
          float window = exp(-(relDist * relDist) / (uWaveWidth * uWaveWidth));
          float fade = exp(-td.b / uFadeTime);
          float atten = 1.0 / (1.0 + dist * 0.1);
          float weight = fade * window * atten * td.a;

          waveHeight += weight * cos(uWaveFreq * relDist);
          totalWeight += weight;
        }

        waveHeight /= max(totalWeight, 1.0);
        float displacement = clamp(waveHeight * uAmplitude, -uMaxHeight, uMaxHeight);
        transformed.y += displacement;
        vHeight = displacement;
      }`)}function Ae(r){var Q;if((Q=window.matchMedia)==null?void 0:Q.call(window,"(prefers-reduced-motion: reduce)").matches)return{destroy:()=>{}};const d=new oe,o=new re({alpha:!0,antialias:!1,canvas:r,powerPreference:"high-performance"});o.setClearColor(0,0),o.outputColorSpace=se,o.toneMapping=ce,o.toneMappingExposure=1.45;const c=new le(38,1,.1,160);c.up.set(0,0,-1),d.add(c);const O=new ue(10484991,.9),L=new te(16777215,3.2);L.position.set(-12,14,8);const G=new te(9133302,1.6);G.position.set(9,8,-6),d.add(O,L,G);const n=r.clientWidth||1,_=n<768||(navigator.deviceMemory||8)<4||(navigator.hardwareConcurrency||8)<4,f=_?18:n<960?24:n<1440?30:34,g=n<640?.72:.76,ie=n<640?2.2:2.7,j=.035,v=f*(g+j),q=f*f,b=new de(g,ie,g),C=new fe(new Float32Array(q*2),2);b.setAttribute("aOffset",C);const p=new Float32Array(h*4),w=new me(p,h,1,he,pe);w.needsUpdate=!0;const T={uTrailTexture:{value:w},uTrailCount:{value:0},uFadeTime:{value:2.6},uWaveSpeed:{value:6.2},uWaveFreq:{value:1.35},uWaveWidth:{value:3.2},uAmplitude:{value:.82},uJitter:{value:.16},uMaxHeight:{value:1.05},uColorBase:{value:new y("#0f766e")},uColorHigh:{value:new y("#a5f3fc")}},W=new ge({color:16777215,emissive:new y("#0f766e"),emissiveIntensity:.22,shininess:90,specular:new y("#7dd3fc")});W.onBeforeCompile=e=>{Object.assign(e.uniforms,T),e.vertexShader=We(e.vertexShader),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
        varying float vHeight;
        uniform vec3 uColorBase;
        uniform vec3 uColorHigh;
        uniform float uMaxHeight;`).replace("#include <color_fragment>",`#include <color_fragment>
        float waveMix = clamp((vHeight / uMaxHeight) * 0.82, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, waveMix);`)};const u=new ve(b,W,q),A=new we,H=g+j,E=(f-1)*H/2;for(let e=0;e<f;e+=1)for(let t=0;t<f;t+=1){const a=e*f+t,i=e*H-E,l=t*H-E;A.position.set(i,0,l),A.updateMatrix(),u.setMatrixAt(a,A.matrix),C.setXY(a,i,l)}u.instanceMatrix.needsUpdate=!0,C.needsUpdate=!0,u.position.set(n<760?0:4.2,-1.15,n<760?0:-.6),u.rotation.z=n<760?-.06:-.14,d.add(u);const s=[];let x=null,P=0,M=0,F=0,X=performance.now(),S=0,R=0,D=0,B=0;const U=new Te,Y=new Ce,m=new xe(new Me(v*1.4,v*1.4),new ye({visible:!1,side:be}));m.rotation.x=-Math.PI/2,m.position.copy(u.position),d.add(m);function k(e,t,a=.9){let i=a;if(x){const l=e-x.x,ee=t-x.z;if(i=Math.sqrt(l*l+ee*ee),i<.18)return}s.length>=h&&s.shift(),s.push({x:e,z:t,age:0,distDelta:Math.max(.2,Math.min(i,1.25))}),x={x:e,z:t}}function J(){const e=u.position.x+(Math.random()-.5)*v*.72,t=u.position.z+(Math.random()-.5)*v*.72;k(e,t,.8+Math.random()*.25)}function ae(e){const t=T.uFadeTime.value*4;for(let i=s.length-1;i>=0;i-=1)s[i].age+=e,s[i].age>t&&s.splice(i,1);const a=Math.min(s.length,h);for(let i=0;i<a;i+=1){const l=i*4;p[l]=s[i].x,p[l+1]=s[i].z,p[l+2]=s[i].age,p[l+3]=s[i].distDelta}T.uTrailCount.value=a,w.needsUpdate=!0}function V(){const e=r.getBoundingClientRect(),t=Math.max(1,e.width),a=Math.max(1,e.height),i=Math.min(window.devicePixelRatio||1,_?1:1.25);o.setSize(t,a,!1),o.setPixelRatio(i),c.aspect=t/a,c.updateProjectionMatrix()}function $(){const e=n<760?21:19,t=R*Math.PI*.025+(n<760?.08:.02),a=S*Math.PI*.045+(n<760?0:-.13);c.position.set(-e*Math.cos(t)*Math.sin(a)+(n<760?0:2.4),e*Math.cos(t)*Math.cos(a),e*Math.sin(t)+(n<760?5.2:2.6)),c.lookAt(n<760?0:3.2,0,n<760?0:-.8)}function N(e){const t=r.getBoundingClientRect();if(!t.width||!t.height)return;D=(e.clientX-t.left)/t.width*2-1,B=-((e.clientY-t.top)/t.height)*2+1,Y.set(D,B),U.setFromCamera(Y,c);const a=U.intersectObject(m);a.length&&(k(a[0].point.x,a[0].point.z),P=0,M=0)}function Z(e){const t=Math.min((e-X)/1e3,.05);X=e,S+=(D-S)*.045,R+=(B-R)*.045,P+=t,M+=t,P>1.2&&M>1.05&&(J(),M=0),$(),ae(t),o.render(d,c),F=window.requestAnimationFrame(Z)}V(),$();for(let e=0;e<7;e+=1)J();const K=new ResizeObserver(V);return K.observe(r),window.addEventListener("pointermove",N,{passive:!0}),F=window.requestAnimationFrame(Z),{destroy(){window.cancelAnimationFrame(F),window.removeEventListener("pointermove",N),K.disconnect(),d.remove(u,m),b.dispose(),W.dispose(),m.geometry.dispose(),m.material.dispose(),w.dispose(),o.dispose()}}}function Fe(){const r=z.useRef(null),[I,d]=z.useState(!1);return z.useEffect(()=>{if(!r.current)return;let o,c;try{o=Ae(r.current),c=window.requestAnimationFrame(()=>d(!0))}catch{r.current.dataset.waveGridError="true";return}return()=>{window.cancelAnimationFrame(c),o==null||o.destroy()}},[]),ne("canvas",{ref:r,className:`hero-stage__wave-grid-canvas${I?" is-ready":""}`})}export{Fe as default};
