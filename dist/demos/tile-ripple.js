import { squareLuminances } from './perpetual-square.js';

const tiles = 50;
const tileCount = tiles * tiles;
const gapRatio = .12;
const edge = .12;
const gapShade = 56;
const idleShade = 110;
const waveSpeed = 34; // タイル / 秒
const waveWidth = 10;
const fieldRadius = 18;
const fieldDuration = 1.6;
const roughRadius = 6.5; // タイル単位
const roughFade = .25;
const maxWaves = 5;
const phaseSteps = 64;
const phases = Array.from({ length: phaseSteps }, (_, i) => squareLuminances(i / phaseSteps, 'right', 1));
const gray = Array.from({ length: 256 }, (_, i) => `rgb(${i}, ${i}, ${i})`);
const idlePixels = new Uint8Array(tileCount * 4);
for (let i = 0; i < idlePixels.length; i += 4) {
  idlePixels[i] = idlePixels[i + 1] = idlePixels[i + 2] = idleShade;
}
const grain = Uint8Array.from({ length: tileCount }, (_, tile) => {
  const hash = Math.imul(tile + 1, 0x9e3779b1);
  return (hash ^ (hash >>> 11)) >>> 24;
});

function writeTile(pixels, tile, cycles, gain, direction) {
  const phase = phases[Math.floor((cycles - Math.floor(cycles)) * phaseSteps)];
  const contrast = gain * gain * (3 - 2 * gain);
  const shade = (value) => Math.round(idleShade + (value * 255 - idleShade) * contrast);
  const reverse = direction % 2 === 1;
  const i = tile * 4;
  pixels[i] = shade(phase.center);
  pixels[i + 1] = shade(reverse ? phase.right : phase.left);
  pixels[i + 2] = shade(reverse ? phase.left : phase.right);
  pixels[i + 3] = direction >= 2 ? 255 : 0;
}

function fillRoughTiles(pixels, contact, elapsed) {
  pixels.set(idlePixels);
  if (!contact) return;

  const { x, y, fadeStart } = contact;
  const fade = Math.min(1, (fadeStart + roughFade - elapsed) / roughFade);
  const minX = Math.max(0, Math.floor(x - roughRadius));
  const maxX = Math.min(tiles - 1, Math.floor(x + roughRadius));
  const minY = Math.max(0, Math.floor(y - roughRadius));
  const maxY = Math.min(tiles - 1, Math.floor(y + roughRadius));
  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const distance = Math.hypot(col + .5 - x, row + .5 - y);
      if (distance >= roughRadius) continue;
      const tile = row * tiles + col;
      const gain = .88 * fade * Math.min(1, (roughRadius - distance) / 2);
      writeTile(pixels, tile, elapsed * 2.4 + grain[tile] / 256, gain, grain[tile] & 3);
    }
  }
}

function makeWave(x, y, start, pattern) {
  const distance = new Float32Array(tileCount);
  const direction = new Uint8Array(tileCount);
  let farthest = 0;
  for (let i = 0; i < tileCount; i++) {
    const dx = i % tiles + .5 - x;
    const dy = Math.floor(i / tiles) + .5 - y;
    distance[i] = Math.hypot(dx, dy);
    farthest = Math.max(farthest, distance[i]);
    // 0/1は水平、2/3は垂直。奇数は負の向き。
    direction[i] = Math.abs(dx) >= Math.abs(dy) ? Number(dx < 0) : 2 + Number(dy < 0);
  }
  const duration = pattern === 'ripple' ? (farthest + waveWidth) / waveSpeed : fieldDuration;
  return { start, distance, direction, duration };
}

function fillTiles(pixels, waves, elapsed, pattern) {
  pixels.set(idlePixels);
  const ripple = pattern === 'ripple';
  const ages = waves.map(({ start }) => elapsed - start);
  const envelopes = ages.map((age) => Math.min(1, age / .09, (fieldDuration - age) / .6));
  for (let tile = 0; tile < tileCount; tile++) {
    let strongest = 0;
    let activeWave = -1;
    for (let w = 0; w < waves.length; w++) {
      const radius = waves[w].distance[tile];
      // 集合・拡散では、波面を移動させず、クリック周辺でRPを続ける。
      const gain = ripple
        ? 1 - Math.abs(radius - ages[w] * waveSpeed) / waveWidth
        : Math.min(1, radius / 1.5, (fieldRadius - radius) / 7) * envelopes[w];
      if (gain > strongest) {
        strongest = gain;
        activeWave = w;
      }
    }
    if (activeWave < 0) continue;

    const { start, distance, direction } = waves[activeWave];
    const cycles = ripple
      ? (elapsed - start - distance[tile] / waveSpeed) * 2.4
      : elapsed * 2.4 + (tile * 17 % 19) / 76;
    const tileDirection = pattern === 'gather' ? direction[tile] ^ 1 : direction[tile];
    writeTile(pixels, tile, cycles, strongest, tileDirection);
  }
}

