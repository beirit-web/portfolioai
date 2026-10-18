import{g as E,u as re}from"./preact-vendor-CK4IGXRi.js";import{S as se,W as ce,a as le,A as ue,P as de,b as fe,D as ne,B as me,I as he,c as pe,R as ve,F as ge,C as b,M as we,d as xe,O as Me,e as ye,f as be,g as Ce,h as Te,V as We,i as Ae}from"./three-vendor-BJgQQUs9.js";const p=96;function Fe(o){return o.replace("#include <common>",`#include <common>
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

        for (int i = 0; i < ${p}; i++) {
          if (i >= uTrailCount) break;

          vec4 td = texture2D(
            uTrailTexture,
            vec2((float(i) + 0.5) / ${p}.0, 0.5)
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
      }`)}function He(o){if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return{destroy:()=>{}};const d=new se,s=new ce({alpha:!0,antialias:!1,canvas:o,powerPreference:"high-performance"});s.setClearColor(0,0),s.outputColorSpace=le,s.toneMapping=ue,s.toneMappingExposure=1.45;const c=new de(38,1,.1,160);c.up.set(0,0,-1),d.add(c);const q=new fe(10484991,.9),_=new ne(16777215,3.2);_.position.set(-12,14,8);const j=new ne(9133302,1.6);j.position.set(9,8,-6),d.add(q,_,j);const a=o.clientWidth||1,X=a<768||(navigator.deviceMemory||8)<4||(navigator.hardwareConcurrency||8)<4,f=X?18:a<960?24:a<1440?30:34,g=a<640?.72:.76,ae=a<640?2.2:2.7,U=.035,w=f*(g+U),V=f*f,C=new me(g,ae,g),T=new he(new Float32Array(V*2),2);C.setAttribute("aOffset",T);const v=new Float32Array(p*4),x=new pe(v,p,1,ve,ge);x.needsUpdate=!0;const W={uTrailTexture:{value:x},uTrailCount:{value:0},uFadeTime:{value:2.6},uWaveSpeed:{value:6.2},uWaveFreq:{value:1.35},uWaveWidth:{value:3.2},uAmplitude:{value:.82},uJitter:{value:.16},uMaxHeight:{value:1.05},uColorBase:{value:new b("#0f766e")},uColorHigh:{value:new b("#a5f3fc")}},A=new we({color:16777215,emissive:new b("#0f766e"),emissiveIntensity:.22,shininess:90,specular:new b("#7dd3fc")});A.onBeforeCompile=e=>{Object.assign(e.uniforms,W),e.vertexShader=Fe(e.vertexShader),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
        varying float vHeight;
        uniform vec3 uColorBase;
        uniform vec3 uColorHigh;
        uniform float uMaxHeight;`).replace("#include <color_fragment>",`#include <color_fragment>
        float waveMix = clamp((vHeight / uMaxHeight) * 0.82, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, waveMix);`)};const u=new xe(C,A,V),F=new Me,H=g+U,Y=(f-1)*H/2;for(let e=0;e<f;e+=1)for(let t=0;t<f;t+=1){const n=e*f+t,i=e*H-Y,l=t*H-Y;F.position.set(i,0,l),F.updateMatrix(),u.setMatrixAt(n,F.matrix),T.setXY(n,i,l)}u.instanceMatrix.needsUpdate=!0,T.needsUpdate=!0,u.position.set(a<760?0:4.2,-1.15,a<760?0:-.6),u.rotation.z=a<760?-.06:-.14,d.add(u);const r=[];let M=null,P=0,y=0,m=0,S=!0,R=performance.now(),D=0,I=0,O=0,B=0;const k=new Ae,J=new We,h=new ye(new be(w*1.4,w*1.4),new Ce({visible:!1,side:Te}));h.rotation.x=-Math.PI/2,h.position.copy(u.position),d.add(h);function $(e,t,n=.9){let i=n;if(M){const l=e-M.x,ie=t-M.z;if(i=Math.sqrt(l*l+ie*ie),i<.18)return}r.length>=p&&r.shift(),r.push({x:e,z:t,age:0,distDelta:Math.max(.2,Math.min(i,1.25))}),M={x:e,z:t}}function N(){const e=u.position.x+(Math.random()-.5)*w*.72,t=u.position.z+(Math.random()-.5)*w*.72;$(e,t,.8+Math.random()*.25)}function oe(e){const t=W.uFadeTime.value*4;for(let i=r.length-1;i>=0;i-=1)r[i].age+=e,r[i].age>t&&r.splice(i,1);const n=Math.min(r.length,p);for(let i=0;i<n;i+=1){const l=i*4;v[l]=r[i].x,v[l+1]=r[i].z,v[l+2]=r[i].age,v[l+3]=r[i].distDelta}W.uTrailCount.value=n,x.needsUpdate=!0}function Z(){const e=o.getBoundingClientRect(),t=Math.max(1,e.width),n=Math.max(1,e.height),i=Math.min(window.devicePixelRatio||1,X?1:1.25);s.setSize(t,n,!1),s.setPixelRatio(i),c.aspect=t/n,c.updateProjectionMatrix()}function K(){const e=a<760?21:19,t=I*Math.PI*.025+(a<760?.08:.02),n=D*Math.PI*.045+(a<760?0:-.13);c.position.set(-e*Math.cos(t)*Math.sin(n)+(a<760?0:2.4),e*Math.cos(t)*Math.cos(n),e*Math.sin(t)+(a<760?5.2:2.6)),c.lookAt(a<760?0:3.2,0,a<760?0:-.8)}function Q(e){const t=o.getBoundingClientRect();if(!t.width||!t.height)return;O=(e.clientX-t.left)/t.width*2-1,B=-((e.clientY-t.top)/t.height)*2+1,J.set(O,B),k.setFromCamera(J,c);const n=k.intersectObject(h);n.length&&($(n[0].point.x,n[0].point.z),P=0,y=0)}function L(e){if(m=0,!S||document.hidden)return;const t=Math.min((e-R)/1e3,.05);R=e,D+=(O-D)*.045,I+=(B-I)*.045,P+=t,y+=t,P>1.2&&y>1.05&&(N(),y=0),K(),oe(t),s.render(d,c),m=window.requestAnimationFrame(L)}Z(),K();for(let e=0;e<7;e+=1)N();function z(){window.cancelAnimationFrame(m),m=0,S&&!document.hidden&&(R=performance.now(),m=window.requestAnimationFrame(L))}const ee=new IntersectionObserver(([e])=>{S=e.isIntersecting,z()});ee.observe(o),document.addEventListener("visibilitychange",z);const te=new ResizeObserver(Z);return te.observe(o),window.addEventListener("pointermove",Q,{passive:!0}),m=window.requestAnimationFrame(L),{destroy(){window.cancelAnimationFrame(m),window.removeEventListener("pointermove",Q),te.disconnect(),ee.disconnect(),document.removeEventListener("visibilitychange",z),d.remove(u,h),C.dispose(),A.dispose(),h.geometry.dispose(),h.material.dispose(),x.dispose(),s.dispose()}}}function Re(){const o=E.useRef(null),[G,d]=E.useState(!1);return E.useEffect(()=>{if(!o.current)return;let s,c;try{s=He(o.current),c=window.requestAnimationFrame(()=>d(!0))}catch{o.current.dataset.waveGridError="true";return}return()=>{window.cancelAnimationFrame(c),s?.destroy()}},[]),re("canvas",{ref:o,className:`hero-stage__wave-grid-canvas${G?" is-ready":""}`})}export{Re as default};
