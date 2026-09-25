// @vitest-environment jsdom
import {act,createElement} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {SongImport} from './SongImport'
import type {Lesson} from './course'
vi.mock('./audio',()=>({stopPlayback:vi.fn()}))
let host:HTMLDivElement,root:Root,onChoose:ReturnType<typeof vi.fn<(lesson:Lesson)=>void>>,onClose:ReturnType<typeof vi.fn<()=>void>>,resolveDecode:((value:unknown)=>void)|undefined
class SilentPlayer{pause=vi.fn();play=vi.fn(()=>Promise.resolve());currentTime=0;onended=null;constructor(_:string){}}
const decoded={duration:20,sampleRate:16000,length:320000,numberOfChannels:1,getChannelData:()=>new Float32Array(320000)}
class TestWorker{
  static instances:TestWorker[]=[]
  static auto=true
  onmessage:((e:unknown)=>void)|null=null;onerror=null;terminate=vi.fn()
  postMessage=vi.fn(()=>{if(TestWorker.auto)queueMicrotask(()=>this.onmessage?.({data:{result:{clarity:1,notes:[{midi:60,start:0,duration:.5},{midi:62,start:.5,duration:.5}]}}}))})
  constructor(){TestWorker.instances.push(this)}
}
async function click(text:string){const b=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(b).toBeTruthy();await act(async()=>b!.click())}
async function upload(size=100){await act(async()=>{const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[{name:'My song.wav',size,arrayBuffer:async()=>new ArrayBuffer(4)}]});input.dispatchEvent(new Event('change',{bubbles:true}))})}
beforeEach(async()=>{
  ;(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
  onChoose=vi.fn();onClose=vi.fn();resolveDecode=undefined;TestWorker.instances=[];TestWorker.auto=true
  vi.stubGlobal('OfflineAudioContext',class{decodeAudioData=vi.fn(()=>Promise.resolve(decoded))})
  vi.stubGlobal('Audio',SilentPlayer);vi.stubGlobal('Worker',TestWorker)
  vi.stubGlobal('URL',Object.assign(class extends URL {},{createObjectURL:vi.fn(()=>'blob:test'),revokeObjectURL:vi.fn()}))
  host=document.createElement('div');document.body.append(host);root=createRoot(host)
  await act(async()=>root.render(createElement(SongImport,{onChoose,onClose,open:true})))
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.unstubAllGlobals()})
describe('song import with silent test doubles',()=>{
  it('retires timed-out analysis and ignores queued results',async()=>{
    vi.useFakeTimers();TestWorker.auto=false
    await upload();await click('Find the melody')
    const job=TestWorker.instances[0],late=job.onmessage!
    await act(async()=>vi.advanceTimersByTime(30000))
    expect(host.textContent).toContain('Analysis took too long')
    await act(async()=>late({data:{result:{clarity:1,notes:[{midi:60,start:0,duration:1}]}}}))
    expect(host.textContent).not.toContain('Teach me this melody')
    expect(job.terminate).toHaveBeenCalledOnce();expect(job.onmessage).toBeNull()
  })
  it('recovers from a stalled decoder and ignores its late result',async()=>{
    vi.useFakeTimers()
    vi.stubGlobal('OfflineAudioContext',class{decodeAudioData=()=>new Promise(r=>{resolveDecode=r})})
    await upload();await act(async()=>vi.advanceTimersByTime(30000))
    expect(host.textContent).toContain('Opening this file took too long')
    await act(async()=>resolveDecode!(decoded))
    expect(host.textContent).not.toContain('Hear this section')
  })
  it('moves through sections and releases temporary audio',async()=>{
    await upload();await click('Find the melody');await click('Next section')
    expect(host.textContent).toContain('Section 0:08–0:16 of 0:20')
    expect(host.textContent).not.toContain('Teach me this melody')
    await click('Next section')
    expect(host.textContent).toContain('Section 0:16–0:20 of 0:20')
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Next section')?.disabled).toBe(true)
    await click('Previous section')
    expect(host.textContent).toContain('Section 0:08–0:16 of 0:20')
    await click('Clear song')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(host.textContent).not.toContain('Hear this section')
  })
  it('does not let a stale preview promise stop its replacement',async()=>{
    const resolves:Array<()=>void>=[],pause=vi.fn()
    vi.stubGlobal('Audio',class{currentTime=0;onended=null;pause=pause;play=()=>new Promise<void>(r=>resolves.push(r))})
    await upload();await click('Hear this section');await click('Stop section');await click('Hear this section')
    pause.mockClear();await act(async()=>resolves[0]())
    expect(pause).not.toHaveBeenCalled()
    await act(async()=>resolves[1]())
    expect(host.textContent).toContain('Stop section')
  })
  it('cleans up the worker if transferring audio fails',async()=>{
    vi.stubGlobal('Worker',class extends TestWorker{postMessage=vi.fn(()=>{throw new Error('Transfer failed')})})
    await upload();await click('Find the melody')
    expect(host.textContent).toContain('Analysis is unavailable')
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce()
    expect(host.textContent).not.toContain('Working on your song')
  })
  it('decodes, analyses, reviews, and hands a song lesson to the coach',async()=>{
    await upload();expect(host.textContent).toContain('Hear this section')
    await click('Find the melody');expect(host.textContent).toContain('Review your practice melody')
    await click('Teach me this melody')
    const lesson=onChoose.mock.calls[0][0] as Lesson
    expect(lesson.title).toBe('My song');expect(lesson.intervals).toEqual([0,2]);expect(lesson.coachKey).toBe('imported')
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })
  it('rejects oversize files before decoding',async()=>{await upload(16*1024*1024);expect(host.textContent).toContain('smaller than 15 MB');expect(host.textContent).not.toContain('Hear this section')})
  it('ignores a decode result after cancellation',async()=>{
    vi.stubGlobal('OfflineAudioContext',class{decodeAudioData=()=>new Promise(r=>{resolveDecode=r})})
    await upload();await click('Cancel');await act(async()=>resolveDecode!(decoded))
    expect(host.textContent).not.toContain('Hear this section')
  })
  it('cancels analysis when the coach hides the importer',async()=>{
    TestWorker.auto=false
    await upload();await click('Find the melody')
    const worker=TestWorker.instances[0]
    expect(worker.terminate).not.toHaveBeenCalled()
    await act(async()=>root.render(createElement(SongImport,{onChoose,onClose,open:false})))
    expect(worker.terminate).toHaveBeenCalledOnce()
    await act(async()=>worker.onmessage?.({data:{result:{clarity:1,notes:[{midi:60,start:0,duration:1}]}}}))
    expect(onChoose).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Teach me this melody')
  })
})
