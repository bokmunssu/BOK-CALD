import { expect, it } from 'vitest';
import { moveBanner, clampPosition } from '../banner';
it('moves only the overflowing axis without cropping the original', () => {
  expect(moveBanner({x:50,y:50}, {x:20,y:-40}, {x:0,y:200})).toEqual({x:50,y:70});
  expect(moveBanner({x:50,y:50}, {x:500,y:500}, {x:100,y:100})).toEqual({x:0,y:0});
  expect(clampPosition(NaN)).toBe(50);
});
