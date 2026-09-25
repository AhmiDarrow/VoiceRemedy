import { describe,it,expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { coachText } from './lessons'

describe('bundled offline neural voice',()=>{
  it('ships matching, intact recordings for every spoken script',()=>{
    const manifest=JSON.parse(readFileSync('public/coach/manifest.json','utf8'))
    expect(manifest.voice).toBe('af_heart')
    expect(Object.keys(manifest.clips).sort()).toEqual(Object.keys(coachText).sort())
    for(const [key,text] of Object.entries(coachText)){
      const clip=manifest.clips[key],wav=readFileSync('public/coach/'+key+'.wav')
      expect(clip.text).toBe(text)
      expect(wav.toString('ascii',0,4)).toBe('RIFF')
      expect(wav.toString('ascii',8,12)).toBe('WAVE')
      expect(createHash('sha256').update(wav).digest('hex')).toBe(clip.sha256)
      expect(clip.seconds).toBeGreaterThan(.3)
      expect(clip.seconds).toBeLessThan(110)
    }
    // A spoken readiness cue must finish before the scheduled singing window.
    expect(manifest.clips.getready.seconds).toBeLessThan(2.5)
  })
})
