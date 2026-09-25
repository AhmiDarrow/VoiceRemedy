// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { openMicrophone, speak, createReferencePlayer, playNotes } from './audio'
import type { Pitch } from './pitch'
import { importedLesson, saveSongs } from './song'
vi.mock('./audio',()=>({openMicrophone:vi.fn(),speak:vi.fn(),createReferencePlayer:vi.fn(),stopPlayback:vi.fn(),playNotes:vi.fn(),microphoneError:(e:Error)=>e.message}))
let root:Root,host:HTMLDivElement
async function click(name:string) { const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===name); expect(button).toBeTruthy(); await act(async()=>button!.click()) }
beforeEach(async()=>{
  vi.clearAllMocks(); localStorage.clear(); vi.useFakeTimers({toFake:['setInterval','clearInterval','setTimeout','clearTimeout','Date','performance']})
  ;(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
  vi.mocked(createReferencePlayer).mockReturnValue({ready:Promise.resolve(),play:vi.fn(),stop:vi.fn()})
  vi.mocked(playNotes).mockReset();vi.mocked(playNotes).mockResolvedValue(undefined)
  vi.mocked(speak).mockResolvedValue(true); vi.mocked(openMicrophone).mockResolvedValue({stop:vi.fn()})
  host=document.createElement('div');document.body.append(host);root=createRoot(host)
  await act(async()=>root.render(createElement(App)))
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers()})
describe('a coach-led lesson',()=>{
  it('guides a beginner to a note and octave before adapting a song first note',async()=>{
    let callback!:(pitch:Pitch)=>void
    vi.mocked(openMicrophone).mockImplementation(async cb=>{callback=cb;return {stop:vi.fn()}})
    await click('Teach me a song');await click('Start Mary Had a Little Lamb')
    await click('Find my note and octave');await click('Find my note')
    expect(speak).toHaveBeenCalledWith('findoctave')
    expect(host.textContent).toContain('Voice check active')
    expect(host.textContent).not.toContain('Microphone off')
    await act(async()=>{for(let i=0;i<56;i++){await vi.advanceTimersByTimeAsync(90);callback({hz:130.8128,level:.2,clarity:.99})}})
    expect(host.textContent).toContain('I heard C3 · octave 3.')
    await click('Use C3')
    expect(host.textContent).toContain('The lesson now starts on that note.')
    expect(JSON.parse(localStorage.getItem('voiceremedy.preferences.v1')!).base).toBe(44)
  })
  it('recognizes an octave below and shifts the next attempt after confirmation',async()=>{
    let callback!:(pitch:Pitch)=>void
    vi.mocked(openMicrophone).mockImplementation(async cb=>{callback=cb;return {stop:vi.fn()}})
    await click('Start my lesson')
    await act(async()=>{for(let ms=90;ms<41000;ms+=90){await vi.advanceTimersByTimeAsync(90);callback({hz:130.8128,level:.2,clarity:.99})}})
    expect(speak).toHaveBeenCalledWith('octavelower')
    expect(host.textContent).toContain('Match my octave')
    await click('Match my octave')
    expect(JSON.parse(localStorage.getItem('voiceremedy.preferences.v1')!).base).toBe(48)
  })
  it('previews a transposed melody without opening the microphone',async()=>{
    await click('A little lower');await click('Hear the melody')
    expect(playNotes).toHaveBeenCalledWith([59],expect.objectContaining({id:'match'}))
    expect(openMicrophone).not.toHaveBeenCalled();expect(speak).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Start my lesson')
  })
  it('ignores a late preview completion after stopping and starting another preview',async()=>{
    let first!:()=>void,second!:()=>void
    vi.mocked(playNotes).mockImplementationOnce(()=>new Promise(r=>{first=r})).mockImplementationOnce(()=>new Promise(r=>{second=r}))
    await click('Hear the melody');await click('Stop melody');await click('Hear the melody')
    await act(async()=>first())
    expect(host.textContent).toContain('Stop melody')
    await act(async()=>second())
    expect(host.textContent).not.toContain('Stop melody');expect(openMicrophone).not.toHaveBeenCalled()
  })
  it('filters the songbook and recovers from an empty search',async()=>{
    await click('Teach me a song')
    const input=host.querySelector<HTMLInputElement>('input[type=search]')!
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!
    await act(async()=>{set.call(input,'zzzz');input.dispatchEvent(new Event('input',{bubbles:true}))})
    expect(host.textContent).toContain('0 songs found')
    await click('Show all songs');expect(host.textContent).toContain('6 songs found')
  })
  it('resumes at the next unpractised song line without calling attempts mastery',async()=>{
    localStorage.setItem('voiceremedy.sessions.v1',JSON.stringify([{id:'prior',date:new Date().toISOString(),exercise:'mary-1',seconds:30,samples:50,accuracy:60,offset:20,steadiness:20,low:60,high:64}]))
    await act(async()=>root.render(createElement(App,{key:'with-history'})))
    await click('Teach me a song')
    expect(host.textContent).toContain('1 of 4 lines practised')
    await click('Continue Mary Had a Little Lamb')
    expect(host.textContent).toContain('Mary Had a Little Lamb · line 2')
  })
  it('recovers from failed melody playback without requesting the microphone',async()=>{
    vi.mocked(playNotes).mockRejectedValueOnce(new Error('Playback unavailable'))
    await click('Hear the melody')
    expect(host.textContent).toContain('Playback unavailable')
    expect(host.textContent).toContain('Start my lesson')
    expect(openMicrophone).not.toHaveBeenCalled()
  })
  it('lets the learner choose connected practice without a score gate',async()=>{
    const select=[...host.querySelectorAll('label')].find(l=>l.textContent?.startsWith('Practice style'))!.querySelector('select')!
    await act(async()=>{select.value='phrase';select.dispatchEvent(new Event('change',{bubbles:true}))})
    expect(JSON.parse(localStorage.getItem('voiceremedy.preferences.v1')!).mode).toBe('phrase')
  })
  it('allows listening without live correction while retaining end-of-round feedback',async()=>{
    const toggle=[...host.querySelectorAll('label')].find(l=>l.textContent?.includes('Show live pitch hints'))!.querySelector('input')!
    await act(async()=>toggle.click())
    let callback!:(pitch:Pitch)=>void
    vi.mocked(openMicrophone).mockImplementation(async cb=>{callback=cb;return {stop:vi.fn()}})
    await click('Start my lesson')
    expect(host.textContent).toContain('Pitch feedback comes after the round.')
    await act(async()=>{for(let ms=90;ms<41000;ms+=90){await vi.advanceTimersByTimeAsync(90);callback({hz:261.625565,level:.2,clarity:.99})}})
    expect(speak).toHaveBeenCalledWith('great')
    expect(host.textContent).toContain('100% of the clear singing')
  })
  it('restores an imported song and uses its bundled coaching voice',async()=>{
    const song=importedLesson('My uploaded song',[{midi:60,start:0,duration:.7},{midi:62,start:1,duration:.7}],'',0)
    saveSongs([song]);localStorage.setItem('voiceremedy.preferences.v1',JSON.stringify({base:60,voice:true,mode:'echo',lessonId:song.id}))
    await act(async()=>root.render(createElement(App,{key:'imported-song'})))
    expect(host.textContent).toContain('My uploaded song')
    await click('Start my lesson');expect(speak).toHaveBeenCalledWith('imported')
    expect(speak).not.toHaveBeenCalledWith(song.id)
  })
  it('lets learners read the instructions before listening when speech is off',async()=>{
    await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Turn voice off"]')!.click())
    await click('Start my lesson')
    expect(openMicrophone).not.toHaveBeenCalled();expect(speak).not.toHaveBeenCalled()
    expect(host.textContent).toContain('I’m ready to sing')
    await click('I’m ready to sing');expect(openMicrophone).toHaveBeenCalledOnce()
    await act(async()=>{await vi.advanceTimersByTimeAsync(4000)})
    expect(createReferencePlayer().play).toHaveBeenCalledWith(84,.1)
  })
  it('offers written instruction if coach audio fails, without opening the microphone',async()=>{
    vi.mocked(speak).mockRejectedValueOnce(new Error('Audio unavailable'))
    await click('Start my lesson')
    expect(host.textContent).toContain('Audio unavailable');expect(host.textContent).toContain('I’m ready to sing')
    expect(openMicrophone).not.toHaveBeenCalled()
    await click('I’m ready to sing');expect(openMicrophone).toHaveBeenCalledOnce()
  })
  it('turns a failed start chime into a recoverable error and releases the microphone',async()=>{
    const stop=vi.fn()
    vi.mocked(openMicrophone).mockResolvedValueOnce({stop})
    vi.mocked(createReferencePlayer).mockReturnValue({ready:Promise.resolve(),stop:vi.fn(),play:vi.fn(midi=>{if(midi===84)throw new Error('Audio interrupted')})})
    await click('Start my lesson')
    await act(async()=>{await vi.advanceTimersByTimeAsync(5500)})
    expect(stop).toHaveBeenCalledOnce();expect(host.textContent).toContain('Audio interrupted')
    expect(host.textContent).toContain('Resume with my coach')
  })
  it('discards old feedback when the starting note changes',async()=>{
    await click('Start my lesson');await act(async()=>{await vi.advanceTimersByTimeAsync(41000)})
    expect(host.textContent).toContain('Here’s what I heard.')
    await act(async()=>{const select=host.querySelector('select')!;select.value='57';select.dispatchEvent(new Event('change',{bubbles:true}))})
    expect(host.textContent).not.toContain('Here’s what I heard.');expect(host.textContent).toContain('Start my lesson')
  })
  it('starts spoken teaching before automatically opening the singing turn',async()=>{
    let resolve!:(value:boolean)=>void
    vi.mocked(speak).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
    await click('Start my lesson')
    expect(speak).toHaveBeenCalledWith('match'); expect(openMicrophone).not.toHaveBeenCalled()
    await act(async()=>resolve(true))
    expect(openMicrophone).toHaveBeenCalledOnce();expect(host.textContent).toContain('Pause session')
  })
  it('does not start listening when an interrupted spoken lesson finishes late',async()=>{
    let resolve!:(value:boolean)=>void
    vi.mocked(speak).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
    await click('Start my lesson');await click('Pause session')
    await act(async()=>resolve(true))
    expect(openMicrophone).not.toHaveBeenCalled();expect(host.textContent).toContain('Resume with my coach')
  })
  it('releases a microphone granted after a pause',async()=>{
    let resolve!:(value:{stop:()=>void})=>void;const stop=vi.fn()
    vi.mocked(openMicrophone).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
    await click('Start my lesson');await click('Pause session')
    await act(async()=>resolve({stop}))
    expect(stop).toHaveBeenCalledOnce()
  })
  it('offers useful spoken feedback on silence after the planned turns',async()=>{
    await click('Start my lesson')
    await act(async()=>{await vi.advanceTimersByTimeAsync(41000)})
    expect(speak).toHaveBeenCalledWith('getready');expect(speak).toHaveBeenCalledWith('no-signal')
    expect(host.textContent).toContain('Help me find my note');expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
  })
  it('offers familiar songs and begins the selected line with spoken teaching',async()=>{
    await click('Teach me a song');expect(host.textContent).toContain('Twinkle, Twinkle, Little Star')
    await click('Line 1 of 4');await click('Start my lesson')
    expect(speak).toHaveBeenCalledWith('mary')
    expect(host.textContent).toContain('Mary Had a Little Lamb · line 1')
  })
  it('starts a whole verse in connected phrase mode',async()=>{
    await click('Teach me a song');await click('Sing whole verse');await click('Start my lesson')
    expect(speak).toHaveBeenCalledWith('songverse')
    expect(JSON.parse(localStorage.getItem('voiceremedy.preferences.v1')!).mode).toBe('phrase')
  })
  it('listens, gives feedback, then teaches the next step with a single tap',async()=>{
    let callback!:(pitch:Pitch)=>void
    vi.mocked(openMicrophone).mockImplementation(async cb=>{callback=cb;return {stop:vi.fn()}})
    await click('Start my lesson')
    await act(async()=>{ for(let ms=90;ms<41000;ms+=90) {await vi.advanceTimersByTimeAsync(90);callback({hz:261.625565,level:.2,clarity:.99})} })
    expect(speak).toHaveBeenCalledWith('great')
    expect(host.textContent).toContain('Here’s what I heard.')
    await click('What’s next?')
    expect(speak).toHaveBeenCalledWith('hold');expect(openMicrophone).toHaveBeenCalledTimes(2)
  })
  it('never scores a spoken cue even if playback finishes late',async()=>{
    let callback!:(pitch:Pitch)=>void
    vi.mocked(speak).mockImplementation(key=>key==='getready'?new Promise(()=>{}):Promise.resolve(true))
    vi.mocked(openMicrophone).mockImplementation(async cb=>{callback=cb;return {stop:vi.fn()}})
    await click('Start my lesson')
    await act(async()=>{ for(let ms=90;ms<41000;ms+=90) {await vi.advanceTimersByTimeAsync(90);callback({hz:261.625565,level:.2,clarity:.99})} })
    expect(speak).toHaveBeenCalledWith('no-signal');expect(localStorage.getItem('voiceremedy.sessions.v1')).toBeNull()
  })
})
