const vertexSource = `#version 300 es
precision highp float;

void main() {
  vec2 position = vec2(
    float((gl_VertexID << 1) & 2),
    float(gl_VertexID & 2)
  );
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragmentSource = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uCenter;
uniform float uTime;
uniform float uDark;
uniform float uQuality;

const float LENS_RANGE_MULTIPLIER = 3.0;

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float hash21(vec2 value) {
  value = fract(value * vec2(123.34, 456.21));
  value += dot(value, value + 45.32);
  return fract(value.x * value.y);
}

float noise2(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * local * (
    local * (local * 6.0 - 15.0) + 10.0
  );

  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0));

  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise2(point);
    point = rotate2d(0.61) * point * 2.03 + vec2(11.7, 7.3);
    amplitude *= 0.5;
  }

  return value;
}

vec3 universe(
  vec2 uv,
  float seed,
  float dark,
  float quality,
  vec3 nebulaTint
) {
  vec2 rotated = rotate2d(0.24 + seed * 0.07) * uv;
  float broadNoise = fbm(
    rotated * 0.58 + vec2(seed * 0.41, -seed * 0.29)
  );
  float nebulaNoise = broadNoise * 0.92;

  if (quality > 0.5) {
    float fineNoise = fbm(
      rotate2d(-0.47) * rotated * 1.34
      + vec2(-seed * 0.23, seed * 0.37)
    );
    nebulaNoise = broadNoise * 0.72 + fineNoise * 0.42;
  }

  float nebulaShape = fbm(
    rotate2d(0.91) * rotated * 0.31
    + vec2(seed * 0.17, seed * 0.43)
  );
  float nebula = smoothstep(
    0.43,
    0.86,
    nebulaNoise
  ) * smoothstep(0.31, 0.74, nebulaShape);

  vec3 lightBase = vec3(0.014, 0.026, 0.055);
  vec3 darkBase = vec3(0.0015, 0.003, 0.009);
  vec3 color = mix(lightBase, darkBase, dark);
  color += nebulaTint * nebula * mix(0.42, 0.64, dark);

  return color;
}

float smootherStep01(float value) {
  value = clamp(value, 0.0, 1.0);
  return value * value * value * (
    value * (value * 6.0 - 15.0) + 10.0
  );
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 screenPosition = (
    2.0 * gl_FragCoord.xy - resolution
  ) / resolution.y;
  vec2 basePosition = screenPosition - uCenter;
  vec2 pointerOffset = uPointer * vec2(0.055, 0.04);
  vec2 position = basePosition - pointerOffset;
  position = rotate2d(uPointer.x * 0.026) * position;
  position.x *= 1.0 + uPointer.y * 0.025;

  float radius = max(length(position), 0.0001);
  float angle = atan(position.y, position.x);
  float criticalRadius = mix(0.55, 0.58, uQuality);
  float lensRange = mix(0.81, 0.86, uQuality);
  float transitionRadius =
    criticalRadius + lensRange * LENS_RANGE_MULTIPLIER;
  float sheenTransitionRadius = 1.18;
  float transitionCoordinate = (
    radius - criticalRadius
  ) / (transitionRadius - criticalRadius);
  float lensFalloff = 1.0 - smootherStep01(transitionCoordinate);
  float criticalDistance = abs(radius - criticalRadius);
  float branch = step(criticalRadius, radius) * 2.0 - 1.0;
  float deflection = lensFalloff * 0.1 / (criticalDistance + 0.06);

  vec2 warpedPosition = rotate2d(
    branch * deflection * 0.34
  ) * position * (1.0 + deflection * 0.24);
  vec2 localCoordinates = basePosition + warpedPosition - position;

  vec3 localUniverse = universe(
    localCoordinates,
    2.7,
    uDark,
    uQuality,
    vec3(0.07, 0.18, 0.34)
  );

  float edgeAntialias = max(fwidth(radius) * 2.2, 0.0014);
  float inside = 1.0 - smoothstep(
    criticalRadius - edgeAntialias * 2.0,
    criticalRadius + edgeAntialias * 2.0,
    radius
  );
  vec3 remoteUniverse = vec3(0.0);

  if (radius < criticalRadius + 0.08) {
    float normalizedRadius = clamp(
      radius / criticalRadius,
      0.0,
      1.0
    );
    float throatDepth = 1.0 - normalizedRadius;
    vec2 remoteCoordinates = rotate2d(
      -0.32 + 1.18 * throatDepth * throatDepth + uTime * 0.011
    ) * position / (0.15 + normalizedRadius * 0.78);
    remoteCoordinates += vec2(-uPointer.x * 0.1, uPointer.y * 0.07);

    remoteUniverse = universe(
      remoteCoordinates,
      19.4,
      uDark,
      uQuality,
      vec3(0.18, 0.11, 0.3)
    );

    if (uQuality > 0.5) {
      remoteUniverse += universe(
        remoteCoordinates * 0.72 + vec2(3.1, -1.7),
        31.8,
        uDark,
        0.0,
        vec3(0.03, 0.22, 0.24)
      ) * 0.34;
    }
  }

  vec3 color = mix(localUniverse, remoteUniverse, inside);

  float outerEcho = exp(-abs(radius - criticalRadius - 0.035) * 52.0);
  float innerEcho = exp(-abs(radius - criticalRadius + 0.028) * 58.0);
  color += localUniverse * outerEcho * 0.18;
  color += remoteUniverse * innerEcho * 0.14;

  float criticalWidth = 0.0045 + edgeAntialias * 1.35;
  float criticalLine = exp(
    -pow(criticalDistance / criticalWidth, 2.0)
  );
  color *= 1.0 - criticalLine * 0.965;

  float arcA = pow(0.5 + 0.5 * cos(angle - 0.65), 7.0);
  float arcB = pow(0.5 + 0.5 * cos(angle + 2.25), 10.0);
  float caustic = exp(-criticalDistance * 31.0) * (arcA + arcB * 0.55);
  color += vec3(0.16, 0.34, 0.52) * caustic * 0.34;

  float carrier = 1.0 - smootherStep01(
    (radius - criticalRadius * 1.1) /
    (sheenTransitionRadius - criticalRadius * 1.1)
  );
  float lensSheen = carrier * (1.0 - inside) * 0.018;
  color += vec3(0.18, 0.32, 0.48) * lensSheen;

  float vignette = smoothstep(0.42, 1.55, length(screenPosition));
  color *= 1.0 - vignette * 0.48;

  float grain = hash21(gl_FragCoord.xy) - 0.5;
  color += grain * 0.004 * mix(0.55, 1.0, uDark);

  color = max(color, vec3(0.0));
  color = 1.0 - exp(-color * 1.18);
  color = pow(color, vec3(0.4545));

  outColor = vec4(color, 1.0);
}
`;

