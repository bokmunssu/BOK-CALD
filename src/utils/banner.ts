export const clampPosition = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
export function moveBanner(start: { x: number; y: number }, delta: { x: number; y: number }, overflow: { x: number; y: number }) {
  return { x: overflow.x > 1 ? clampPosition(start.x - delta.x / overflow.x * 100) : start.x,
    y: overflow.y > 1 ? clampPosition(start.y - delta.y / overflow.y * 100) : start.y };
}
