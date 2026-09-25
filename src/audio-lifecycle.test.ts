// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak, stopPlayback, openMicrophone, playNotes } from './audio'
class SilentAudio {
  static instances: SilentAudio[] = []
  onended: (()=>void)|null = null
  onerror: (()=>void)|null = null
  play = vi.fn(()=>Promise.resolve())
  pause = vi.fn()
  removeAttribute = vi.fn()
  constructor(public src:string) { SilentAudio.instances.push(this) }
}
beforeEach(()=>{vi.useFakeTimers();SilentAudio.instances=[];vi.stubGlobal('Audio',SilentAudio)})
afterEach(()=>{stopPlayback();vi.useRealTimers();vi.unstubAllGlobals()})
describe('offline speech lifecycle without sound hardware',()=>{
  it('releases the preview audio context when startup fails',async()=>{
    const close=vi.fn(async()=>{})
    vi.stubGlobal('AudioContext',class{close=close;resume=async()=>{throw new Error('Audio blocked')}})
    await expect(playNotes([60])).rejects.toThrow('Audio blocked')
    expect(close).toHaveBeenCalledOnce()
    stopPlayback();expect(close).toHaveBeenCalledOnce()
  })
  it('releases an acquired microphone when audio startup hangs and the user cancels',async()=>{
    const track={stop:vi.fn()}, resume=vi.fn(()=>new Promise<void>(()=>{})), close=vi.fn(()=>Promise.resolve())
    vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn(async()=>({getTracks:()=>[track]}))}})
    vi.stubGlobal('AudioContext',class {resume=resume;close=close})
    const controller=new AbortController()
    const opening=openMicrophone(vi.fn(),vi.fn(),controller.signal)
    const rejected=expect(opening).rejects.toMatchObject({name:'AbortError'})
    await Promise.resolve();expect(resume).toHaveBeenCalledOnce();controller.abort();await rejected
    expect(track.stop).toHaveBeenCalled();expect(close).toHaveBeenCalledOnce()
  })
  it('stops a stream granted after its request was cancelled',async()=>{
    const track={stop:vi.fn()};let grant!:(s:unknown)=>void
    vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn(()=>new Promise(r=>{grant=r}))}})
    const controller=new AbortController(), opening=openMicrophone(vi.fn(),vi.fn(),controller.signal)
    const rejected=expect(opening).rejects.toMatchObject({name:'AbortError'})
    controller.abort();grant({getTracks:()=>[track]});await rejected;expect(track.stop).toHaveBeenCalledOnce()
  })
  it('releases media when playback ends',async()=>{
    const done=speak('match'), audio=SilentAudio.instances[0]
    audio.onended!();expect(await done).toBe(true)
    expect(audio.pause).toHaveBeenCalledOnce();expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('settles interrupted speech and protects a later clip from stale events',async()=>{
    const first=speak('match'), old=SilentAudio.instances[0], staleEnd=old.onended!
    const second=speak('hold'), current=SilentAudio.instances[1]
    expect(await first).toBe(false);staleEnd();expect(current.pause).not.toHaveBeenCalled()
    current.onended!();expect(await second).toBe(true)
  })
  it('cleans up failed playback',async()=>{
    const done=speak('match'), audio=SilentAudio.instances[0]
    const rejection=expect(done).rejects.toThrow('could not play')
    audio.onerror!();await rejection;expect(audio.onended).toBeNull();expect(vi.getTimerCount()).toBe(0)
  })
  it('does not leave the coach stuck speaking forever',async()=>{
    const done=speak('match'), rejection=expect(done).rejects.toThrow('stopped responding')
    await vi.advanceTimersByTimeAsync(120000);await rejection
    expect(SilentAudio.instances[0].pause).toHaveBeenCalledOnce()
  })
})
