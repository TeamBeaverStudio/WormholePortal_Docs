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

vec3 sampleSkyLod(vec2 position, float lod) {
  vec3 encoded = textureLod(
    uSky,
    skyCoordinates(position),
    lod
  ).rgb;
  vec3 linearColor = pow(encoded, vec3(2.2));
  return linearColor * mix(0.72, 0.92, uDark);
}

vec3 sampleSky(vec2 position) {
  return sampleSkyLod(position, 0.0);
}

float annulusMask(
  float radius,
  float innerRadius,
  float outerRadius,
  float antialias
) {
  return smoothstep(
    innerRadius - antialias,
    innerRadius + antialias,
    radius
  ) * (
    1.0 - smoothstep(
      outerRadius - antialias,
      outerRadius + antialias,
      radius
    )
  );
}

float glassBell(float coordinate) {
  return pow(
    max(4.0 * coordinate * (1.0 - coordinate), 0.0),
    0.72
  );
}

float glassSlope(float coordinate) {
  float bell = 4.0 * coordinate * (1.0 - coordinate);
  return (coordinate * 2.0 - 1.0) * bell;
}

float gaussianRing(float radius, float center, float width) {
  float coordinate = (radius - center) / max(width, 0.0001);
  return exp(-coordinate * coordinate);
}

float smootherStep01(float value) {
  value = clamp(value, 0.0, 1.0);
  return value * value * value * (
    value * (value * 6.0 - 15.0) + 10.0
  );
}

