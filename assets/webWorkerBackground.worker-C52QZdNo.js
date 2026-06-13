(function(){"use strict";const b=["rgb(60, 20, 80)","rgb(100, 40, 60)","rgb(20, 20, 40)","rgb(40, 40, 90)"],L=`
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,ae=`
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uOffset;
void main() {
  vec2 p = uTexelSize * uOffset;
  vec4 color = texture2D(uTexture, vUv + vec2(-p.x, -p.y));
  color += texture2D(uTexture, vUv + vec2( p.x, -p.y));
  color += texture2D(uTexture, vUv + vec2(-p.x,  p.y));
  color += texture2D(uTexture, vUv + vec2( p.x,  p.y));
  gl_FragColor = color * 0.25;
}
`,ie=`
precision highp float;
varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2 uTexASize;
uniform vec2 uTexBSize;
uniform float uMix;
uniform vec2 uResolution;
uniform float uTime;

const float swing_period = 20.0;
const float PI = 3.14159265;

// 2D simplex noise from the MIT-licensed Ashima Arts implementation.
// Author: Ian McEwan, Ashima Arts.
// Also mirrored in pyalot/craftscape/simplex.shader; kept with attribution
// because this background uses the same simplex gradient math for UV flow.
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec2 v, float noiseFactor) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) +
    i.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(
    0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    0.0
  );
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return noiseFactor * dot(m, g);
}

vec3 saturateColor(vec3 rgb, float adjustment) {
  const vec3 W = vec3(0.2125, 0.7154, 0.0721);
  vec3 intensity = vec3(dot(rgb, W));
  return mix(intensity, rgb, adjustment);
}

float blendOverlayChannel(float base, float overlay) {
  return (base < 0.5)
    ? (2.0 * base * overlay)
    : (1.0 - 2.0 * (1.0 - base) * (1.0 - overlay));
}

vec3 blendOverlay(vec3 base, vec3 overlay) {
  return vec3(
    blendOverlayChannel(base.r, overlay.r),
    blendOverlayChannel(base.g, overlay.g),
    blendOverlayChannel(base.b, overlay.b)
  );
}

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

