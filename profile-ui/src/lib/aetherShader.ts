export const AETHER_VERTEX_SHADER = `#version 300 es
precision highp float;

void main() {
  vec2 pos = vec2(
    float((gl_VertexID & 1) << 2) - 1.0,
    float((gl_VertexID & 2) << 1) - 1.0
  );
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

export const AETHER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p = rot * p * 2.02 + vec2(17.1, 31.7);
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  vec2 mouseOffset = (uMouse - 0.5) * 0.42;
  float scrollShift = uScroll * 0.85;
  float t = uTime * 0.14;

  // Two-stage domain warp for silky volumetric caustic ribbons
  vec2 q = vec2(
    fbm(p * 1.45 + vec2(t * 0.8, -t * 0.5) + mouseOffset),
    fbm(p * 1.45 + vec2(-t * 0.6, t * 0.7) + vec2(3.4, 1.9) - scrollShift * 0.35)
  );

  vec2 r = vec2(
    fbm(p * 2.1 + 2.4 * q + vec2(1.7, 9.2) + t * 0.45),
    fbm(p * 2.1 + 2.4 * q + vec2(8.3, 2.8) - t * 0.38 + scrollShift * 0.4)
  );

  float field = fbm(p * 1.85 + 2.1 * r + mouseOffset * 0.6);

  // Caustic ribbon ridges
  float caustic = smoothstep(0.32, 0.84, field);
  float ribbon = pow(1.0 - abs(field * 2.0 - 1.0), 3.4);
  float shimmer = pow(max(0.0, 1.0 - abs(r.x - r.y) * 2.2), 4.0);

  // Pointer-steered atmospheric halo
  vec2 mousePos = (uMouse - 0.5) * aspect;
  float pointerHalo = exp(-dot(p - mousePos, p - mousePos) * 2.6);

  // Luxury palette: deep obsidian, electric sapphire, liquid cyan, warm amber
  vec3 obsidian = vec3(0.012, 0.016, 0.039);   // #03040A
  vec3 sapphire = vec3(0.118, 0.251, 1.000);   // #1E40FF
  vec3 cyan     = vec3(0.133, 0.827, 0.933);   // #22D3EE
  vec3 amber    = vec3(0.961, 0.620, 0.043);   // #F59E0B

  vec3 color = obsidian;
  color = mix(color, sapphire * 0.55, caustic * 0.72);
  color += sapphire * ribbon * 0.28;
  color += cyan * (ribbon * 0.34 + shimmer * 0.22 + pointerHalo * 0.10);
  color += amber * pow(shimmer, 2.2) * (0.14 + 0.10 * pointerHalo);

  // Subtle depth vignette to anchor HUD & spatial glass
  float vignette = smoothstep(1.35, 0.22, length(p));
  color *= 0.68 + 0.32 * vignette;

  // Interleaved dithering noise to eliminate 8-bit color banding
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  color += (dither - 0.5) / 255.0;

  fragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

export interface AetherUniforms {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  mouse: WebGLUniformLocation | null;
  scroll: WebGLUniformLocation | null;
}

export interface AetherProgramHandle {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject | null;
  uniforms: AetherUniforms;
  dispose: () => void;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createAetherProgram(
  gl: WebGL2RenderingContext,
): AetherProgramHandle | null {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    AETHER_VERTEX_SHADER,
  );
  if (!vertexShader) return null;

  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    AETHER_FRAGMENT_SHADER,
  );
  if (!fragmentShader) {
    gl.deleteShader(vertexShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const vao = gl.createVertexArray();
  const uniforms: AetherUniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    mouse: gl.getUniformLocation(program, "uMouse"),
    scroll: gl.getUniformLocation(program, "uScroll"),
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (gl.isContextLost()) return;
    if (vao) gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  };

  return { program, vao, uniforms, dispose };
}