const vertexSource = `#version 300 es
void main() {
  vec2 point = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D tileColors;
uniform float resolution;
uniform float faceRatio;
out vec4 color;

void main() {
  vec2 position = vec2(gl_FragCoord.x, resolution - gl_FragCoord.y) * ${tiles}.0 / resolution;
  vec2 local = fract(position);
  vec4 tile = texelFetch(tileColors, ivec2(position), 0);
  float along = tile.a > 0.5 ? local.y : local.x;
  // 1ピクセルより細いエッジは、ピクセルを覆う割合で明暗を混ぜる。
  float pixelsPerTile = resolution / ${tiles}.0;
  float nearEdge = clamp((faceRatio * ${edge} - along) * pixelsPerTile + 0.5, 0.0, 1.0);
  float farEdge = clamp((along - faceRatio * ${1 - edge}) * pixelsPerTile + 0.5, 0.0, 1.0);
  float shade = tile.r + (tile.g - tile.r) * nearEdge + (tile.b - tile.r) * farEdge;
  if (max(local.x, local.y) >= faceRatio) {
    shade = ${gapShade}.0 / 255.0;
  }
  color = vec4(vec3(shade), 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const message = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(message);
}

function createWebGL(overlay) {
  const surface = document.createElement('canvas');
  const gl = surface.getContext('webgl2', { alpha: false, antialias: false, depth: false });
  if (!gl) return null;

  try {
    const program = gl.createProgram();
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));

    const texture = gl.createTexture();
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, tiles, tiles);
    gl.uniform1i(gl.getUniformLocation(program, 'tileColors'), 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const faceRatio = gl.getUniformLocation(program, 'faceRatio');

    surface.setAttribute('aria-hidden', 'true');
    surface.style.position = 'absolute';
    overlay.append(surface);

    return {
      resize({ left, top, side, face }, dpr) {
        const size = Math.max(1, Math.round(side * dpr));
        surface.width = surface.height = size;
        Object.assign(surface.style, { left: `${left}px`, top: `${top}px`, width: `${side}px`, height: `${side}px` });
        gl.viewport(0, 0, size, size);
        gl.uniform1f(resolution, size);
        gl.uniform1f(faceRatio, face);
      },
      draw(pixels) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, tiles, tiles, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      lost() { return gl.isContextLost(); },
      dispose() {
        surface.remove();
        gl.deleteProgram(program);
        gl.deleteTexture(texture);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  } catch {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
}

function drawCanvas(ctx, pixels, { left, top, side, face: faceRatio }, dpr) {
  const cell = side / tiles;
  const face = cell * faceRatio;
  const edgeSize = face * edge;
  const snap = (point) => Math.round(point * dpr) / dpr;
  const rect = (color, x, y, w, h) => {
    ctx.fillStyle = gray[color];
    const sx = snap(x), sy = snap(y);
    ctx.fillRect(sx, sy, snap(x + w) - sx, snap(y + h) - sy);
  };
  const edgeRect = (color, x, y, w, h) => {
    ctx.fillStyle = gray[color];
    ctx.fillRect(x, y, w, h);
  };

  rect(gapShade, left, top, side, side);
  for (let tile = 0; tile < tileCount; tile++) {
    const i = tile * 4;
    const x = left + tile % tiles * cell;
    const y = top + Math.floor(tile / tiles) * cell;
    rect(pixels[i], x, y, face, face);
    if (pixels[i + 1] === pixels[i] && pixels[i + 2] === pixels[i]) continue;
    if (pixels[i + 3]) {
      edgeRect(pixels[i + 1], x, y, face, edgeSize);
      edgeRect(pixels[i + 2], x, y + face - edgeSize, face, edgeSize);
    } else {
      edgeRect(pixels[i + 1], x, y, edgeSize, face);
      edgeRect(pixels[i + 2], x + face - edgeSize, y, edgeSize, face);
    }
  }
}

export const tileRipple = {
  id: 'tile-ripple',
  title: 'RPタイル',
  description: '50×50のタイルをなぞって、触れた周囲の見え方を比べます。',
  note: '「ざらざら」では、触れた位置の近くでタイルごとに異なる向きのRPを提示します。押したままなぞると、反応する範囲が指やマウスについてきます。',
  kind: '50 × 50',
  badge: '試作',
  hint: 'クリック・タップ、またはドラッグで反応する位置を選ぶ',
  canvasLabel: '50×50のタイル。クリック、タップ、ドラッグ、または矢印キーで反応する位置を選びます。',
  thumbnail: 'tiles',
  settings: [
    {
      key: 'tilePattern', label: '動きのパターン', type: 'select', default: 'roughness',
      options: [
        { value: 'roughness', labelKey: 'tiles.pattern.roughness' },
        { value: 'gather', labelKey: 'tiles.pattern.gather' },
        { value: 'disperse', labelKey: 'tiles.pattern.disperse' },
        { value: 'ripple', labelKey: 'tiles.pattern.ripple' },
      ],
    },
  ],
  create({ canvas, overlay }) {
    const ctx = canvas.getContext('2d');
    let webgl = createWebGL(overlay);
    const pixels = new Uint8Array(tileCount * 4);
    let field = { left: 0, top: 0, side: 1, face: 1 };
    let view = { width: 1, height: 1, dpr: 1 };
    let waves = [], drag = null, contact = null, lastElapsed = 0, dirty = true;
    let keyX = tiles / 2, keyY = tiles / 2;
    let pattern = tileRipple.settings[0].default;

    function emit(x, y) {
      if (pattern === 'roughness') {
        if (contact?.fadeStart === Infinity) {
          contact.x = x;
          contact.y = y;
        } else {
          contact = { x, y, start: lastElapsed, fadeStart: Infinity };
        }
        dirty = true;
        return;
      }
      if (pattern !== 'ripple') waves = [];
      else if (waves.length === maxWaves) waves.shift();
      waves.push(makeWave(x, y, lastElapsed, pattern));
      dirty = true;
    }

    function releaseContact() {
      if (contact?.fadeStart === Infinity) {
        contact.fadeStart = Math.max(lastElapsed, contact.start + .2);
      }
    }

    return {
      resize(nextView) {
        view = nextView;
        const { width, height, dpr } = view;
        const available = Math.min(width - 20, height - 80);
        const cellPixels = Math.max(1, Math.floor(available * dpr / tiles));
        const gapPixels = cellPixels > 1 ? Math.max(1, Math.round(cellPixels * gapRatio)) : 0;
        const side = cellPixels * tiles / dpr;
        const left = Math.round((width - side) * dpr / 2) / dpr;
        const top = Math.round((height - side) * dpr / 2) / dpr;
        field = { left, top, side, face: 1 - gapPixels / cellPixels };
        webgl?.resize(field, view.dpr);
        dirty = true;
      },
      setSettings({ tilePattern }) {
        if (pattern === tilePattern || !tileRipple.settings[0].options.some(({ value }) => value === tilePattern)) return;
        pattern = tilePattern;
        waves = [];
        contact = drag = null;
        dirty = true;
      },
      pointer({ type, x, y, pointerId }) {
        if (type === 'up' || type === 'cancel') {
          if (drag?.pointerId === pointerId) {
            drag = null;
            releaseContact();
          }
          return;
        }

        const tx = (x - field.left) * tiles / field.side;
        const ty = (y - field.top) * tiles / field.side;
        if (tx < 0 || tx >= tiles || ty < 0 || ty >= tiles) {
          if (drag?.pointerId === pointerId) releaseContact();
          return;
        }
        const moving = type === 'move' && drag?.pointerId === pointerId &&
          (pattern === 'roughness' || Math.hypot(tx - drag.x, ty - drag.y) >= 4.5);
        if ((type === 'down' && !drag) || moving) {
          drag = { pointerId, x: tx, y: ty };
          emit(tx, ty);
        }
      },
      key({ key }) {
        const offset = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[key];
        if (!offset) return;
        keyX = Math.max(.5, Math.min(tiles - .5, keyX + offset[0]));
        keyY = Math.max(.5, Math.min(tiles - .5, keyY + offset[1]));
        emit(keyX, keyY);
        releaseContact();
      },
      suspend() {
        drag = null;
        releaseContact();
      },
      reset() {
        waves = [];
        contact = drag = null;
        lastElapsed = 0;
        keyX = keyY = tiles / 2;
        dirty = true;
      },
      render({ elapsed }) {
        lastElapsed = elapsed;
        if (webgl?.lost()) {
          webgl.dispose();
          webgl = null;
          dirty = true;
        }
        if (!dirty && waves.length === 0 && !contact) return;
        if (pattern === 'roughness') {
          if (contact && elapsed >= contact.fadeStart + roughFade) contact = null;
          fillRoughTiles(pixels, contact, elapsed);
        } else {
          waves = waves.filter(({ start, duration }) => elapsed - start < duration);
          fillTiles(pixels, waves, elapsed, pattern);
        }
        if (webgl) webgl.draw(pixels);
        else {
          ctx.clearRect(0, 0, view.width, view.height);
          drawCanvas(ctx, pixels, field, view.dpr);
        }
        dirty = false;
      },
      dispose() { webgl?.dispose(); },
    };
  },
};
