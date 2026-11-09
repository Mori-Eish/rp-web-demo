import { inputSandbox } from './input-sandbox.js';
import { perpetualSquare } from './perpetual-square.js';
import { fanWind } from './fan-wind.js';
import { bendingBar } from './bending-bar.js';
import { alternatingDirections } from './alternating-directions.js';

// 公開可能なデモだけをここに登録。並び順が一覧とデモ番号に反映される。
export const demos = [perpetualSquare, alternatingDirections, fanWind, bendingBar, inputSandbox];
export const plannedSlots = 0;
