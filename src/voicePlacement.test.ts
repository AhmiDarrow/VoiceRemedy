import { describe,it,expect } from 'vitest'
import { placeStartingNote,octaveAdjustment,octaveNumber } from './voicePlacement'
import type { SingingResult } from './coaching'
const result=(offset:number):SingingResult=>({id:'a',date:new Date().toISOString(),exercise:'three',seconds:30,samples:100,accuracy:0,offset,steadiness:10,low:48,high:52,base:60,mode:'echo',gentle:false,coverage:1,participation:.8,voicedSeconds:9,notes:[0,1,2].map(step=>({step,midi:60+step*2,samples:33,accuracy:0,offset}))})
describe('octave-aware voice placement',()=>{
  it('names octaves at the C boundary',()=>{expect(octaveNumber(59)).toBe(3);expect(octaveNumber(60)).toBe(4);expect(octaveNumber(48)).toBe(3)})
  it('anchors the first sung note, even when the song starts above its key note',()=>{
    expect(placeStartingNote(48,[4,2,0])).toEqual({base:44,first:48,exact:true})
    expect(placeStartingNote(43,[0,2,4])).toEqual({base:43,first:43,exact:true})
  })
  it('reports when the full melody cannot fit the detected starting note',()=>{
    expect(placeStartingNote(80,[0,12])).toEqual({base:71,first:71,exact:false})
  })
  it('offers a full-octave adjustment only with consistent sufficient evidence',()=>{
    expect(octaveAdjustment(result(-1200),[0,2,4])).toBe(48)
    expect(octaveAdjustment(result(1200),[0,2,4])).toBe(72)
    expect(octaveAdjustment(result(800),[0,2,4])).toBeNull()
    const mixed=result(-1200);mixed.notes[1].offset=0
    expect(octaveAdjustment(mixed,[0,2,4])).toBeNull()
    expect(octaveAdjustment({...result(-1200),samples:10},[0,2,4])).toBeNull()
    expect(octaveAdjustment({...result(1200),base:76},[0,2,4])).toBeNull()
  })
})
