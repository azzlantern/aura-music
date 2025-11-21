import React, { useRef, useEffect } from "react";

interface FluidBackgroundProps {
  colors?: string[];
  isPlaying?: boolean;
  targetFps?: number;
}

const FluidBackground: React.FC<FluidBackgroundProps> = ({
  colors,
  isPlaying = true,
  targetFps = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // 用于暂停/恢复的时间追踪
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);
  const colorsRef = useRef(colors);

  // 同步 ref 以避免 effect 重新触发
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    // 如果从暂停切换到播放，重置 lastFrameTime 以防止时间跳跃
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
    }
  }, [isPlaying]);

  // 同步颜色 ref
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  // 默认颜色方案
  const defaultColors = [
    "rgb(60, 20, 80)",
    "rgb(100, 40, 60)",
    "rgb(20, 20, 40)",
    "rgb(40, 40, 90)",
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 获取 WebGL 上下文
    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // --------------------------------------------------------
    // 1. 着色器源码 (Shader Sources)
    // --------------------------------------------------------

    // See https://www.shadertoy.com/view/wdyczG
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;

      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform vec3 uColor4;

      #define S(a,b,t) smoothstep(a,b,t)

      mat2 Rot(float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
      }

      // Created by inigo quilez - iq/2014
      // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
      vec2 hash(vec2 p) {
          p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
          return fract(sin(p) * 43758.5453);
      }

      float noise(in vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          vec2 u = f * f * (3.0 - 2.0 * f);

          float n = mix(
              mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                  dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
              mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                  dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
          return 0.5 + 0.5 * n;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          float ratio = uResolution.x / uResolution.y;

          vec2 tuv = uv;
          tuv -= 0.5;

          // rotate with Noise
          float degree = noise(vec2(uTime * 0.1, tuv.x * tuv.y));

          tuv.y *= 1.0 / ratio;
          tuv *= Rot(radians((degree - 0.5) * 720.0 + 180.0));
          tuv.y *= ratio;

          // Wave warp with sin
          float frequency = 5.0;
          float amplitude = 30.0;
          float speed = uTime * 2.0;
          tuv.x += sin(tuv.y * frequency + speed) / amplitude;
          tuv.y += sin(tuv.x * frequency * 1.5 + speed) / (amplitude * 0.5);

          // draw the image using dynamic colors
          vec3 layer1 = mix(uColor1, uColor2, S(-0.3, 0.2, (tuv * Rot(radians(-5.0))).x));
          vec3 layer2 = mix(uColor3, uColor4, S(-0.3, 0.2, (tuv * Rot(radians(-5.0))).x));

          vec3 finalComp = mix(layer1, layer2, S(0.5, -0.3, tuv.y));

          vec3 col = finalComp;

          gl_FragColor = vec4(col, 1.0);
      }
    `;

    // --------------------------------------------------------
    // 2. 编译着色器 (Compile Shaders)
    // --------------------------------------------------------

    const createShader = (
      gl: WebGLRenderingContext,
      type: number,
      source: string,
    ) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // --------------------------------------------------------
    // 3. 设置几何体 (Setup Geometry)
    // --------------------------------------------------------

    // 创建覆盖全屏的两个三角形（一个矩形）
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // --------------------------------------------------------
    // 4. 颜色解析工具函数 (Color Parsing)
    // --------------------------------------------------------

    const parseColor = (colorStr: string): [number, number, number] => {
      // 解析 rgb(r, g, b) 格式
      const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        return [
          parseInt(rgbMatch[1]) / 255,
          parseInt(rgbMatch[2]) / 255,
          parseInt(rgbMatch[3]) / 255,
        ];
      }
      // 默认返回黑色
      return [0, 0, 0];
    };

    // --------------------------------------------------------
    // 5. 渲染循环 (Render Loop)
    // --------------------------------------------------------

    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "uResolution",
    );
    const timeUniformLocation = gl.getUniformLocation(program, "uTime");
    const color1UniformLocation = gl.getUniformLocation(program, "uColor1");
    const color2UniformLocation = gl.getUniformLocation(program, "uColor2");
    const color3UniformLocation = gl.getUniformLocation(program, "uColor3");
    const color4UniformLocation = gl.getUniformLocation(program, "uColor4");

    const render = (now: number) => {
      // 帧率限制逻辑
      const frameInterval = 1000 / targetFps;
      const elapsed = now - lastRenderTimeRef.current;

      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      lastRenderTimeRef.current = now - (elapsed % frameInterval);

      // 响应式画布大小调整
      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.useProgram(program);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      // 计算时间增量
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (isPlayingRef.current) {
        timeRef.current += dt;
      }

      // 获取当前颜色并解析
      const activeColors =
        colorsRef.current && colorsRef.current.length >= 4
          ? colorsRef.current
          : defaultColors;
      const color1 = parseColor(activeColors[0]);
      const color2 = parseColor(activeColors[1]);
      const color3 = parseColor(activeColors[2]);
      const color4 = parseColor(activeColors[3]);

      // 传入时间和颜色uniforms
      gl.uniform1f(timeUniformLocation, timeRef.current * 0.0005);
      gl.uniform3f(color1UniformLocation, color1[0], color1[1], color1[2]);
      gl.uniform3f(color2UniformLocation, color2[0], color2[1], color2[2]);
      gl.uniform3f(color3UniformLocation, color3[0], color3[1], color3[2]);
      gl.uniform3f(color4UniformLocation, color4[0], color4[1], color4[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };

    lastFrameTimeRef.current = performance.now();
    lastRenderTimeRef.current = performance.now(); // 初始化
    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      // 清理 WebGL 资源
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [targetFps]); // 仅当目标帧率改变时重新初始化 WebGL，颜色通过 ref 动态更新

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full bg-black block"
        style={{ touchAction: "none" }}
      />
      {/* 噪点遮罩 - 增加质感 */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
};

export default FluidBackground;
