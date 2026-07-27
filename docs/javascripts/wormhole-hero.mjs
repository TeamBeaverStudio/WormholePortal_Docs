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
uniform sampler2D uSky;

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

vec2 skyCoordinates(vec2 position) {
  float viewportAspect = uResolution.x / max(uResolution.y, 1.0);
  const float imageAspect = 1.77777777778;
  vec2 normalized = vec2(
    position.x / (2.0 * viewportAspect),
    position.y * 0.5
  );

  if (viewportAspect > imageAspect) {
    normalized.y *= imageAspect / viewportAspect;
  }
  else {
    normalized.x *= viewportAspect / imageAspect;
  }

  return clamp(normalized + 0.5, 0.001, 0.999);
}

vec3 sampleSky(vec2 position) {
  vec3 encoded = texture(uSky, skyCoordinates(position)).rgb;
  vec3 linearColor = pow(encoded, vec3(2.2));
  return linearColor * mix(0.72, 0.92, uDark);
}

float softRing(
  float radius,
  float center,
  float halfWidth,
  float feather
) {
  return 1.0 - smoothstep(
    halfWidth - feather,
    halfWidth + feather,
    abs(radius - center)
  );
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
  float edgeAntialias = max(fwidth(radius) * 2.2, 0.0014);
  float inside = 1.0 - smoothstep(
    criticalRadius - edgeAntialias * 2.0,
    criticalRadius + edgeAntialias * 2.0,
    radius
  );
  float transitionCoordinate = (
    radius - criticalRadius
  ) / (transitionRadius - criticalRadius);
  float transitionProgress = clamp(
    transitionCoordinate,
    0.0,
    1.0
  );
  float farLens = (
    1.0 - smootherStep01(transitionProgress)
  ) * exp(-5.0 * transitionProgress);
  float criticalDistance = abs(radius - criticalRadius);
  vec2 radialDirection = position / radius;
  float foldedRadius = radius * (
    1.0
    + 0.018 * sin(angle * 2.0 + 0.42)
    + 0.009 * sin(angle - 0.68)
  );
  float shellFeather = max(edgeAntialias * 2.6, 0.005);
  float shellOuter = softRing(
    foldedRadius,
    criticalRadius * 0.9,
    criticalRadius * 0.11,
    shellFeather
  );
  float shellMiddle = softRing(
    foldedRadius,
    criticalRadius * 0.69,
    criticalRadius * 0.075,
    shellFeather
  );
  float shellInner = softRing(
    foldedRadius,
    criticalRadius * 0.5,
    criticalRadius * 0.055,
    shellFeather
  );
  float shellCore = softRing(
    foldedRadius,
    criticalRadius * 0.33,
    criticalRadius * 0.04,
    shellFeather
  );
  float foldShift = criticalRadius * (
    -0.18 * shellOuter
    + 0.13 * shellMiddle
    - 0.09 * shellInner
    + 0.06 * shellCore
  );
  float outerShift = (
    -criticalRadius * 0.018 * farLens * farLens
  );
  float radialShift = mix(outerShift, foldShift, inside);
  vec2 lensCoordinates = (
    basePosition + radialDirection * radialShift
  );

  vec3 galaxyUniverse = sampleSky(lensCoordinates);
  vec3 color = galaxyUniverse;

  float glassShade = inside * (
    shellOuter * 0.31
    + shellMiddle * 0.27
    + shellInner * 0.22
    + shellCore * 0.15
  );
  color *= 1.0 - glassShade;

  float warmReflection = 0.5 + 0.5 * cos(angle + 0.58);
  float glassReflection = inside * (
    shellOuter * 0.044
    + shellMiddle * 0.035
    + shellInner * 0.026
    + shellCore * 0.018
  );
  vec3 glassTint = mix(
    vec3(0.04, 0.055, 0.09),
    vec3(0.09, 0.063, 0.055),
    warmReflection
  );
  color += glassTint * glassReflection;

  float throatRadius = criticalRadius * 0.18;
  float throatMask = 1.0 - smoothstep(
    throatRadius - edgeAntialias * 1.35,
    throatRadius + edgeAntialias * 1.35,
    radius
  );
  vec3 throatUniverse = vec3(0.0);

  if (radius < throatRadius + 0.04) {
    float normalizedThroat = clamp(
      radius / throatRadius,
      0.0,
      1.0
    );
    vec2 remoteCoordinates = rotate2d(
      -0.26 + uTime * 0.006
    ) * position / max(throatRadius, 0.001) * 0.68;
    remoteCoordinates += vec2(
      -uPointer.x * 0.035,
      uPointer.y * 0.025
    );

    throatUniverse = sampleSky(remoteCoordinates);
    float throatDepth = 1.0 - normalizedThroat;
    throatUniverse = mix(
      throatUniverse * 0.72,
      vec3(0.008, 0.085, 0.098),
      0.28 + throatDepth * 0.2
    );
  }

  color = mix(color, throatUniverse, throatMask);
  float throatEdge = exp(-pow(
    (radius - throatRadius)
    / (0.004 + edgeAntialias * 1.8),
    2.0
  ));
  color *= 1.0 - throatEdge * 0.42;
  color += vec3(0.02, 0.11, 0.14) * throatEdge * 0.08;

  float criticalWidth = 0.0045 + edgeAntialias * 1.35;
  float criticalLine = exp(
    -pow(criticalDistance / criticalWidth, 2.0)
  );
  color *= 1.0 - criticalLine * 0.34;

  float arcA = pow(0.5 + 0.5 * cos(angle - 0.65), 7.0);
  float arcB = pow(0.5 + 0.5 * cos(angle + 2.25), 10.0);
  float caustic = exp(-criticalDistance * 31.0) * (arcA + arcB * 0.55);
  color += vec3(0.15, 0.22, 0.28) * caustic * 0.09;

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
  const skyTexture = gl.createTexture();
  if (!skyTexture) {
    gl.deleteVertexArray(vertexArray);
    gl.deleteProgram(program);
    throw new Error("WebGL could not create the sky texture.");
  }

  const uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    center: gl.getUniformLocation(program, "uCenter"),
    time: gl.getUniformLocation(program, "uTime"),
    dark: gl.getUniformLocation(program, "uDark"),
    quality: gl.getUniformLocation(program, "uQuality"),
    sky: gl.getUniformLocation(program, "uSky"),
  };

  const abortController = new AbortController();
  const skyImage = new Image();
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
  let isSkyReady = false;
  let isMobile = false;
  let currentTheme = getThemeTarget();
  let targetTheme = currentTheme;

  gl.useProgram(program);
  gl.bindVertexArray(vertexArray);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, skyTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([2, 4, 10, 255])
  );
  gl.uniform1i(uniforms.sky, 0);

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
    if (isDisposed || isContextLost || !isSkyReady) {
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
    const centerY = isMobile ? 0.58 : 0.02;

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);
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
      !isSkyReady ||
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
      !isSkyReady ||
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

  skyImage.decoding = "async";
  skyImage.addEventListener("load", () => {
    if (isDisposed || isContextLost) {
      return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      skyImage
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );

    const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic");
    if (anisotropy) {
      const maximum = gl.getParameter(
        anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT
      );
      gl.texParameterf(
        gl.TEXTURE_2D,
        anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(4, maximum)
      );
    }

    isSkyReady = true;
    resize();
    draw(performance.now());
    hero.classList.add("wp-hero--ready");
    schedule();
  }, {
    once: true,
    signal: abortController.signal,
  });
  skyImage.addEventListener("error", () => {
    if (!isDisposed) {
      hero.classList.add("wp-hero--fallback");
      console.warn("[Wormhole Portal] Sky texture could not be loaded.");
    }
  }, {
    once: true,
    signal: abortController.signal,
  });

  resize();
  skyImage.src = new URL(
    "../assets/wormhole-sky-v1.webp",
    import.meta.url
  ).href;

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
    gl.deleteTexture(skyTexture);
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
