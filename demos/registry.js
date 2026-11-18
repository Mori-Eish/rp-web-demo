import { inputSandbox } from './input-sandbox.js';
import { perpetualSquare } from './perpetual-square.js';
import { fanWind } from './fan-wind.js';
import { bendingBar } from './bending-bar.js';
import { alternatingDirections } from './alternating-directions.js';
import { liftingWeight } from './lifting-weight.js';
import { tileRipple } from './tile-ripple.js';
import { donutCompliance } from './donut-compliance.js';
import { donutTiles } from './donut-tiles.js';
import { pullingSquare } from './pulling-square.js';

// 公開可能なデモだけをここに登録。並び順が一覧とデモ番号に反映される。
export const demos = [
  perpetualSquare, alternatingDirections, fanWind, bendingBar, liftingWeight,
  pullingSquare, tileRipple, donutCompliance, donutTiles,
];

const hostname = globalThis.location?.hostname;
if (hostname === '127.0.0.1' || hostname === 'localhost') {
  demos.push(inputSandbox);
}

export const plannedSlots = 0;
