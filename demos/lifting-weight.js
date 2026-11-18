import { t } from '../i18n.js';
import { squareLuminances } from './perpetual-square.js';

const gravity = 650;
const automaticHeight = 125;
const defaultMode = 'simultaneous';
const liftSpeed = { min: 60, max: 300, step: 10, default: 120 };
const gripAt = .56;
const liftAt = gripAt + .18;
const referenceLiftDuration = 1.05;
const holdAt = liftAt + referenceLiftDuration;
const releaseAt = holdAt + .38;
const openingDuration = .16;
const travelAt = releaseAt + .58;
const cycleDuration = releaseAt + 1.02;
const railY = 42;
const headOffset = .55;
const liftModes = ['manual', 'sequential', 'simultaneous'];

function ease(value) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
}

function fallingLift(lift, speed, time) {
  return Math.max(0, lift - speed * time - gravity * time * time / 2);
}

function drawClaw(ctx, x, gripY, size, pinch) {
  const headY = gripY - size * headOffset;
  ctx.fillStyle = '#d4d8d4';
  ctx.fillRect(x - 1, railY + 7, 2, headY - railY - 7);
  ctx.fillStyle = '#252b2b';
  ctx.fillRect(x - size * .24, railY - 4, size * .48, 14);
  ctx.fillStyle = '#adb9b5';
  ctx.fillRect(x - size * .19, railY - 1, size * .38, 4);

  const tip = .635 - .115 * pinch;
  ctx.save();
  ctx.translate(x, gripY);
  ctx.scale(size, size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(side * .17, -.37);
    ctx.lineTo(side * (tip - .12), -.22);
    ctx.lineTo(side * tip, .04);
    ctx.lineTo(side * (tip - .085), .14);
  }
  ctx.strokeStyle = '#272d2d';
  ctx.lineWidth = .12;
  ctx.stroke();
  ctx.strokeStyle = '#bfcac6';
  ctx.lineWidth = .058;
  ctx.stroke();

  ctx.fillStyle = '#272d2d';
  ctx.fillRect(-.27, -headOffset, .54, .22);
  ctx.fillStyle = '#d9aa5f';
  ctx.fillRect(-.23, -.51, .46, .14);
  ctx.fillStyle = '#272d2d';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * .16, -.40, .027, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const grayscale = (value) => {
  const channel = Math.round(value * 255);
  return `rgb(${channel}, ${channel}, ${channel})`;
};

export const liftingWeight = {
  id: 'lifting-weight',
  title: '四角を持ち上げる',
  description: '3つの四角をドラッグで持ち上げるか、自動モードで動きを比べます。',
  note: 'Aは上向きRP、Bは一様な点滅、Cは下向きRPです。自動モードでは、クレーンが同じ高さまで持ち上げてから放します。どの四角も同じ重力で落ちます。',
  kind: 'LIFT AND RELEASE',
  badge: '試作',
  hint: 'A・B・Cを同時に持ち上げて放します',
  canvasLabel: '地面に四角A・B・Cが左から並んでいます。手動では上にドラッグするか、左右の矢印キーで選んで上矢印で持ち上げます。設定で自動モードに切り替えられます。',
  stageClass: 'lift-stage',
  thumbnail: 'lifting',
  settings: [
    {
      key: 'liftMode', label: '持ち上げ方', type: 'select', default: defaultMode,
      options: liftModes.map((value) => ({ value, labelKey: `lifting.mode.${value}` })),
    },
    { key: 'liftSpeed', label: '自動の持ち上げ速度', type: 'range', ...liftSpeed, unit: ' px/s' },
    { key: 'liftingRP', label: 'AとCのRPを表示する', type: 'checkbox', default: true },
  ],
  create({ canvas, setHint }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const boxes = [
      { label: 'A', xRatio: .22, direction: 'up', lift: 0, speed: 0 },
      { label: 'B', xRatio: .5, direction: null, lift: 0, speed: 0 },
      { label: 'C', xRatio: .78, direction: 'down', lift: 0, speed: 0 },
    ];
    let width = 0, height = 0, size = 0, ground = 0;
    let drag = null, keyboardHold = 0, selected = 0, keyboardUsed = false;
    let rpEnabled = true;
    let mode = defaultMode, speed = liftSpeed.default, automaticTime = 0, automaticIndex = 0;
    const maxLift = () => Math.max(0, ground - size - 32);
    const clampLift = (lift) => Math.max(0, Math.min(maxLift(), lift));
    const release = () => {
      drag = null;
      keyboardHold = 0;
    };

    function resetBoxes() {
      for (const box of boxes) {
        box.lift = 0;
        box.speed = 0;
      }
    }

    function localize() {
      setHint?.(t(`lifting.hint.${mode}`));
    }

    function advanceAutomatic(delta) {
      const pickupY = ground - size;
      const minGripY = railY + 20 + size * headOffset;
      const target = Math.max(0, Math.min(automaticHeight, pickupY - minGripY));
      const liftDuration = Math.max(.001, target / speed);
      const actualHoldAt = liftAt + liftDuration;
      const actualCycleDuration = cycleDuration - referenceLiftDuration + liftDuration;
      // 上昇区間だけを実時間に換算し直し、速度を変えても現在の高さを保つ。
      const actualTime = Math.min(automaticTime, liftAt)
        + Math.max(0, Math.min(automaticTime, holdAt) - liftAt) * liftDuration / referenceLiftDuration
        + Math.max(0, automaticTime - holdAt) + delta;
      const completedCycles = Math.floor(actualTime / actualCycleDuration);
      automaticIndex = (automaticIndex + completedCycles) % boxes.length;
      const withinCycle = actualTime % actualCycleDuration;
      automaticTime = Math.min(withinCycle, liftAt)
        + Math.max(0, Math.min(withinCycle, actualHoldAt) - liftAt) * referenceLiftDuration / liftDuration
        + Math.max(0, withinCycle - actualHoldAt);
      const time = automaticTime;
      const upward = target * ease((time - liftAt) / (holdAt - liftAt));
      const openingTime = Math.max(0, time - releaseAt);
      const fallTime = Math.max(0, openingTime - openingDuration);
      const lift = fallTime > 0 ? fallingLift(target, 0, fallTime) : upward;
      const gripTop = pickupY - target;
      const restY = Math.max(minGripY, gripTop - size * .35);
      let clawY = restY + (pickupY - restY) * ease(time / gripAt) - upward;
      let pinch = ease((time - gripAt) / (liftAt - gripAt));
      if (time >= releaseAt) {
        clawY = gripTop + (restY - gripTop) * ease(fallTime / .42);
        pinch = 1 - ease(openingTime / openingDuration);
      }
      const simultaneous = mode === 'simultaneous';
      const next = boxes[(automaticIndex + 1) % boxes.length];
      const advance = simultaneous ? 0 : ease((time - travelAt) / (cycleDuration - travelAt));
      const claws = [];
      for (const [boxIndex, box] of boxes.entries()) {
        const active = simultaneous || boxIndex === automaticIndex;
        box.lift = active ? lift : 0;
        box.speed = active && lift > 0 ? gravity * fallTime : 0;
        if (!active) continue;
        claws.push({ x: (box.xRatio + (next.xRatio - box.xRatio) * advance) * width, y: clawY, pinch });
      }
      return claws;
    }

    return {
      resize(view) {
        width = view.width;
        height = view.height;
        size = Math.min(72, width * .2, height * .22);
        ground = height * .78;
        for (const box of boxes) box.lift = clampLift(box.lift);
      },
      setSettings(values) {
        rpEnabled = values.liftingRP ?? rpEnabled;
        if (Number.isFinite(values.liftSpeed)) speed = Math.max(liftSpeed.min, Math.min(liftSpeed.max, values.liftSpeed));
        if (mode === values.liftMode || !liftModes.includes(values.liftMode)) return;
        mode = values.liftMode;
        release();
        keyboardUsed = false;
        automaticTime = 0;
        automaticIndex = 0;
        if (mode !== 'manual') resetBoxes();
        localize();
      },
      pointer({ type, x, y, pointerId }) {
        if (mode !== 'manual') return;
        if (type === 'down' && !drag) {
          const box = boxes.find((item) => {
            const bottom = ground - item.lift;
            return Math.abs(x - item.xRatio * width) <= size / 2 && y >= bottom - size && y <= bottom;
          });
          if (!box) return;
          keyboardHold = 0;
          keyboardUsed = false;
          box.speed = 0;
          drag = { box, pointerId, offset: ground - box.lift - y };
        } else if (drag && drag.pointerId === pointerId) {
          if (type === 'move') drag.box.lift = clampLift(ground - y - drag.offset);
          if (type === 'up' || type === 'cancel') release();
        }
      },
      key({ key, shiftKey }) {
        if (mode !== 'manual' || drag) return;
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          keyboardHold = 0;
          const step = key === 'ArrowLeft' ? -1 : 1;
          selected = Math.max(0, Math.min(boxes.length - 1, selected + step));
          keyboardUsed = true;
        }
        if (key === 'ArrowUp') {
          keyboardUsed = true;
          const box = boxes[selected];
          box.lift = clampLift(box.lift + (shiftKey ? 28 : 16));
          box.speed = 0;
          keyboardHold = .18;
        }
      },
      suspend: release,
      localize,
      reset() {
        release();
        resetBoxes();
        automaticTime = 0;
        automaticIndex = 0;
        selected = 0;
        keyboardUsed = false;
      },
      render({ elapsed, delta = 0 }) {
        const claws = mode === 'manual' ? [] : advanceAutomatic(delta);
        const heldFor = Math.min(delta, keyboardHold);
        keyboardHold -= heldFor;
        const levels = {
          up: squareLuminances(elapsed, 'up'),
          down: squareLuminances(elapsed, 'down'),
        };

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#50564d';
        ctx.fillRect(0, ground, width, height - ground);
        ctx.fillStyle = '#b8b9a8';
        ctx.fillRect(0, ground, width, 2);
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';

        for (const [index, box] of boxes.entries()) {
          const dragged = drag?.box === box;
          const dt = index === selected ? delta - heldFor : delta;
          if (mode === 'manual' && !dragged && box.lift > 0) {
            box.lift = fallingLift(box.lift, box.speed, dt);
            box.speed = box.lift > 0 ? box.speed + gravity * dt : 0;
          }

          const x = box.xRatio * width;
          const left = x - size / 2;
          const top = ground - box.lift - size;
          ctx.fillStyle = grayscale(levels.down.center);
          ctx.fillRect(left, top, size, size);
          if (rpEnabled && box.direction) {
            const edges = levels[box.direction];
            const edge = size * .04;
            ctx.fillStyle = grayscale(edges.top);
            ctx.fillRect(left, top, size, edge);
            ctx.fillStyle = grayscale(edges.bottom);
            ctx.fillRect(left, top + size - edge, size, edge);
          }
          ctx.fillStyle = keyboardUsed && index === selected ? '#f6e1a1' : '#e9e9dd';
          ctx.fillText(box.label, x, ground + 23);
        }
        if (claws.length) {
          ctx.fillStyle = '#333b3a';
          ctx.fillRect(width * .1, railY - 3, width * .8, 6);
          ctx.fillStyle = '#aab4ae';
          ctx.fillRect(width * .1, railY - 2, width * .8, 1);
          for (const { x, y, pinch } of claws) drawClaw(ctx, x, y, size, pinch);
        }
      },
    };
  },
};
