import { describe,it,expect } from 'vitest';
import { toLunar,toSolar,lunarLabel } from '../lunar';
describe('Korean lunar dates',()=>{
 it('converts Seollal without timezone date shifts',()=>{expect(toSolar({year:2026,month:1,day:1})).toEqual(new Date(2026,1,17));expect(toLunar(new Date(2026,1,17))).toMatchObject({year:2026,month:1,day:1,intercalation:false});});
 it('round trips an actual leap month and rejects a nonexistent one',()=>{const l=toLunar(new Date(2017,5,24))!;expect(l).toMatchObject({month:5,day:1,intercalation:true});expect(toSolar(l)).toEqual(new Date(2017,5,24));expect(toSolar({year:2026,month:1,day:1,intercalation:true})).toBeNull();});
 it('rejects invalid/out-of-range dates without reusing a previous conversion',()=>{expect(toSolar({year:2051,month:1,day:1})).toBeNull();expect(lunarLabel(new Date(2051,0,1))).toBe('');expect(toSolar({year:2026,month:13,day:1})).toBeNull();});
});
