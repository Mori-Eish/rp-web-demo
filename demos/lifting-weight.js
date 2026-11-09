import { squareLuminances } from './perpetual-square.js';

const gravity = 900;
const grayscale = (value) => {
  const channel = Math.round(value * 255);
  return `rgb(${channel}, ${channel}, ${channel})`;
};

export const liftingWeight = {
  id: 'lifting-weight',
  title: '四角を持ち上げる',
  description: '地面に並ぶ3つの四角を持ち上げて、感覚の違いを比べます。',
  note: '左からAは上向きRP、Bは点滅のみ、Cは下向きRPです。再生中は3つとも同じ周期で点滅します。どれも指やマウスに同じように追従し、離すと同じ重力で落ちます。',
  kind: 'LIFT AND RELEASE',
  badge: '試作',
  hint: '四角を上にドラッグして、離してみてください。',
  canvasLabel: '地面に四角A・B・Cが左から並んでいます。上にドラッグして持ち上げます。左右の矢印キーで選び、上矢印で持ち上げることもできます。',
  stageClass: 'lift-stage',
  thumbnail: 'lifting',
  settings: [
    { key: 'liftingRP', label: 'AとCのRPを表示する', type: 'checkbox', default: true },
  ],
  create({ canvas }) {
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
    const maxLift = () => Math.max(0, ground - size - 32);
    const clampLift = (lift) => Math.max(0, Math.min(maxLift(), lift));
    const release = () => {
      drag = null;
      keyboardHold = 0;
    };

    return {
      resize(view) {
        width = view.width;
        height = view.height;
        size = Math.min(72, width * .2, height * .22);
        ground = height * .78;
        for (const box of boxes) box.lift = clampLift(box.lift);
      },
      setSettings(values) { rpEnabled = values.liftingRP ?? rpEnabled; },
      pointer({ type, x, y, pointerId }) {
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
        if (drag) return;
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
      reset() {
        release();
        for (const box of boxes) {
          box.lift = 0;
          box.speed = 0;
        }
        selected = 0;
        keyboardUsed = false;
      },
      render({ elapsed, delta = 0 }) {
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
          if (!dragged && box.lift > 0) {
            box.lift = Math.max(0, box.lift - box.speed * dt - gravity * dt * dt / 2);
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
      },
    };
  },
};
