import { useEffect, useRef, useState } from 'react'
import { importedLesson, type SongNote, type SongEstimate } from './song'
import { noteName } from './pitch'
import type { Lesson } from './course'
import { stopPlayback } from './audio'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { formatInteger, localizeKnown } from './i18n/translate'
import { useI18n } from './i18n/useI18n'

export function SongImport({onChoose,onClose,open}:{onChoose:(lesson:Lesson)=>void;onClose:()=>void;open:boolean}) {
  const { t } = useI18n()
  const [title,setTitle]=useState(''),[buffer,setBuffer]=useState<AudioBuffer|null>(null),[start,setStart]=useState(0),[length,setLength]=useState(8)
  const [notes,setNotes]=useState<SongNote[]>([]),[words,setWords]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[estimated,setEstimated]=useState(false)
  const token=useRef(0),worker=useRef<Worker|null>(null),audio=useRef<HTMLAudioElement|null>(null),url=useRef(''),stopTimer=useRef(0),timeout=useRef(0)
  const previewToken=useRef(0),previewPending=useRef(false),sectionSpan=useRef(8)
  const stamp=(seconds:number)=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')
  function retireWorker(){token.current++;if(worker.current){worker.current.onmessage=null;worker.current.onerror=null;worker.current.terminate();worker.current=null};clearTimeout(timeout.current);setBusy(false)}
  function stopPreview(){previewToken.current++;previewPending.current=false;clearTimeout(stopTimer.current);if(audio.current){audio.current.onended=null;audio.current.pause()};setPlaying(false)}
  function cancel(){retireWorker();stopPreview()}
  useEffect(()=>{if(!open)cancel()},[open])
  useEffect(()=>{
    const hide=()=>{if(document.hidden)cancel()};document.addEventListener('visibilitychange',hide)
    const listener=Capacitor.isNativePlatform()?NativeApp.addListener('appStateChange',s=>{if(!s.isActive)cancel()}):null
    return()=>{cancel();if(url.current)URL.revokeObjectURL(url.current);document.removeEventListener('visibilitychange',hide);void listener?.then(l=>l.remove())}
  },[])
  async function load(file:File){
    cancel();if(url.current){URL.revokeObjectURL(url.current);url.current=''};audio.current=null;const gen=token.current;setBuffer(null);setNotes([]);setWords('');setEstimated(false);setError('')
    if(file.size>15*1024*1024){setError('Choose an audio file smaller than 15 MB.');return}
    timeout.current=window.setTimeout(()=>{if(gen===token.current){cancel();setError('Opening this file took too long. Try a smaller WAV or MP3 file.')}},30000)
    setBusy(true);setTitle(file.name.replace(/\.[^.]+$/,''))
    try {
      const data=await file.arrayBuffer();if(gen!==token.current)return
      const decoded=await new OfflineAudioContext(1,1,16000).decodeAudioData(data)
      if(gen!==token.current)return
      if(decoded.duration<1||decoded.duration>600)throw new Error('Choose a song between 1 second and 10 minutes long.')
      if(url.current)URL.revokeObjectURL(url.current)
      url.current=URL.createObjectURL(file);audio.current=new Audio(url.current)
      setBuffer(decoded);setStart(0);sectionSpan.current=Math.min(8,decoded.duration);setLength(sectionSpan.current)
    }catch(e){if(gen===token.current)setError(e instanceof Error?e.message:'This audio format could not be opened. Try a WAV or MP3 file.')}
    finally{if(gen===token.current){clearTimeout(timeout.current);setBusy(false)}}
  }
  function clearEstimate(){stopPreview();setNotes([]);setWords('');setEstimated(false);setError('')}
  async function preview(){
    if(!audio.current)return
    if(playing||previewPending.current){stopPreview();return}
    stopPlayback();previewPending.current=true;setPlaying(true);setError('');const gen=++previewToken.current,player=audio.current
    try {player.currentTime=start;await player.play();if(gen!==previewToken.current)return;previewPending.current=false;stopTimer.current=window.setTimeout(stopPreview,length*1000);player.onended=stopPreview}
    catch{if(gen===previewToken.current){stopPreview();setError('The section could not play. Try a WAV or MP3 file.')}}
  }
  function analyse(){
    if(!buffer||busy)return
    stopPreview();const gen=++token.current;setBusy(true);setError('');setNotes([]);setWords('');setEstimated(false)
    const from=Math.floor(start*buffer.sampleRate),count=Math.min(Math.floor(length*buffer.sampleRate),buffer.length-from),samples=new Float32Array(count)
    // Use the strongest channel: averaging can cancel a centered vocal in phase-inverted recordings.
    let channel=0,energy=-1
    for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);let e=0;for(let i=from;i<from+count;i+=16)e+=data[i]*data[i];if(e>energy){channel=c;energy=e}}
    samples.set(buffer.getChannelData(channel).subarray(from,from+count))
    try {
      const job=new Worker(new URL('./song.worker.ts',import.meta.url),{type:'module'});worker.current=job
      const finish=retireWorker
      job.onmessage=(e:MessageEvent<{result?:SongEstimate;error?:string}>)=>{if(gen!==token.current)return;finish();if(e.data.error){setError(e.data.error);return}const result=e.data.result;if(!result||!Array.isArray(result.notes)||!Number.isFinite(result.clarity)){setError('The melody could not be analysed. You can add notes yourself.');return}setEstimated(true);if(result.notes.length>32){setError('There are too many note changes. Choose a shorter or clearer section.');return}setNotes(result.notes);if(!result.notes.length||result.clarity<.3)setError('The melody is not clear enough. Try a section with one clear singing voice, or add the notes yourself.')}
      job.onerror=()=>{if(gen!==token.current)return;finish();setError('The melody could not be analysed. You can add notes yourself.')}
      timeout.current=window.setTimeout(()=>{if(gen===token.current){finish();setError('Analysis took too long. Choose a shorter section.')}},30000)
      job.postMessage({samples,rate:buffer.sampleRate},[samples.buffer])
    }catch{retireWorker();setError('Analysis is unavailable here. You can add the notes yourself.')}
  }
  function moveSection(direction:number){if(!buffer)return;clearEstimate();const next=Math.max(0,Math.min(buffer.duration-1,start+direction*sectionSpan.current));setStart(next);setLength(Math.min(sectionSpan.current,buffer.duration-next))}
  function clearSong(){cancel();if(url.current)URL.revokeObjectURL(url.current);url.current='';audio.current=null;setBuffer(null);setTitle('');setNotes([]);setWords('');setEstimated(false);setError('')}
  return <section className="song-import" aria-labelledby="song-import-title"><div className="import-heading"><h2 id="song-import-title">{t('import.title')}</h2><button className="coach-secondary" onClick={onClose}>{t('import.close')}</button></div><p>{t('import.lead')}</p>
    <label className="song-file">{t('import.choose')} <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void load(f)}}/></label><p className="import-hint">{t('import.formats')}</p>
    {busy&&<div role="status">{t('import.working')} <button className="coach-secondary" onClick={cancel}>{t('import.cancel')}</button></div>}
    {error&&<p className="coach-error" role="alert">{localizeKnown(error)}</p>}
    {buffer&&!busy&&<><label>{t('import.name')}<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><p className="import-hint">{t('import.section',{start:stamp(start),end:stamp(start+length),total:stamp(buffer.duration)})}</p><div className="import-actions"><button className="coach-secondary" disabled={start===0} onClick={()=>moveSection(-1)}>{t('import.prev')}</button><button className="coach-secondary" disabled={start+length>=buffer.duration} onClick={()=>moveSection(1)}>{t('import.next')}</button><button className="coach-secondary" onClick={clearSong}>{t('import.clear')}</button></div><div className="section-pickers"><label>{t('import.start')}<input type="number" min={0} max={Math.max(0,buffer.duration-1)} step={.5} value={start} onChange={e=>{clearEstimate();const v=Math.max(0,Math.min(buffer.duration-1,Number(e.target.value)||0));setStart(v);setLength(Math.min(sectionSpan.current,buffer.duration-v))}}/></label><label>{t('import.length')}<input type="number" min={1} max={Math.min(12,buffer.duration-start)} step={.5} value={length} onChange={e=>{clearEstimate();sectionSpan.current=Math.max(1,Math.min(12,buffer.duration-start,Number(e.target.value)||1));setLength(sectionSpan.current)}}/></label></div><div className="import-actions"><button className="coach-secondary" onClick={()=>void preview()}>{playing?t('import.stop'):t('import.hear')}</button><button className="coach-primary" onClick={analyse}>{t('import.find')}</button></div>
    <p className="import-hint">{t('import.estimate')}</p>
    {(estimated||notes.length>0)&&<h3>{t('import.review')}</h3>}<div className="import-notes">{notes.map((n,i)=><div key={i}><span>{t('import.note',{n:formatInteger(i+1)})}</span><select aria-label={t('import.pitch',{n:formatInteger(i+1)})} value={n.midi} onChange={e=>setNotes(all=>all.map((v,k)=>k===i?{...v,midi:Number(e.target.value)}:v))}>{Array.from({length:49},(_,k)=>k+36).map(m=><option key={m} value={m}>{noteName(m)}</option>)}</select><button aria-label={t('import.removeLabel',{n:formatInteger(i+1)})} onClick={()=>{setNotes(all=>all.filter((_,k)=>k!==i));setWords('')}}>{t('import.remove')}</button></div>)}</div>
    <button className="coach-secondary" disabled={notes.length>=32} onClick={()=>{setWords('');setNotes(all=>[...all,{midi:all[all.length-1]?.midi??60,start:all.length?all[all.length-1].start+all[all.length-1].duration:0,duration:.7}])}}>{t('import.add')}</button>
    {notes.length>0&&<><label>{t('import.words')}<input value={words} maxLength={500} onChange={e=>setWords(e.target.value)} placeholder={t('import.placeholder')}/></label><p className="import-hint">{t('import.count',{notes:formatInteger(notes.length),words:formatInteger(words.trim()?words.trim().split(/\s+/).length:0)})}</p><p className="import-hint">{t('import.saved')}</p><button className="coach-primary" onClick={()=>{try{const lesson=importedLesson(title,notes,words,start);stopPreview();onChoose(lesson)}catch(e){setError(e instanceof Error?e.message:'Check your notes.')}}}>{t('import.teach')}</button></>}
    </>}
  </section>
}