vec3 renderGlassLayer(
  vec3 underColor,
  vec2 skyPosition,
  vec2 localPosition,
  float innerRadius,
  float outerRadius,
  float bendAmount,
  float shadeAmount,
  float lod
) {
  float radius = max(length(localPosition), 0.0001);
  float antialias = max(fwidth(radius) * 2.2, 0.0014);
  float mask = annulusMask(
    radius,
    innerRadius,
    outerRadius,
    antialias
  );
  float rimSupport = max(
    innerRadius * 0.025 + antialias,
    outerRadius * 0.012 + antialias
  );
  if (
    radius < innerRadius - rimSupport * 3.0
    || radius > outerRadius + rimSupport * 3.0
  ) {
    return underColor;
  }

  float coordinate = clamp(
    (radius - innerRadius)
    / max(outerRadius - innerRadius, 0.0001),
    0.0,
    1.0
  );
  float curvature = glassBell(coordinate);
  vec2 direction = localPosition / radius;
  float refraction = bendAmount * glassSlope(coordinate);
  vec3 refracted = sampleSkyLod(
    skyPosition + direction * refraction,
    lod
  );
  refracted = mix(
    refracted,
    vec3(0.012, 0.009, 0.028),
    0.16
  );
  vec3 result = mix(
    underColor,
    refracted,
    mask * (0.68 + curvature * 0.2)
  );

  float facing = 0.5 + 0.5 * dot(
    direction,
    normalize(vec2(0.55, -0.83))
  );
  float directionalShade = mix(1.1, 0.84, facing);
  result *= 1.0 - mask * (
    0.11 + shadeAmount * curvature
  ) * directionalShade;
  result += mix(
    vec3(0.018, 0.014, 0.036),
    vec3(0.052, 0.032, 0.042),
    facing
  ) * mask * curvature * 0.28;

  float innerRim = gaussianRing(
    radius,
    innerRadius,
    innerRadius * 0.025 + antialias
  );
  float outerRim = gaussianRing(
    radius,
    outerRadius,
    outerRadius * 0.012 + antialias
  );
  float rim = min(innerRim * 0.62 + outerRim, 1.0);
  result *= 1.0 - rim * 0.24;
  result += vec3(0.052, 0.038, 0.068)
    * rim
    * (0.16 + 0.24 * facing);

  return result;
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 screenPosition = (
    2.0 * gl_FragCoord.xy - resolution
  ) / resolution.y;
  vec2 position = screenPosition - uCenter;
  float lensRadius = mix(0.43, 0.52, uQuality);
  float radius = max(length(position), 0.0001);
  vec2 radialDirection = position / radius;
  float edgeAntialias = max(fwidth(radius) * 2.2, 0.0014);
  float inside = 1.0 - smoothstep(
    lensRadius - edgeAntialias * 3.0,
    lensRadius + edgeAntialias * 3.0,
    radius
  );

  vec3 color = sampleSky(screenPosition);
  float normalizedRadius = clamp(
    radius / lensRadius,
    0.0,
    1.0
  );
  float gentleBulge = lensRadius
    * 0.012
    * normalizedRadius
    * (1.0 - normalizedRadius)
    * (1.0 - normalizedRadius);
  vec3 interior = sampleSkyLod(
    screenPosition - radialDirection * gentleBulge,
    0.8
  );
  float cavityAttenuation = mix(
    0.08,
    0.62,
    smootherStep01(normalizedRadius)
  );
  interior *= cavityAttenuation;
  interior += vec3(0.006, 0.004, 0.016)
    * (1.0 - normalizedRadius)
    * 0.35;
  color = mix(color, interior, inside * 0.97);

  float exteriorCoordinate = clamp(
    (radius - lensRadius)
    / (
      lensRadius
      * max(LENS_RANGE_MULTIPLIER - 1.0, 0.0001)
    ),
    0.0,
    1.0
  );
  float exteriorMask = smoothstep(
    lensRadius - edgeAntialias,
    lensRadius + edgeAntialias,
    radius
  );
  float exteriorHaze = exteriorMask
    * (1.0 - smootherStep01(exteriorCoordinate));
  color *= 1.0 - exteriorHaze * 0.014;

  vec2 layer1 = position;
  vec2 layer2 = position
    - vec2(-0.005, 0.008) * lensRadius;
  vec2 layer3 = position
    - vec2(-0.009, 0.013) * lensRadius;
  vec2 layer4 = position
    - vec2(-0.012, 0.017) * lensRadius;
  vec2 layer5 = position
    - vec2(-0.014, 0.019) * lensRadius;

  color = renderGlassLayer(
    color,
    screenPosition,
    layer1,
    lensRadius * 0.76,
    lensRadius * 0.985,
    lensRadius * 0.01,
    0.68,
    2.2
  );
  color = renderGlassLayer(
    color,
    screenPosition,
    layer2,
    lensRadius * 0.575,
    lensRadius * 0.72,
    lensRadius * -0.008,
    0.66,
    2.65
  );
  color = renderGlassLayer(
    color,
    screenPosition,
    layer3,
    lensRadius * 0.415,
    lensRadius * 0.535,
    lensRadius * 0.006,
    0.6,
    3.05
  );
  color = renderGlassLayer(
    color,
    screenPosition,
    layer4,
    lensRadius * 0.295,
    lensRadius * 0.385,
    lensRadius * -0.004,
    0.54,
    3.45
  );
  color = renderGlassLayer(
    color,
    screenPosition,
    layer5,
    lensRadius * 0.235,
    lensRadius * 0.27,
    lensRadius * 0.003,
    0.44,
    3.8
  );

  float upperCavity = inside
    * (1.0 - smoothstep(0.24, 0.78, normalizedRadius))
    * smoothstep(-0.25, 0.82, radialDirection.y);
  color *= 1.0 - upperCavity * 0.55;
  vec2 upperWellPosition = (
    position - vec2(0.0, lensRadius * 0.18)
  ) / (lensRadius * vec2(0.34, 0.3));
  float upperWell = exp(
    -dot(upperWellPosition, upperWellPosition)
  ) * inside;
  color *= 1.0 - upperWell * 0.34;

  float outerRim = gaussianRing(
    radius,
    lensRadius,
    lensRadius * 0.014 + edgeAntialias
  );
  color *= 1.0 - outerRim * 0.34;
  color += vec3(0.026, 0.028, 0.042)
    * outerRim
    * 0.022;

  vec2 throatPosition = position
    - vec2(-0.014, 0.019) * lensRadius;
  float throatDistance = length(throatPosition);
  float throatRadius = lensRadius * 0.165;
  float throatMask = 1.0 - smoothstep(
    throatRadius - edgeAntialias * 2.0,
    throatRadius + edgeAntialias * 2.0,
    throatDistance
  );
  vec3 throatColor = vec3(0.0);

  if (throatDistance < throatRadius + edgeAntialias * 4.0) {
    float throatCoordinate = clamp(
      throatDistance / throatRadius,
      0.0,
      1.0
    );
    float phase = 0.01 * sin(uTime * 0.11);
    float breathing = 1.0 + 0.008 * sin(uTime * 0.16);
    vec2 remoteCoordinates = rotate2d(-0.12 + phase)
      * throatPosition
      / throatRadius
      * (0.38 * breathing);
    remoteCoordinates += vec2(
      -uPointer.x,
      uPointer.y
    ) * 0.006;
    remoteCoordinates += vec2(0.055, -0.025);

    vec3 remoteSky = sampleSkyLod(
      remoteCoordinates,
      1.25
    );
    throatColor = mix(
      remoteSky * 0.7,
      vec3(0.004, 0.055, 0.068),
      0.26
    );
    float aperture = 1.0 - smoothstep(
      0.62,
      1.0,
      throatCoordinate
    );
    throatColor *= mix(0.34, 1.0, aperture);
    float centerDepth = exp(
      -pow(throatCoordinate / 0.52, 2.0)
    );
    throatColor += vec3(0.004, 0.04, 0.052)
      * centerDepth
      * 0.22;
    vec2 echoPosition = throatPosition
      + vec2(0.0, throatRadius * 0.58);
    vec2 echoShape = echoPosition
      / max(throatRadius, 0.0001)
      * vec2(2.4, 3.15);
    float lowerEcho = exp(-dot(echoShape, echoShape));
    throatColor += vec3(0.006, 0.07, 0.082)
      * lowerEcho
      * 0.42;
  }

  color = mix(color, throatColor, throatMask);
  float throatRim = gaussianRing(
    throatDistance,
    throatRadius,
    lensRadius * 0.012 + edgeAntialias
  );
  color *= 1.0 - throatRim * 0.52;
  color += vec3(0.012, 0.065, 0.074)
    * throatRim
    * 0.035;

  float vignette = smoothstep(0.42, 1.55, length(screenPosition));
  color *= 1.0 - vignette * 0.48;

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