mat2 rot(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec2 coverUv(vec2 uv, vec2 size) {
  float screen = uResolution.x / uResolution.y;
  float image = size.x / size.y;
  vec2 st = uv;
  if (image > screen) {
    st.x = (uv.x - 0.5) * screen / image + 0.5;
  } else {
    st.y = (uv.y - 0.5) * image / screen + 0.5;
  }
  return st;
}

float swingProgress(float time) {
  float progress = mod(time, swing_period);
  float mid = swing_period * 0.5;
  if (progress < mid) {
    return (progress * 2.0 - mid) / mid;
  }
  return (swing_period - mid * 0.5 - progress) * 2.0 / mid;
}

vec2 movingUv(vec2 uv, vec2 size, float angle, float zoom) {
  float ratio = uResolution.x / uResolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;
  p = rot(-angle) * p / zoom;
  p.x /= ratio;
  return coverUv(p + 0.5, size);
}

vec3 sampleCover(sampler2D tex, vec2 size, float angle, float zoom) {
  vec2 coord = movingUv(vUv, size, angle, zoom);
  float randV = rand(coord);
  vec2 st = coord + 4.0 / 480.0 * randV;
  st = clamp(st, 0.0, 1.0);

  float tmpTime = 0.6 * uTime;
  float dx = 0.065 * (
    sin(tmpTime) +
    cos(tmpTime * 0.8) +
    sin(tmpTime * 1.3) +
    cos(tmpTime * 1.5)
  );
  float dy = 0.065 * (
    cos(tmpTime * 1.4) +
    sin(tmpTime * 1.2) +
    cos(tmpTime * 0.8) +
    sin(tmpTime * 0.6)
  );
  float s = snoise(vec2(st.x + tmpTime * 0.1, st.y - tmpTime * 0.1), 530.0);
  st *= vec2(1.0 + 0.5 * s * dx, 1.0 + 0.5 * s * dy);

  return texture2D(tex, clamp(st, 0.0, 1.0)).rgb;
}

void main() {
  float tmpTime = uTime * 0.5;
  float maxAngle = (
    10.0 +
    sin(tmpTime * 1.1) +
    cos(tmpTime * 0.9) +
    sin(tmpTime * 1.25) +
    cos(tmpTime * 1.35)
  ) * 0.08;
  float angle = maxAngle * swingProgress(uTime);
  float ratio = uResolution.x / uResolution.y;
  float zoom = 1.28 + abs(sin(maxAngle)) * (0.2 + abs(ratio - 1.0) * 0.15);

  vec3 a = sampleCover(uTexA, uTexASize, angle, zoom);
  vec3 b = sampleCover(uTexB, uTexBSize, angle, zoom);
  vec3 color = mix(b, a, uMix);

  color = saturateColor(color, 1.2);
  vec3 overlayColor = blendOverlay(color, vec3(0.902, 0.902, 0.902));
  vec3 resColor = mix(color, overlayColor, 0.3);
  gl_FragColor = mix(vec4(resColor, 1.0), vec4(0.0, 0.0, 0.0, 1.0), 0.2);
}
`;let e=null,c=null,l=null,y=null,C=null,I=null,B=null,z=null,M=null,G=null,N=null,O=null,k=null,W=null,i=null,T=null,m=null,f=null,E=1,V=0;const le=.6;let d=0,D=0,R=0,F=!0,w=!1,P=[...b],g=null,_=0,U=0;const Y=1e3/60,s=512,H=[1,1.5,2,3,4,5,6,8,10,12],q=(r,t)=>{if(!e)return null;const n=e.createShader(r);return n?(e.shaderSource(n,t),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(console.error("Shader:",e.getShaderInfoLog(n)),e.deleteShader(n),null)):null},j=(r,t)=>{if(!e)return null;const n=q(e.VERTEX_SHADER,r),a=q(e.FRAGMENT_SHADER,t);if(!n||!a)return null;const o=e.createProgram();return o?(e.attachShader(o,n),e.attachShader(o,a),e.linkProgram(o),e.deleteShader(n),e.deleteShader(a),e.getProgramParameter(o,e.LINK_STATUS)?o:(console.error("Link:",e.getProgramInfoLog(o)),e.deleteProgram(o),null)):null},K=r=>{if(!e)return;const t=e.getAttribLocation(r,"position");e.bindBuffer(e.ARRAY_BUFFER,y),e.enableVertexAttribArray(t),e.vertexAttribPointer(t,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)},Q=(r,t)=>{if(!e)return null;const n=e.createTexture();if(!n)return null;e.bindTexture(e.TEXTURE_2D,n),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r,t,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const a=e.createFramebuffer();return a?(e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),{fb:a,tex:n}):(e.deleteTexture(n),null)},p=r=>{!e||!r||(e.deleteFramebuffer(r.fb),e.deleteTexture(r.tex))},Z=(r,t,n,a)=>{if(!e)return null;const o=e.createTexture();return o?(e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),{tex:o,w:t,h:n,cover:a}):null},J=()=>{if(!e)return null;const r=e.createTexture();return r?(e.bindTexture(e.TEXTURE_2D,r),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),{tex:r,w:1,h:1,cover:!1}):null},A=r=>{!e||!r||e.deleteTexture(r.tex)},$=r=>{e&&(A(T),T=i,i=r,E=0,V=d*.001)},ee=r=>{if(!e||!c||(p(m),p(f),m=Q(r.w,r.h),f=Q(r.w,r.h),!m||!f))return null;e.useProgram(c),e.uniform2f(I,1/r.w,1/r.h);let t=r.tex,n=m,a=f;for(let u=0;u<H.length;u++){e.bindFramebuffer(e.FRAMEBUFFER,n.fb),e.viewport(0,0,r.w,r.h),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,t),e.uniform1i(C,0),e.uniform1f(B,H[u]),K(c),t=n.tex;const v=n;n=a,a=v}const o=e.createTexture();if(!o)return null;e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r.w,r.h,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const x=t===m.tex?m:f;return e.bindFramebuffer(e.FRAMEBUFFER,x.fb),e.copyTexImage2D(e.TEXTURE_2D,0,e.RGBA,0,0,r.w,r.h,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),p(m),p(f),m=null,f=null,{tex:o,w:r.w,h:r.h,cover:r.cover}},te=r=>{const t=s,n=new OffscreenCanvas(t,t),a=n.getContext("2d");if(!a)return null;const o=r.length>0?r:b,x=a.createLinearGradient(0,0,t,t);o.forEach((S,h)=>{x.addColorStop(o.length===1?0:h/(o.length-1),S)}),a.fillStyle=x,a.fillRect(0,0,t,t),o.forEach((S,h)=>{const ne=(.2+.6*(h*37%100)/100)*t,oe=(.2+.6*(h*61%100)/100)*t,X=a.createRadialGradient(ne,oe,0,ne,oe,t*.65);X.addColorStop(0,S),X.addColorStop(1,"rgba(0,0,0,0)"),a.globalAlpha=.65,a.fillStyle=X,a.fillRect(0,0,t,t)}),a.globalAlpha=1;const u=Z(n,t,t,!1);if(!u)return null;const v=ee(u);return A(u),v},ue=r=>{const t=new OffscreenCanvas(s,s),n=t.getContext("2d");if(!n)return null;const a=Math.max(s/r.width,s/r.height),o=r.width*a,x=r.height*a;n.drawImage(r,(s-o)*.5,(s-x)*.5,o,x);const u=Z(t,s,s,!0);if(!u)return null;const v=ee(u);return A(u),v},se=()=>!e||(y=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,y),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW),c=j(L,ae),l=j(L,ie),!c||!l)?!1:(C=e.getUniformLocation(c,"uTexture"),I=e.getUniformLocation(c,"uTexelSize"),B=e.getUniformLocation(c,"uOffset"),z=e.getUniformLocation(l,"uTexA"),M=e.getUniformLocation(l,"uTexB"),G=e.getUniformLocation(l,"uTexASize"),N=e.getUniformLocation(l,"uTexBSize"),O=e.getUniformLocation(l,"uMix"),k=e.getUniformLocation(l,"uResolution"),W=e.getUniformLocation(l,"uTime"),i=J(),T=J(),!!(i&&T)),ce=r=>{const t=ue(r);t&&$(t)},Te=r=>{if(P=r,i!=null&&i.cover)return;const t=te(r);t&&$(t)},me=r=>{if(!e||!l||!i||!T||r-R<Y)return;R=r-(r-R)%Y;const t=r-D;D=r,F&&!w&&(d+=t);const n=d*.001;if(E<1){const a=n-V,o=Math.min(1,a/le);E=o*o*(3-2*o)}e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,e.canvas.width,e.canvas.height),e.useProgram(l),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,i.tex),e.uniform1i(z,0),e.uniform2f(G,i.w,i.h),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,T.tex),e.uniform1i(M,1),e.uniform2f(N,T.w,T.h),e.uniform1f(O,E),e.uniform2f(k,e.canvas.width,e.canvas.height),e.uniform1f(W,n),K(l)},re=r=>{me(r),g=self.requestAnimationFrame(re)};self.onmessage=r=>{const t=r.data;if(t.type==="init"&&t.canvas){if(e=t.canvas.getContext("webgl",{alpha:!1,antialias:!1,preserveDrawingBuffer:!1}),!e){console.error("WebGL not available");return}if(_=t.width??t.canvas.width,U=t.height??t.canvas.height,t.canvas.width=_,t.canvas.height=U,!se()){console.error("Pipeline init failed");return}P=t.colors??b;const n=te(P);n&&(A(i),i=n),E=1,D=performance.now(),R=performance.now(),d=0,F=!0,w=!1,g!==null&&self.cancelAnimationFrame(g),g=self.requestAnimationFrame(re);return}if(e){if(t.type==="resize"&&typeof t.width=="number"&&typeof t.height=="number"){_=t.width,U=t.height,e.canvas.width=_,e.canvas.height=U;return}if(t.type==="colors"&&t.colors){Te(t.colors);return}if(t.type==="play"&&typeof t.isPlaying=="boolean"){F=t.isPlaying;return}if(t.type==="pause"&&typeof t.paused=="boolean"){w=t.paused;return}t.type==="coverImage"&&t.imageData&&ce(t.imageData)}}})();
