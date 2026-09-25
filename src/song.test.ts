// @vitest-environment jsdom
import { beforeEach,describe,expect,it } from 'vitest'
import { estimateMelody,importedLesson,loadSongs,saveSongs,startingBounds } from './song'
import { frequency } from './pitch'
import { makePlan } from './coaching'
beforeEach(()=>localStorage.clear())
const notes=[{midi:60,start:0,duration:.5},{midi:62,start:.5,duration:.5},{midi:64,start:1.5,duration:.7}]
describe('offline song lessons',()=>{
  it('estimates a clean synthetic melody with a silent break',()=>{
    const rate=16000, samples=new Float32Array(rate*3)
    for(let i=0;i<samples.length;i++){const t=i/rate;const note=t<.7?60:t<1?null:t<1.7?62:t<2?null:64;samples[i]=note===null?0:.2*Math.sin(2*Math.PI*frequency(note)*t)}
    const found=estimateMelody(samples,rate)
    expect(found.notes.map(n=>n.midi)).toEqual([60,62,64])
    expect(found.notes[1].start).toBeGreaterThan(.9)
  })
  it('does not invent a melody in silence',()=>{expect(estimateMelody(new Float32Array(32000),16000).notes).toEqual([])})
  it('limits work to short sections',()=>{expect(()=>estimateMelody(new Float32Array(16000*13),16000)).toThrow('12 seconds')})
  it('builds an editable transposable lesson with breathing spaces',()=>{
    const song=importedLesson('My song',notes,'one two three',32)
    expect(song.intervals).toEqual([0,2,4]);expect(song.lyrics).toEqual(['one','two','three']);expect(song.phraseBreaks).toEqual([1])
    const plan=makePlan(song.intervals,song.suggestedBase!,'phrase',false,song)
    expect(plan.some(p=>p.kind==='sing'&&p.midi===64)).toBe(true)
  })
  it('requires aligned lyrics and rejects invalid or extremely wide estimates',()=>{
    expect(()=>importedLesson('x',notes,'one',0)).toThrow('one word')
    expect(()=>importedLesson('x',[...notes,{midi:84,start:2,duration:NaN}],'',0)).toThrow('valid')
    expect(()=>importedLesson('x',[{midi:36,start:0,duration:1},{midi:84,start:1,duration:1}],'',0)).toThrow('two octaves')
  })
  it('saves reviewed notes without storing source audio',()=>{
    const song=importedLesson('Saved song',notes,'',0);saveSongs([song]);expect(loadSongs()).toEqual([song])
    expect(localStorage.getItem('voiceremedy.songs.v1')).not.toContain('blob:')
  })
  it('keeps transposed notes inside the detector range',()=>{
    for(const intervals of [[0,24],[0,-24],[0,7,-5]]){
      const b=startingBounds(intervals);expect(b.min).toBeLessThanOrEqual(b.max)
      expect(b.min+Math.min(...intervals)).toBeGreaterThanOrEqual(36)
      expect(b.max+Math.max(...intervals)).toBeLessThanOrEqual(83)
    }
  })
  it('ignores corrupt song storage',()=>{localStorage.setItem('voiceremedy.songs.v1','[{"id":"import-a","intervals":[]}]');expect(loadSongs()).toEqual([])})
})
