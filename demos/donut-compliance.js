import { barDefaults, barResponse, blendBarEdges } from './bending-bar.js';
import { squareLuminances } from './perpetual-square.js';

const sectorCount = 16;
const fullTurn = Math.PI * 2;
const sectorAngle = fullTurn / sectorCount;
const innerRadiusRatio = .15 / .25;
const responseDistance = 300;
const approachGap = 50;
const contactStrength = .25;
const barRestStrength = .5;
// シーンの−90°回転を反映し、画面右の90°を最初の方向として扱う。
const firstDirectionStart = -Math.PI / 4;
const sectorsPerDirection = sectorCount / 4;
const samplesPerSector = 6;
const directionSamples = sectorsPerDirection * samplesPerSector;
const sectors = Array.from({ length: sectorCount }, (_, index) => {
  const middle = firstDirectionStart + (index + .5) * sectorAngle;
  return { x: Math.cos(middle), y: Math.sin(middle) };
});
const directionBands = Array.from({ length: 4 }, (_, index) => {
  const firstSector = index * sectorsPerDirection;
  const start = firstDirectionStart + firstSector * sectorAngle;
  const end = start + Math.PI / 2;
  const samples = Array.from({ length: directionSamples + 1 }, (_, step) => {
    const position = step / samplesPerSector;
    const angle = start + position * sectorAngle;
    const sectorPosition = firstSector + position - .5;
    const lower = Math.floor(sectorPosition);
    // 切り替わる境界の両側1区画で、エッジ幅を滑らかにゼロへ絞る。
    const distanceToBoundary = Math.min(1, position, sectorsPerDirection - position);
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      previous: (lower + sectorCount) % sectorCount,
      next: (lower + 1) % sectorCount,
      blend: sectorPosition - lower,
      taper: distanceToBoundary ** 2 * (3 - 2 * distanceToBoundary),
    };
  });
  return {
    start,
    end,
    samples,
    swapEdges: index % 2 === 0,
  };
});

function grayscale(value) {
  const byte = Math.round(value * 255);
  return `rgb(${byte},${byte},${byte})`;
}

