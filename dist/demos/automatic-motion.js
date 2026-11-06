// 端では折り返し、1フレームで複数の端を通過しても移動距離を保つ。
export function advanceAutomatic(position, movement, distance, span) {
  if (span <= 0 || distance <= 0) return { position, movement };
  const unfolded = movement === 'right' ? position : 2 - position;
  const phase = (unfolded + distance / span) % 2;
  return { position: phase <= 1 ? phase : 2 - phase, movement: phase < 1 ? 'right' : 'left' };
}