let disposeCurrentWormhole = null;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("WebGL could not create a shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("WebGL could not create a program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown program error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function getThemeTarget() {
  const scheme = document.body.dataset.mdColorScheme;
  if (scheme === "slate") {
    return 1;
  }
  if (scheme === "default") {
    return 0;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? 1 : 0;
}

function createWormhole(hero) {
  const canvas = hero.querySelector("[data-wormhole-canvas]");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return () => {};
  }

  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    hero.classList.add("wp-hero--fallback");
    return () => {};
  }

  const program = createProgram(gl);
  const vertexArray = gl.createVertexArray();
  if (!vertexArray) {
    gl.deleteProgram(program);
    throw new Error("WebGL could not create a vertex array.");
  }

  const uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    center: gl.getUniformLocation(program, "uCenter"),
    time: gl.getUniformLocation(program, "uTime"),
    dark: gl.getUniformLocation(program, "uDark"),
    quality: gl.getUniformLocation(program, "uQuality"),
  };

  const abortController = new AbortController();
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointerQuery = matchMedia("(pointer: coarse)");
  const pointerTarget = { x: 0, y: 0 };
  const pointerCurrent = { x: 0, y: 0 };
  let animationFrame = 0;
  let lastFrameTime = 0;
  let startTime = performance.now();
  let isVisible = true;
  let isDisposed = false;
  let isContextLost = false;
  let isMobile = false;
  let currentTheme = getThemeTarget();
  let targetTheme = currentTheme;

  gl.useProgram(program);
  gl.bindVertexArray(vertexArray);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  function resize() {
    const bounds = hero.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(bounds.width));
    const cssHeight = Math.max(1, Math.round(bounds.height));
    isMobile = cssWidth < 720 || coarsePointerQuery.matches;

    const maximumDpr = isMobile ? 1 : 1.4;
    const maximumPixels = isMobile ? 700000 : 1400000;
    const deviceScale = Math.min(window.devicePixelRatio || 1, maximumDpr);
    const pixelLimitScale = Math.sqrt(maximumPixels / (cssWidth * cssHeight));
    const renderScale = Math.min(deviceScale, pixelLimitScale);
    const width = Math.max(1, Math.round(cssWidth * renderScale));
    const height = Math.max(1, Math.round(cssHeight * renderScale));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function draw(timestamp) {
    if (isDisposed || isContextLost) {
      return;
    }

    const reducedMotion = motionQuery.matches;
    const elapsed = reducedMotion
      ? 4.25
      : ((timestamp - startTime) / 1000) % 1000;
    const damping = reducedMotion ? 1 : 0.065;

    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * damping;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * damping;
    currentTheme += (targetTheme - currentTheme) * (reducedMotion ? 1 : 0.08);

    const aspect = canvas.width / Math.max(canvas.height, 1);
    const centerX = isMobile ? 0 : Math.min(0.7, Math.max(0.42, aspect * 0.35));
    const centerY = isMobile ? 0.28 : 0.02;

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(
      uniforms.pointer,
      pointerCurrent.x,
      pointerCurrent.y
    );
    gl.uniform2f(uniforms.center, centerX, centerY);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.dark, currentTheme);
    gl.uniform1f(uniforms.quality, isMobile ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function schedule() {
    if (
      animationFrame ||
      isDisposed ||
      isContextLost ||
      !isVisible ||
      document.hidden
    ) {
      return;
    }

    if (motionQuery.matches) {
      draw(performance.now());
      return;
    }

    animationFrame = requestAnimationFrame(frame);
  }

  function frame(timestamp) {
    animationFrame = 0;
    if (
      isDisposed ||
      isContextLost ||
      !isVisible ||
      document.hidden
    ) {
      return;
    }

    if (motionQuery.matches) {
      draw(timestamp);
      return;
    }

    const interval = isMobile ? 1000 / 30 : 1000 / 45;
    if (timestamp - lastFrameTime >= interval) {
      lastFrameTime = timestamp;
      draw(timestamp);
    }

    animationFrame = requestAnimationFrame(frame);
  }

  function updateTheme() {
    targetTheme = getThemeTarget();
    schedule();
  }

  function updatePointer(event) {
    if (motionQuery.matches || isMobile) {
      return;
    }

    const bounds = hero.getBoundingClientRect();
    pointerTarget.x = (
      (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5
    ) * 2;
    pointerTarget.y = (
      0.5 - (event.clientY - bounds.top) / Math.max(bounds.height, 1)
    ) * 2;
  }

  function resetPointer() {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    schedule();
  });
  resizeObserver.observe(hero);

  const intersectionObserver = new IntersectionObserver((entries) => {
    isVisible = entries.some((entry) => entry.isIntersecting);
    schedule();
  }, { threshold: 0.01 });
  intersectionObserver.observe(hero);

  const themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"],
  });

  hero.addEventListener("pointermove", updatePointer, {
    signal: abortController.signal,
    passive: true,
  });
  hero.addEventListener("pointerleave", resetPointer, {
    signal: abortController.signal,
    passive: true,
  });
  document.addEventListener("visibilitychange", schedule, {
    signal: abortController.signal,
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    isContextLost = true;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    hero.classList.remove("wp-hero--ready");
    hero.classList.add("wp-hero--fallback");
  }, {
    signal: abortController.signal,
  });

  const handleMotionChange = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    startTime = performance.now();
    resetPointer();
    schedule();
  };
  motionQuery.addEventListener("change", handleMotionChange);

  resize();
  draw(performance.now());
  hero.classList.add("wp-hero--ready");
  schedule();

  return () => {
    isDisposed = true;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    abortController.abort();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
    motionQuery.removeEventListener("change", handleMotionChange);
    gl.deleteVertexArray(vertexArray);
    gl.deleteProgram(program);
  };
}

function mountWormhole() {
  if (disposeCurrentWormhole) {
    disposeCurrentWormhole();
    disposeCurrentWormhole = null;
  }

  const hero = document.querySelector("[data-wormhole-hero]");
  if (!(hero instanceof HTMLElement)) {
    return;
  }

  try {
    disposeCurrentWormhole = createWormhole(hero);
  }
  catch (error) {
    hero.classList.add("wp-hero--fallback");
    console.warn("[Wormhole Portal] WebGL preview unavailable:", error);
  }
}

const zensicalDocument = typeof document$ !== "undefined"
  ? document$
  : null;

if (zensicalDocument?.subscribe) {
  zensicalDocument.subscribe(mountWormhole);
}
else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountWormhole, { once: true });
}
else {
  mountWormhole();
}

window.addEventListener("pagehide", (event) => {
  if (!event.persisted && disposeCurrentWormhole) {
    disposeCurrentWormhole();
    disposeCurrentWormhole = null;
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    mountWormhole();
  }
});
