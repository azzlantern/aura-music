var Re=Object.defineProperty;var Ae=(A,v,S)=>v in A?Re(A,v,{enumerable:!0,configurable:!0,writable:!0,value:S}):A[v]=S;var n=(A,v,S)=>Ae(A,typeof v!="symbol"?v+"":v,S);(function(){"use strict";const se=[[[.22,.29],[.62,.2],[.39,.76],[.78,.63]],[[.36,.2],[.76,.39],[.23,.62],[.61,.79]],[[.23,.38],[.6,.25],[.39,.73],[.77,.59]],[[.39,.28],[.75,.25],[.23,.7],[.61,.76]]],ae=[[[-.35,.3,1.2,.55],[.3,-.4,.7,1.15],[.4,-.3,.65,1.1],[-.3,.35,1.25,.6]],[[.3,-.35,.7,1.2],[-.4,.25,1.15,.6],[-.25,.4,1.2,.65],[.35,-.3,.6,1.2]],[[-.3,.4,1.25,.65],[.35,-.25,.65,1.2],[.25,-.35,.75,1.15],[-.4,.3,1.15,.65]],[[.35,-.3,.65,1.2],[-.25,.35,1.2,.7],[-.35,.25,1.15,.6],[.3,-.4,.7,1.25]]],ne=(i=97)=>{const e=new Uint16Array((i-1)*(i-1)*6);let r=0;for(let o=i-1;o>0;o-=8)for(let s=0;s<i-1;s+=8)for(let a=s;a<Math.min(s+8,i-1);a++)for(let c=o-1;c>=Math.max(0,o-8);c--){const l=a*i+c;e.set([l,l+1,l+i,l+1,l+i+1,l+i],r),r+=6}return e},G=i=>{const e=i.length?i:[[.3,.16,.43],[.67,.31,.4],[.13,.25,.4],[.24,.15,.35]],r=new Float32Array(48);for(let o=0;o<4;o++){const s=o/3;for(let a=0;a<4;a++){const c=a/3;for(let l=0;l<3;l++){const O=e[0][l]*(1-c)+e[1%e.length][l]*c,be=e[2%e.length][l]*(1-c)+e[3%e.length][l]*c;r[(o*4+a)*3+l]=O*(1-s)+be*s}}}return r},ce=`vec4 basis(float t) {
  return vec4(2.0 * t * t * t - 3.0 * t * t + 1.0,
    -2.0 * t * t * t + 3.0 * t * t,
    t * t * t - 2.0 * t * t + t,
    t * t * t - t * t);
}
vec2 surfaceAt(vec2 point) {
  float gx = clamp(point.x * 3.0, 0.0, 3.0);
  float gy = clamp(point.y * 3.0, 0.0, 3.0);
  int cx = min(2, int(floor(gx)));
  int cy = min(2, int(floor(gy)));
  vec4 bx = basis(gx - float(cx));
  vec4 by = basis(gy - float(cy));
  // Tensor-product Hermite interpolation: evaluate each row along x, then
  // combine along y. This shares the y weights across four x terms.
  int top = cy * 4 + cx;
  mat4x2 tl = control(top), tr = control(top + 1);
  mat4x2 bl = control(top + 4), br = control(top + 5);
  vec2 a = tl[0] * bx.x + tr[0] * bx.y + tl[1] * bx.z + tr[1] * bx.w;
  vec2 b = bl[0] * bx.x + br[0] * bx.y + bl[1] * bx.z + br[1] * bx.w;
  vec2 c = tl[2] * bx.x + tr[2] * bx.y + tl[3] * bx.z + tr[3] * bx.w;
  vec2 d = bl[2] * bx.x + br[2] * bx.y + bl[3] * bx.z + br[3] * bx.w;
  return a * by.x + b * by.y + c * by.z + d * by.w;
}

vec2 mapPoint(vec2 point) {
  float d = (point.y - foldB.x) / foldB.y;
  float w = max(0.0, 1.0 - d * d);
  float amount = foldA.z * 0.78 * w * w;
  // A quiet region needs only the smooth surface, with no fold or tanh work.
  if (amount <= 0.0) {
    vec2 curved = surfaceAt(point);
    return vec2(curved.x * 2.0 - 1.0, 1.0 - curved.y * 2.0);
  }
  float center = foldA.x + foldA.y * (point.y - foldB.x) + foldB.z * d * d;
  float left = amount * tanh(center / foldA.w);
  float right = 1.0 - amount * tanh((1.0 - center) / foldA.w);
  float x = clamp((point.x - amount * tanh((point.x - center) / foldA.w) - left) / (right - left), 0.0, 1.0);
  float weight = min(1.0, amount / foldA.w);
  float blendAmount = weight * weight * (3.0 - 2.0 * weight) * 0.62;
  vec2 curved = surfaceAt(vec2(x, point.y));
  curved = vec2(curved.x * 2.0 - 1.0, 1.0 - curved.y * 2.0);
  vec2 plane = vec2(x * 2.0 - 1.0, 1.0 - point.y * 2.0);
  return curved * (1.0 - blendAmount) + plane * blendAmount;
}
`,Y=(i,e)=>i.flatMap(r=>r.map(o=>`vec${e}(${o.map(s=>s.toFixed(8)).join(",")})`)).join(`,
`),le=`#version 300 es
precision highp float;
precision highp int;
uniform float time;
uniform float audio;
uniform uint seed;
uniform uint episode;
uniform vec2 aspect;
out vec4 first;
out vec4 second;
const vec2 layouts[16] = vec2[16](${Y(se,2)});
const vec4 tangents[16] = vec4[16](${Y(ae,4)});
int stage;
int next;
float fraction;
vec4 foldA;
vec3 foldB;
float ease(float v) {
  float t = clamp(v, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float random(uint n) {
  n = (n ^ 0x9e3779b9u) * 0x21f0aaadu;
  n = (n ^ (n >> 16u)) * 0x735a2d97u;
  return float(n ^ (n >> 15u)) / 4294967296.0;
}
vec2 point(int x, int y) {
  if (x == 0 || y == 0 || x == 3 || y == 3) return vec2(x, y) / 3.0;
  int i = (y - 1) * 2 + x - 1;
  return mix(layouts[stage * 4 + i], layouts[next * 4 + i], fraction);
}
mat2 turn(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat2(c, s, -s, c);
}
mat4x2 control(int i) {
  int x = i % 4, y = i / 4;
  int left = max(0, x - 1), right = min(3, x + 1);
  int top = max(0, y - 1), bottom = min(3, y + 1);
  vec2 du = (point(right, y) - point(left, y)) / float(right - left);
  vec2 dv = (point(x, bottom) - point(x, top)) / float(bottom - top);
  vec2 duv = (point(right, bottom) - point(left, bottom) - point(right, top) + point(left, top)) /
    float((right - left) * (bottom - top));
  if (x > 0 && x < 3 && y > 0 && y < 3) {
    int index = (y - 1) * 2 + x - 1;
    vec4 tangent = mix(tangents[stage * 4 + index], tangents[next * 4 + index], fraction);
    du = turn(tangent.x) * du * tangent.z;
    dv = turn(tangent.y) * dv * tangent.w;
  }
  return mat4x2(point(x, y), du, dv, duv);
}
void crease() {
  float cycle = floor(time / 24.0);
  float phase = time - cycle * 24.0;
  uint key = seed + uint(cycle) * 9u;
  float start = 2.0 + random(key) * 3.0;
  float hold = 4.0 + random(key + 1u) * 4.0;
  float envelope = ease((phase - start) / 2.4) * (1.0 - ease((phase - start - 2.4 - hold) / 3.2));
  float drift = random(key + 2u) * 6.28318530718;
  foldA = vec4(
    0.48 + random(key + 2u) * 0.04 + sin(time * 0.30 + drift) * 0.065 + sin(time * 0.17 + drift) * 0.025,
    (random(key + 3u) - 0.5) * 0.04,
    (0.14 + random(key + 4u) * 0.035) * envelope,
    0.065 + random(key + 5u) * 0.015);
  float cy = 0.47 + random(key + 6u) * 0.06 + sin(time * 0.22 + drift) * 0.07;
  foldB = vec3(0.5 + (cy - 0.5) / aspect.y,
    (0.31 + random(key + 7u) * 0.045) / aspect.y,
    0.055 + random(key + 8u) * 0.03);
}
void main() {
  float phase = mod(time / ${8 .toFixed(1)}, 4.0);
  stage = int(floor(phase));
  next = (stage + 1) % 4;
  fraction = ease(fract(phase));
  int i = gl_VertexID;
  if (i < 16) {
    mat4x2 data = control(i);
    first = vec4(data[0], data[1]);
    second = vec4(data[2], data[3]);
  } else if (i == 17) {
    float angle = 0.55 + time * 0.14;
    first = vec4(cos(angle), sin(angle), sin(time * 0.071) * 0.07, cos(time * 0.093) * 0.07);
    second = vec4(turn(-time * 0.11) * vec2(0.29, 0.16) * audio, 0.0, 0.0);
  } else if (i == 16) {
    crease();
    first = foldA;
    second = vec4(foldB, 0.0);
  } else {
    uint key = seed + episode * 23u;
    int a = min(3, int(random(key + 15u) * 4.0));
    int b = (a + 1 + min(2, int(random(key + 16u) * 3.0))) % 4;
    first = vec4(float(a & 1), float(a >> 1), float(b & 1), float(b >> 1));
    second = vec4(0.68, 0.62, aspect.yx);
  }
  gl_Position = vec4(0.0);
}`;class fe{constructor(e,r){n(this,"program");n(this,"buffer");n(this,"feedback");n(this,"vao");n(this,"clock");n(this,"audio");n(this,"aspect");n(this,"selection");n(this,"episode",-1);n(this,"time",NaN);n(this,"pulse",NaN);n(this,"ratio",NaN);this.gl=e,this.program=e.createProgram();try{for(const[o,s]of[[e.VERTEX_SHADER,le],[e.FRAGMENT_SHADER,`#version 300 es
precision highp float;
void main() {}`]]){const a=e.createShader(o);e.shaderSource(a,s),e.compileShader(a);const c=e.getShaderParameter(a,e.COMPILE_STATUS),l=c?null:e.getShaderInfoLog(a);if(c&&e.attachShader(this.program,a),e.deleteShader(a),!c)throw new Error(`Background state: ${l}`)}if(e.transformFeedbackVaryings(this.program,["first","second"],e.INTERLEAVED_ATTRIBS),e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(this.program)??"State link failed")}catch(o){throw e.deleteProgram(this.program),o}this.buffer=e.createBuffer(),this.feedback=e.createTransformFeedback(),this.vao=e.createVertexArray(),e.bindBuffer(e.TRANSFORM_FEEDBACK_BUFFER,this.buffer),e.bufferData(e.TRANSFORM_FEEDBACK_BUFFER,608,e.DYNAMIC_COPY),e.bindBuffer(e.TRANSFORM_FEEDBACK_BUFFER,null),e.useProgram(this.program),e.uniform1ui(e.getUniformLocation(this.program,"seed"),r),this.clock=e.getUniformLocation(this.program,"time"),this.audio=e.getUniformLocation(this.program,"audio"),this.aspect=e.getUniformLocation(this.program,"aspect"),this.selection=e.getUniformLocation(this.program,"episode")}draw(e,r,o,s){if(e===this.time&&r===this.pulse&&o===this.ratio&&s===this.episode)return;this.time=e,this.pulse=r,this.ratio=o,this.episode=s;const a=this.gl;a.bindBufferBase(a.UNIFORM_BUFFER,0,null),a.bindFramebuffer(a.FRAMEBUFFER,null),a.useProgram(this.program),a.bindVertexArray(this.vao),a.uniform1f(this.clock,e),a.uniform1f(this.audio,r),a.uniform1ui(this.selection,s),a.uniform2f(this.aspect,Math.max(1,1/o),Math.max(1,o)),a.bindTransformFeedback(a.TRANSFORM_FEEDBACK,this.feedback),a.bindBufferBase(a.TRANSFORM_FEEDBACK_BUFFER,0,this.buffer),a.enable(a.RASTERIZER_DISCARD),a.beginTransformFeedback(a.POINTS),a.drawArrays(a.POINTS,0,19),a.endTransformFeedback(),a.disable(a.RASTERIZER_DISCARD),a.bindBufferBase(a.TRANSFORM_FEEDBACK_BUFFER,0,null),a.bindTransformFeedback(a.TRANSFORM_FEEDBACK,null),a.bindBufferBase(a.UNIFORM_BUFFER,0,this.buffer)}dispose(){const e=this.gl;e.bindBufferBase(e.UNIFORM_BUFFER,0,null),e.deleteTransformFeedback(this.feedback),e.deleteBuffer(this.buffer),e.deleteVertexArray(this.vao),e.deleteProgram(this.program)}}const w=(i,e,r,o,s)=>i+(e-i)*(1-Math.exp(-r/(e>i?o:s)));class ue{constructor(){n(this,"time",0);n(this,"level",0);n(this,"bass",0);n(this,"onset",0);n(this,"climax",0);n(this,"pulse",0);n(this,"episode",0);n(this,"armed",!0)}get angle(){return .32+.3*Math.sin(this.time*.14)+.13*Math.sin(this.time*.087)}step(e,r,o){if(!r)return;this.time+=e*.4,this.level=w(this.level,o.level,e,.12,.55),this.bass=w(this.bass,o.bass,e,.09,.45),this.onset=w(this.onset,o.onset,e,.025,.24);const s=Math.min(1,o.bass*.8+o.onset*.2);this.armed&&s>.055&&(this.episode=this.episode+1>>>0,this.armed=!1),s<.025&&this.pulse<.035&&(this.armed=!0),this.pulse=w(this.pulse,s,e,.045,.32);const a=o.level>.72&&o.bass>.54;this.climax=w(this.climax,a?1:0,e,1.4,.9)}}const he=`#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,me=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D image;
uniform sampler2D previous;
uniform vec2 texel;
uniform int mode;
uniform float blend;
out vec4 color;
vec3 sampleAt(vec2 p) {
  // Mirrored extension avoids either dark rims or repeated edge streaks.
  return texture(image, 1.0 - abs(mod(p, 2.0) - 1.0)).rgb;
}
void main() {
  if (mode == 0) {
    vec4 pixel = texture(image, uv);
    float luma = dot(pixel.rgb, vec3(.30, .59, .11));
    float tone = luma * .72 + .14;
    vec3 delta = pixel.rgb - luma;
    float gain = 1.9;
    for (int i = 0; i < 3; i++) {
      if (delta[i] > 0.0) gain = min(gain, (1.0 - tone) / delta[i]);
      if (delta[i] < 0.0) gain = min(gain, -tone / delta[i]);
    }
    color = vec4((tone + delta * gain) * pixel.a, 1.0);
    return;
  }
  if (mode == 3) {
    color = vec4(mix(texture(previous, uv).rgb, texture(image, uv).rgb, blend), 1.0);
    return;
  }
  if (mode == 1) {
    vec3 sum = sampleAt(uv) * 4.0;
    sum += sampleAt(uv + texel) + sampleAt(uv - texel);
    sum += sampleAt(uv + vec2(texel.x, -texel.y)) + sampleAt(uv + vec2(-texel.x, texel.y));
    color = vec4(sum / 8.0, 1.0);
    return;
  }
  vec3 sum = sampleAt(uv + vec2(texel.x, 0.0)) + sampleAt(uv - vec2(texel.x, 0.0));
  sum += sampleAt(uv + vec2(0.0, texel.y)) + sampleAt(uv - vec2(0.0, texel.y));
  sum += 2.0 * (sampleAt(uv + texel * .5) + sampleAt(uv - texel * .5));
  sum += 2.0 * (sampleAt(uv + vec2(texel.x, -texel.y) * .5) + sampleAt(uv + vec2(-texel.x, texel.y) * .5));
  color = vec4(sum / 12.0, 1.0);
}`;class de{constructor(e){n(this,"program");n(this,"vao");n(this,"buffer");n(this,"source",null);n(this,"targets",new Map);n(this,"mode");n(this,"texel");n(this,"blend");n(this,"canvas",new OffscreenCanvas(128,128));this.gl=e,this.program=e.createProgram();for(const[r,o]of[[e.VERTEX_SHADER,he],[e.FRAGMENT_SHADER,me]]){const s=e.createShader(r);if(e.shaderSource(s,o),e.compileShader(s),!e.getShaderParameter(s,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(s);throw e.deleteShader(s),e.deleteProgram(this.program),new Error(`Artwork shader: ${a}`)}e.attachShader(this.program,s),e.deleteShader(s)}if(e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS)){const r=e.getProgramInfoLog(this.program);throw e.deleteProgram(this.program),new Error(`Artwork shader: ${r}`)}this.vao=e.createVertexArray(),this.buffer=e.createFramebuffer(),e.useProgram(this.program),e.uniform1i(e.getUniformLocation(this.program,"image"),0),e.uniform1i(e.getUniformLocation(this.program,"previous"),1),this.mode=e.getUniformLocation(this.program,"mode"),this.texel=e.getUniformLocation(this.program,"texel"),this.blend=e.getUniformLocation(this.program,"blend")}texture(e,r=!1){const o=this.gl,s=o.createTexture();return o.bindTexture(o.TEXTURE_2D,s),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,e,e,0,o.RGBA,o.UNSIGNED_BYTE,null),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,r?o.MIRRORED_REPEAT:o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,r?o.MIRRORED_REPEAT:o.CLAMP_TO_EDGE),s}draw(e,r,o,s,a){const c=this.gl;c.useProgram(this.program),c.bindVertexArray(this.vao),c.disable(c.DEPTH_TEST),c.bindFramebuffer(c.FRAMEBUFFER,this.buffer),c.framebufferTexture2D(c.FRAMEBUFFER,c.COLOR_ATTACHMENT0,c.TEXTURE_2D,r,0),c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,e),c.uniform1i(this.mode,a),c.uniform2f(this.texel,1.3/o,1.3/o),c.viewport(0,0,s,s),c.drawArrays(c.TRIANGLES,0,3)}prepare(e){const r=this.gl;if(r.activeTexture(r.TEXTURE0),!this.source){this.source=this.texture(128);for(const l of[128,64,32,16])this.targets.set(l,this.texture(l))}this.canvas.width=this.canvas.height=128;const o=this.canvas.getContext("2d");if(!o)throw new Error("Artwork canvas unavailable");o.clearRect(0,0,128,128),o.drawImage(e,0,0,128,128),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,this.source),r.texSubImage2D(r.TEXTURE_2D,0,0,0,r.RGBA,r.UNSIGNED_BYTE,this.canvas);const s=this.texture(128,!0);let a=this.source,c=128;for(const l of[128,64,32,16,32,64]){const O=this.targets.get(l);this.draw(a,O,c,l,a===this.source?0:l<c?1:2),a=O,c=l}return this.draw(a,s,c,128,2),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,null,0),s}mix(e,r,o){const s=this.gl;s.activeTexture(s.TEXTURE0);const a=this.texture(128,!0);return s.useProgram(this.program),s.activeTexture(s.TEXTURE1),s.bindTexture(s.TEXTURE_2D,e),s.uniform1f(this.blend,o),this.draw(r,a,128,128,3),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,null,0),a}trim(){if(!this.source)return;const e=this.gl;e.deleteTexture(this.source),this.source=null;for(const r of this.targets.values())e.deleteTexture(r);this.targets.clear(),this.canvas.width=this.canvas.height=1}dispose(){const e=this.gl;this.trim(),e.deleteProgram(this.program),e.deleteVertexArray(this.vao),e.deleteFramebuffer(this.buffer)}}class pe{constructor(e,r,o){n(this,"id",null);n(this,"deadline",0);n(this,"tick",e=>{this.id=null,this.active()&&(e+.5>=this.deadline&&(this.draw(e),this.deadline===0&&(this.deadline=e),this.deadline+=1e3/60,this.deadline<e&&(this.deadline=e+1e3/60)),this.active()&&(this.id=this.clock.requestAnimationFrame(this.tick)))});this.clock=e,this.active=r,this.draw=o}get pending(){return this.id!==null}wake(){this.pending||!this.active()||(this.deadline=0,this.id=this.clock.requestAnimationFrame(this.tick))}stop(){this.id!==null&&this.clock.cancelAnimationFrame(this.id),this.id=null}}class ge{constructor(e){n(this,"scale",1);n(this,"fences",[]);n(this,"timer");n(this,"query",null);n(this,"measuring",!1);n(this,"count",0);n(this,"pressure",0);n(this,"headroom",0);n(this,"changed",0);this.gl=e,this.timer=e.getExtension("EXT_disjoint_timer_query_webgl2")}lower(e){e-this.changed<3e3||(this.scale=Math.max(.625,this.scale-.125),this.changed=e,this.pressure=this.headroom=0)}begin(e){const r=this.gl;for(;this.fences.length&&r.clientWaitSync(this.fences[0],0,0)!==r.TIMEOUT_EXPIRED;)r.deleteSync(this.fences.shift());if(this.query&&r.getQueryParameter(this.query,r.QUERY_RESULT_AVAILABLE)){if(!r.getParameter(this.timer.GPU_DISJOINT_EXT)){const o=r.getQueryParameter(this.query,r.QUERY_RESULT)/1e6;this.pressure=o>7?this.pressure+1:0,this.headroom=o<3?this.headroom+1:0,this.pressure>=4&&this.lower(e),this.headroom>=40&&e-this.changed>2e4&&(this.scale=Math.min(1,this.scale+.125),this.changed=e,this.headroom=0)}r.deleteQuery(this.query),this.query=null}return this.fences.length>=2?(++this.pressure>=12&&this.lower(e),!1):(this.timer&&!this.query&&this.count++%30===0&&(this.query=r.createQuery(),this.query&&(r.beginQuery(this.timer.TIME_ELAPSED_EXT,this.query),this.measuring=!0)),!0)}end(){const e=this.gl;this.measuring&&(e.endQuery(this.timer.TIME_ELAPSED_EXT),this.measuring=!1);const r=e.fenceSync(e.SYNC_GPU_COMMANDS_COMPLETE,0);r&&this.fences.push(r),e.flush()}dispose(){this.measuring&&this.gl.endQuery(this.timer.TIME_ELAPSED_EXT),this.measuring=!1,this.query&&this.gl.deleteQuery(this.query),this.query=null;for(const e of this.fences)this.gl.deleteSync(e);this.fences.length=0}}const E=self,xe=`#version 300 es

out vec2 texcoord;
out vec2 offset;
layout(std140) uniform Controls { vec4 state[38]; };
#define mapping state[34]
uniform float coverage;
out vec3 pigment;
uniform vec3 colors[16];
uniform vec2 aspect;
#define foldA state[32]
#define foldB state[33].xyz
mat4x2 control(int i) {
  return mat4x2(state[i * 2].xy, state[i * 2].zw, state[i * 2 + 1].xy, state[i * 2 + 1].zw);
}
${ce}
vec3 colorAt(vec2 point) {
  float gx = clamp(point.x * 3.0, 0.0, 3.0);
  float gy = clamp(point.y * 3.0, 0.0, 3.0);
  int cx = min(2, int(floor(gx)));
  int cy = min(2, int(floor(gy)));
  vec4 bx = basis(gx - float(cx));
  vec4 by = basis(gy - float(cy));
  vec3 result = vec3(0.0);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    result += colors[(cy + j) * 4 + cx + i] * bx[i] * by[j];
  }
  return result;
}
float region(vec2 screen, vec2 center, float radius) {
  vec2 d = (screen - center) * state[37].zw / radius;
  float w = max(0.0, 1.0 - dot(d, d));
  // Compact C2 falloff: outside these two neighborhoods the beat is zero.
  return w * w * w;
}
void main() {
  vec2 uv = vec2(gl_VertexID % 97, gl_VertexID / 97) / 96.0;
  // Rotation and drift are shared by the complete frame, not recomputed for
  // every mesh vertex. The surface itself still runs entirely on the GPU.
  mat2 turn = mat2(mapping.x, -mapping.y, mapping.y, mapping.x);
  texcoord = turn * (uv - vec2(0.23, 0.27)) + 0.5 + mapping.zw;
  pigment = coverage < 1.0 ? colorAt(uv) : vec3(0.0);
  vec2 mapped = mapPoint(uv);
  gl_Position = vec4(mapped * 1.05 * aspect, 0.8 - uv.x * 1.6, 1.0);
  vec2 screen = gl_Position.xy * 0.5 + 0.5;
  float weight = dot(state[35].xy, state[35].xy) > 0.00000001
    ? max(region(screen, state[36].xy, state[37].x), region(screen, state[36].zw, state[37].y) * 0.85)
    : 0.0;
  // Interpolate the smooth neighborhood mask with the existing mesh instead
  // of evaluating two distances and cubic falloffs for every fragment.
  offset = state[35].xy * weight;
}`,ve=`#version 300 es
precision highp float;
in vec2 texcoord;
in vec2 offset;
in vec3 pigment;
out vec4 outputColor;
uniform sampler2D artwork;
uniform sampler2D previous;
uniform float blend;
uniform float coverage;
uniform vec2 resolution;
vec3 cover(vec2 uv) {
  // MIRRORED_REPEAT provides the same edge extension in the sampler.
  vec3 color = texture(artwork, uv).rgb;
  // The previous cover is only sampled while changing tracks.
  if (blend < 1.0) color = mix(texture(previous, uv).rgb, color, blend);
  return color;
}
void main() {
  vec3 color = pigment;
  if (coverage > 0.0) {
    vec3 image;
    if (dot(offset, offset) > 0.00000001) {
      image = (cover(texcoord + offset) + cover(texcoord - offset)) * 0.5;
    } else {
      image = cover(texcoord);
    }
    color = mix(pigment, image, coverage);
  }
  // Apply exposure in the same draw. The browser's compositor handles the
  // final upscale, removing a full-screen pass and its intermediate target.
  vec2 uv = gl_FragCoord.xy / resolution;
  float shade = mix(0.58, 0.78, smoothstep(0.0, 1.0, uv.y));
  shade -= 0.045 * smoothstep(0.18, 0.70, length(uv - 0.5));
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  outputColor = vec4(color * shade + grain / 255.0, 1.0);
}`,Z=ne(),Ee=Math.floor(Math.random()*2147483647),U=new ue,F={level:0,bass:0,onset:0};let t=null,f=null,u=null,T=null,B=null,V=null,L=null,j=null,K=null,Q=null,W=null,J=null,h=null,p=null,m=1,_=0,g=!1,d=null,y=1,b=1,q=1,k=0,ee=0,M=!1,D=!1,I=!0,N=G([]),z=N.slice();const P=N.slice();let R=1,$="",X=[];const te=i=>{const r=new OffscreenCanvas(1,1).getContext("2d",{willReadFrequently:!0});return r?i.map(o=>(r.clearRect(0,0,1,1),r.fillStyle="#28222e",r.fillStyle=o,r.fillRect(0,0,1,1),Array.from(r.getImageData(0,0,1,1).data).slice(0,3).map(s=>s/255))):[]},re=(i,e=!1)=>{z=P.slice(),N=i,R=e?1:0,e&&P.set(i)},oe=(i,e)=>{const r=t.createShader(i);if(t.shaderSource(r,e),t.compileShader(r),!t.getShaderParameter(r,t.COMPILE_STATUS)){const o=t.getShaderInfoLog(r);throw t.deleteShader(r),new Error(`Mesh shader: ${o}`)}return r},Te=(i,e)=>{const r=t.createTexture();return t.bindTexture(t.TEXTURE_2D,r),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,e,e,0,t.RGBA,t.UNSIGNED_BYTE,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.MIRRORED_REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.MIRRORED_REPEAT),r},H=(i,e)=>{if(!t)return;y=Math.max(1,i),b=Math.max(1,e),q=(d==null?void 0:d.scale)??1;const r=Math.min(1,768*q/Math.max(y,b)),o=Math.max(1,Math.round(y*r)),s=Math.max(1,Math.round(b*r));t.canvas.width!==o&&(t.canvas.width=o),t.canvas.height!==s&&(t.canvas.height=s),I=!0,t.useProgram(f),t.uniform2f(K,Math.max(1,b/y),Math.max(1,y/b)),t.uniform2f(Q,o,s)},ie=i=>{if(!t||!f)return;const e=Math.max(0,Math.min(.05,(i-k)/1e3));k=i,D||(U.step(e,M,F),ee=U.time,R=Math.min(1,R+e/1.2),m=Math.min(1,m+e/1.2),_=Math.max(0,Math.min(1,_+(g?e:-e)/.8)));const r=R*R*(3-2*R);for(let o=0;o<P.length;o++)P[o]=z[o]+(N[o]-z[o])*r;T==null||T.draw(ee,U.pulse,y/b,U.episode),t.useProgram(f),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,t.canvas.width,t.canvas.height),t.enable(t.DEPTH_TEST),t.depthFunc(t.LESS),t.bindVertexArray(L),t.uniform3fv(j,P),t.uniform1f(W,m*m*(3-2*m)),t.uniform1f(J,_),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,h??B),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,p??h??B),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.drawElements(t.TRIANGLES,Z.length,t.UNSIGNED_SHORT,0),t.invalidateFramebuffer(t.FRAMEBUFFER,[t.DEPTH]),m>=1&&p&&(t.deleteTexture(p),p=null),!g&&_===0&&h&&(t.deleteTexture(h),h=null),m>=1&&_===Number(g)&&(u==null||u.trim()),I=!1;for(const o of X)E.postMessage({type:"frame",id:o});X=[]},C=new pe(E,()=>!!t&&(!D&&(M||R<1||m<1||_!==Number(g)||I)||X.length>0),i=>{d!=null&&d.begin(i)&&(q!==d.scale&&H(y,b),ie(i),d.end())}),x=()=>{C.pending||(k=performance.now()),C.wake()},ye=async i=>{if(!t)return E.postMessage({type:"snapshot",id:i,bitmap:null});try{ie(performance.now());const e=await createImageBitmap(t.canvas);E.postMessage({type:"snapshot",id:i,bitmap:e},[e])}catch(e){console.warn("Background snapshot failed",e),E.postMessage({type:"snapshot",id:i,bitmap:null})}};E.onmessage=({data:i})=>{var e;if(i.type==="dispose"){C.stop(),d==null||d.dispose(),t==null||t.deleteVertexArray(L),t==null||t.deleteBuffer(V),t==null||t.deleteProgram(f),u==null||u.dispose(),T==null||T.dispose(),t==null||t.deleteTexture(B),t==null||t.deleteTexture(h),t==null||t.deleteTexture(p),(e=t==null?void 0:t.getExtension("WEBGL_lose_context"))==null||e.loseContext(),E.postMessage({type:"disposed"}),E.close();return}if(i.type==="init"){if(t=i.canvas.getContext("webgl2",{alpha:!1,antialias:!1,depth:!0,stencil:!1,powerPreference:"low-power"}),!t)throw new Error("WebGL2 unavailable for mesh background");const r=oe(t.VERTEX_SHADER,xe),o=oe(t.FRAGMENT_SHADER,ve);if(f=t.createProgram(),t.attachShader(f,r),t.attachShader(f,o),t.linkProgram(f),t.deleteShader(r),t.deleteShader(o),!t.getProgramParameter(f,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(f)??"Mesh link failed");t.useProgram(f),L=t.createVertexArray(),t.bindVertexArray(L),B=Te(new Uint8ClampedArray([0,0,0,255]),1),t.uniformBlockBinding(f,t.getUniformBlockIndex(f,"Controls"),0),t.uniform1i(t.getUniformLocation(f,"artwork"),0),t.uniform1i(t.getUniformLocation(f,"previous"),1),j=t.getUniformLocation(f,"colors[0]"),K=t.getUniformLocation(f,"aspect"),Q=t.getUniformLocation(f,"resolution"),W=t.getUniformLocation(f,"blend"),J=t.getUniformLocation(f,"coverage"),V=t.createBuffer(),t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,V),t.bufferData(t.ELEMENT_ARRAY_BUFFER,Z,t.STATIC_DRAW),t.bindVertexArray(null),t.clearColor(.008,.008,.01,1),u=new de(t),T=new fe(t,Ee),d=new ge(t),H(i.width,i.height),$=i.colors.join("|"),re(G(te(i.colors)),!0),k=performance.now(),x();return}if(i.type==="clearCover"){g=!1,x();return}if(i.type==="resize"){H(i.width,i.height),x();return}if(i.type==="play"){M=i.isPlaying,M||u==null||u.trim(),x();return}if(i.type==="beat"){i.enabled||(F.level=F.bass=F.onset=0,U.pulse=0,I=!0,x());return}if(i.type==="pause"){D=i.paused,D?(C.stop(),u==null||u.trim()):x();return}if(i.type==="audio"){for(const r of["level","bass","onset"])F[r]=Number.isFinite(i[r])?Math.max(0,Math.min(1,i[r])):0;return}if(i.type==="snapshot")return ye(i.id);if(i.type==="watchFrame"){X.push(i.id),x();return}if(i.type==="colors"){const r=i.colors.join("|");r!==$&&($=r,re(G(te(i.colors))),x());return}if(i.type==="coverImage")try{if(t&&u){const r=u.prepare(i.imageData);if(g&&m<1&&p&&h){const o=m*m*(3-2*m),s=u.mix(p,h,o);t.deleteTexture(h),h=s}t.deleteTexture(p),p=g?h:null,g||t.deleteTexture(h),h=r,m=p?0:1,g=!0,I=!0,x()}}finally{i.imageData.close(),(!M||D)&&(u==null||u.trim())}}})();
