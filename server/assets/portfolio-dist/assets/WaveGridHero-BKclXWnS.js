import{g as q,u as me}from"./preact-vendor-C31AVxSB.js";import{S as he,W as pe,a as ge,A as ve,P as we,b as xe,D as le,B as Me,I as ye,c as be,R as Ce,F as Pe,C as W,M as We,d as Te,O as Ae,e as Fe,f as He,g as Re,h as Se,V as De,i as Ie}from"./three-vendor-BJgQQUs9.js";const p=96;function Oe(o){return o.replace("#include <common>",`#include <common>
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
      }`)}function ze(o){if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return{destroy:()=>{}};const d=new he,s=new pe({alpha:!0,antialias:!1,canvas:o,powerPreference:"high-performance"});s.setClearColor(0,0),s.outputColorSpace=ge,s.toneMapping=ve,s.toneMappingExposure=1.45;const l=new we(38,1,.1,160);l.up.set(0,0,-1),d.add(l);const _=new xe(10484991,.9),j=new le(16777215,3.2);j.position.set(-12,14,8);const U=new le(9133302,1.6);U.position.set(9,8,-6),d.add(_,j,U);const n=o.clientWidth||1,Y=n<768||(navigator.deviceMemory||8)<4||(navigator.hardwareConcurrency||8)<4,f=Y?18:n<960?24:n<1440?30:34,w=n<640?.72:.76,ue=n<640?2.2:2.7,V=.035,x=f*(w+V),k=f*f,T=new Me(w,ue,w),A=new ye(new Float32Array(k*2),2);T.setAttribute("aOffset",A);const g=new Float32Array(p*4),M=new be(g,p,1,Ce,Pe);M.needsUpdate=!0;const F={uTrailTexture:{value:M},uTrailCount:{value:0},uFadeTime:{value:2.6},uWaveSpeed:{value:6.2},uWaveFreq:{value:1.35},uWaveWidth:{value:3.2},uAmplitude:{value:.82},uJitter:{value:.16},uMaxHeight:{value:1.05},uColorBase:{value:new W("#0f766e")},uColorHigh:{value:new W("#a5f3fc")}},H=new We({color:16777215,emissive:new W("#0f766e"),emissiveIntensity:.22,shininess:90,specular:new W("#7dd3fc")});H.onBeforeCompile=e=>{Object.assign(e.uniforms,F),e.vertexShader=Oe(e.vertexShader),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
        varying float vHeight;
        uniform vec3 uColorBase;
        uniform vec3 uColorHigh;
        uniform float uMaxHeight;`).replace("#include <color_fragment>",`#include <color_fragment>
        float waveMix = clamp((vHeight / uMaxHeight) * 0.82, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, waveMix);`)};const u=new Te(T,H,k),R=new Ae,S=w+V,J=(f-1)*S/2;for(let e=0;e<f;e+=1)for(let t=0;t<f;t+=1){const a=e*f+t,i=e*S-J,r=t*S-J;R.position.set(i,0,r),R.updateMatrix(),u.setMatrixAt(a,R.matrix),A.setXY(a,i,r)}u.instanceMatrix.needsUpdate=!0,A.needsUpdate=!0,u.position.set(n<760?0:4.2,-1.15,n<760?0:-.6),u.rotation.z=n<760?-.06:-.14,d.add(u);const c=[];let y=null,D=0,b=0,m=0,C=!0,I=performance.now(),O=0,z=0,B=0,L=0,$=0,N=0,P=!1,Z=0,K=0,Q=s.getPixelRatio();const ee=new Ie,te=new De,h=new Fe(new He(x*1.4,x*1.4),new Re({visible:!1,side:Se}));h.rotation.x=-Math.PI/2,h.position.copy(u.position),d.add(h);function ie(e,t,a=.9){let i=a;if(y){const r=e-y.x,v=t-y.z;if(i=Math.sqrt(r*r+v*v),i<.18)return}c.length>=p&&c.shift(),c.push({x:e,z:t,age:0,distDelta:Math.max(.2,Math.min(i,1.25))}),y={x:e,z:t}}function ne(){const e=u.position.x+(Math.random()-.5)*x*.72,t=u.position.z+(Math.random()-.5)*x*.72;ie(e,t,.8+Math.random()*.25)}function de(e){const t=F.uFadeTime.value*4;for(let i=c.length-1;i>=0;i-=1)c[i].age+=e,c[i].age>t&&c.splice(i,1);const a=Math.min(c.length,p);for(let i=0;i<a;i+=1){const r=i*4;g[r]=c[i].x,g[r+1]=c[i].z,g[r+2]=c[i].age,g[r+3]=c[i].distDelta}F.uTrailCount.value=a,M.needsUpdate=!0}function ae(){const e=o.getBoundingClientRect(),t=Math.max(1,e.width),a=Math.max(1,e.height),i=Math.min(devicePixelRatio||1,Y?1:1.25),r=t!==Z||a!==K,v=i!==Q;!r&&!v||(v&&(s.setPixelRatio(i),Q=i),r&&(s.setSize(t,a,!1),Z=t,K=a,l.aspect=t/a,l.updateProjectionMatrix()))}function oe(){const e=n<760?21:19,t=z*Math.PI*.025+(n<760?.08:.02),a=O*Math.PI*.045+(n<760?0:-.13);l.position.set(-e*Math.cos(t)*Math.sin(a)+(n<760?0:2.4),e*Math.cos(t)*Math.cos(a),e*Math.sin(t)+(n<760?5.2:2.6)),l.lookAt(n<760?0:3.2,0,n<760?0:-.8)}function re(e){!C||document.hidden||($=e.clientX,N=e.clientY,P=!0)}function fe(){if(!P)return;P=!1;const e=o.getBoundingClientRect();if(!e.width||!e.height)return;B=($-e.left)/e.width*2-1,L=-((N-e.top)/e.height)*2+1,te.set(B,L),ee.setFromCamera(te,l);const t=ee.intersectObject(h);t.length&&(ie(t[0].point.x,t[0].point.z),D=0,b=0)}function E(e){if(m=0,!C||document.hidden)return;const t=Math.min((e-I)/1e3,.05);I=e,fe(),O+=(B-O)*.045,z+=(L-z)*.045,D+=t,b+=t,D>1.2&&b>1.05&&(ne(),b=0),oe(),de(t),s.render(d,l),m=requestAnimationFrame(E)}ae(),oe();for(let e=0;e<7;e+=1)ne();function G(){cancelAnimationFrame(m),m=0,P=!1,C&&!document.hidden&&(I=performance.now(),m=requestAnimationFrame(E))}const se=new IntersectionObserver(([e])=>{C=e.isIntersecting,G()});se.observe(o),document.addEventListener("visibilitychange",G);const ce=new ResizeObserver(ae);return ce.observe(o),addEventListener("pointermove",re,{passive:!0}),m=requestAnimationFrame(E),{destroy(){cancelAnimationFrame(m),removeEventListener("pointermove",re),ce.disconnect(),se.disconnect(),document.removeEventListener("visibilitychange",G),d.remove(u,h),T.dispose(),H.dispose(),h.geometry.dispose(),h.material.dispose(),M.dispose(),s.dispose()}}}function Ee(){const o=q.useRef(null),[X,d]=q.useState(!1);return q.useEffect(()=>{if(!o.current)return;let s,l;try{s=ze(o.current),l=requestAnimationFrame(()=>d(!0))}catch{o.current.dataset.waveGridError="true";return}return()=>{cancelAnimationFrame(l),s?.destroy()}},[]),me("canvas",{ref:o,className:`hero-stage__wave-grid-canvas${X?" is-ready":""}`})}export{ze as createWaveGridExperience,Ee as default};