export const donutCompliance = {
  id: 'donut-compliance',
  title: 'ドーナツの変形錯視',
  description: '板を地面に置いたドーナツに押し当て、見かけの変形を観察してください。',
  note: '板との間隔が50 pxを下回ると、ドーナツにRPが現れます。接触後は押し込むほどエッジが太くなります。棒のRPは接触前は全体が下向きで、接触すると中央付近が上向きに切り替わります。',
  badge: '試作デモ',
  stageClass: 'bar-stage',
  stageLabel: '16 SECTORS',
  hint: 'マウスを上下に動かす / タッチで上下にドラッグ / ↑ ↓ キー',
  canvasLabel: '地面に置かれたドーナツ状RP刺激と、その上にある板。マウス、タッチのドラッグ、上下の矢印キーで板を押し当ててください。',
  thumbnail: 'donut',
  settings: [
    { key: 'bendingPlate', label: '板をしなって見える棒にする', type: 'checkbox', default: false },
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: 2, unit: ' Hz' },
    { key: 'maxEdgePercent', label: 'エッジ幅の上限', type: 'range', min: .5, max: 20, step: .5, default: 6, unit: ' %' },
  ],
  create({ canvas, setStageLabel }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const settings = Object.fromEntries(donutCompliance.settings.map(({ key, default: value }) => [key, value]));
    let width = 1, height = 1, outer = .09, travel = 1;
    let pressPosition = -1, previousY = null, touchId = null;
    let cycles = 0;

    function clearMouse(event) {
      if (event.pointerType === 'mouse' && touchId === null) previousY = null;
    }
    canvas.classList.add('donut-control');
    canvas.addEventListener('pointerleave', clearMouse);

    function endInput() {
      touchId = null;
      previousY = null;
    }

    function movePlate(dy) {
      // 0で接触し、正の値は板の位置ではなく接触後の押し込み量を表す。
      pressPosition = Math.max(-1, Math.min(1, pressPosition + dy / travel));
    }

    function followPointer(y) {
      if (previousY !== null) movePlate(y - previousY);
      previousY = y;
    }

    function fillEdge(cx, cy, radius, band, widths, radialDirection, color) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, band.start, band.end);
      for (let index = band.samples.length - 1; index >= 0; index--) {
        const { x, y } = band.samples[index];
        const edgeRadius = radius + radialDirection * widths[index];
        ctx.lineTo(cx + x * edgeRadius, cy + y * edgeRadius);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function drawBendingPlate(left, top, length, thickness, touching, values) {
      ctx.fillStyle = grayscale(values.center);
      ctx.fillRect(left, top, length, thickness);

      const segmentWidth = length / barDefaults.segments;
      const centerRange = length * .3;
      const press = Math.max(0, pressPosition);
      const strength = barRestStrength + (1 - barRestStrength) * press;
      const edge = thickness * settings.maxEdgePercent / 100 * strength;
      // 棒デモと同じ4状態の輝度系列を、横に並べた区画の上下に割り当てる。
      for (let index = 0; index < barDefaults.segments; index++) {
        const x = left + index * segmentWidth;
        const offset = (index + .5) * segmentWidth - length / 2;
        const invertAmount = touching ? barResponse(Math.abs(offset), { maxDistance: centerRange }).proximity : 0;
        const [upper, lower] = blendBarEdges(values.top, values.bottom, invertAmount);
        ctx.fillStyle = grayscale(upper);
        ctx.fillRect(x, top, segmentWidth, edge);
        ctx.fillStyle = grayscale(lower);
        ctx.fillRect(x, top + thickness - edge, segmentWidth, edge);
      }
    }

    return {
      resize(view) {
        width = Math.max(1, view.width);
        height = Math.max(1, view.height);
        outer = Math.min(width, height) * .09;
        travel = Math.max(approachGap, Math.min(92, outer * 1.8));
        previousY = null;
      },
      setSettings(values) {
        for (const { key, type, min, max } of donutCompliance.settings) {
          if (type === 'checkbox') {
            if (typeof values[key] === 'boolean') settings[key] = values[key];
          } else if (Number.isFinite(values[key])) settings[key] = Math.max(min, Math.min(max, values[key]));
        }
        setStageLabel?.(`16 SECTORS / ${settings.frequency.toFixed(1)} Hz`);
      },
      pointer({ type, pointerType, pointerId, y }) {
        if (pointerType === 'mouse') {
          if (touchId !== null) return;
          if (type === 'move' || type === 'down') followPointer(y);
        } else if (type === 'down' && touchId === null) {
          touchId = pointerId;
          previousY = y;
        } else if (pointerId === touchId) {
          if (type === 'move') followPointer(y);
          else if (type === 'up' || type === 'cancel') endInput();
        }
      },
      key({ key, shiftKey }) {
        const step = shiftKey ? 24 : 8;
        if (key === 'ArrowDown') movePlate(step);
        if (key === 'ArrowUp') movePlate(-step);
      },
      suspend: endInput,
      reset() {
        endInput();
        pressPosition = -1;
        cycles = 0;
      },
      render({ delta }) {
        cycles = (cycles + delta * settings.frequency) % 1;
        const values = squareLuminances(cycles, 'down', 1);
        const coreColor = grayscale(values.center);
        const cx = width / 2, cy = height / 2;
        const inner = outer * innerRadiusRatio;
        const contactY = cy - outer;
        const plateBottom = contactY + Math.min(0, pressPosition) * travel;
        const groundY = cy + outer;

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#dededb';
        ctx.fillRect(0, groundY, width, height - groundY);
        ctx.beginPath();
        ctx.arc(cx, cy, outer, 0, fullTurn);
        ctx.moveTo(cx + inner, cy);
        ctx.arc(cx, cy, inner, 0, fullTurn);
        ctx.fillStyle = coreColor;
        ctx.fill('evenodd');

        const strength = pressPosition < 0
          ? contactStrength * Math.max(0, 1 + pressPosition * travel / approachGap)
          : contactStrength + (1 - contactStrength) * pressPosition;
        if (strength > 0) {
          const topColor = grayscale(values.top), bottomColor = grayscale(values.bottom);
          const anchorRadius = (inner + outer) / 2;
          const edge = (outer - inner) * settings.maxEdgePercent / 100 * strength;
          const sectorWidths = sectors.map((sector) => {
            const distance = Math.hypot(anchorRadius * sector.x, outer + anchorRadius * sector.y);
            return edge * Math.max(0, 1 - distance / responseDistance);
          });
          for (const band of directionBands) {
            const widths = band.samples.map(({ previous, next, blend, taper }) => (
              (sectorWidths[previous] * (1 - blend) + sectorWidths[next] * blend) * taper
            ));
            if (!widths.some((width) => width > 0)) continue;
            const innerColor = band.swapEdges ? topColor : bottomColor;
            const outerColor = band.swapEdges ? bottomColor : topColor;
            if (innerColor !== coreColor) fillEdge(cx, cy, inner, band, widths, 1, innerColor);
            if (outerColor !== coreColor) fillEdge(cx, cy, outer, band, widths, -1, outerColor);
          }
        }

        const plateHalfWidth = outer * 1.65;
        const plateThickness = Math.min(14, outer * .3);
        const plateLeft = cx - plateHalfWidth, plateTop = plateBottom - plateThickness;
        const plateLength = plateHalfWidth * 2;
        if (settings.bendingPlate) {
          drawBendingPlate(plateLeft, plateTop, plateLength, plateThickness, plateBottom === contactY, values);
        } else {
          ctx.fillStyle = '#30332f';
          ctx.fillRect(plateLeft, plateTop, plateLength, plateThickness);
          ctx.fillStyle = '#d9dad4';
          ctx.fillRect(plateLeft + 1, plateTop + 1, plateLength - 2, plateThickness - 2);
        }
      },
      dispose() {
        canvas.classList.remove('donut-control');
        canvas.removeEventListener('pointerleave', clearMouse);
      },
    };
  },
};
