// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPreferences, loadResults, savePreferences } from './storage'
beforeEach(() => localStorage.clear())
describe('durable local progress', () => {
  it('remembers the choice to practise without live hints',()=>{
    savePreferences({base:60,voice:true,gentle:false,mode:'echo',liveHints:false})
    expect(loadPreferences().liveHints).toBe(false)
  })
  it('remembers the lesson and phrase mode for the next visit', () => {
    savePreferences({base:60,voice:true,gentle:false,mode:'phrase',lessonId:'song'})
    expect(loadPreferences().lessonId).toBe('song');expect(loadPreferences().mode).toBe('phrase')
  })
  it('recovers safely from damaged storage', () => {
    localStorage.setItem('voiceremedy.sessions.v1','{broken')
    localStorage.setItem('voiceremedy.preferences.v1','{broken')
    expect(loadResults()).toEqual([]); expect(loadPreferences().base).toBe(60)
  })
  it('preserves the chosen pace and comfortable note', () => {
    savePreferences({base:57,voice:false,gentle:true,mode:'phrase'})
    expect(loadPreferences()).toEqual({base:57,voice:false,gentle:true,mode:'phrase'})
  })
  it('ignores impossible stored scores without discarding valid older history', () => {
    const result = {id:'a',date:'2026-09-24T12:00:00Z',exercise:'match',seconds:30,samples:50,accuracy:80,offset:5,steadiness:10,low:60,high:60}
    localStorage.setItem('voiceremedy.sessions.v1',JSON.stringify([result,{...result,id:'b',accuracy:200},{...result,id:'c',participation:4}]))
    expect(loadResults()).toEqual([result])
  })
})
