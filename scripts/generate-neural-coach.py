"""Render bundled neural speech silently; no audio device or service is used.

Setup: uv venv .voice-env --python 3.12
uv pip install --python .voice-env/Scripts/python.exe kokoro-onnx==0.6.1 soundfile==0.14.0
Run download-voice-models.py first, then this script with that Python.
"""
import hashlib
import json
import re
from pathlib import Path
import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
model = ROOT / '.voice-models/kokoro-v1.0.onnx'
voices = ROOT / '.voice-models/voices-v1.0.bin'
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider'])
engine = Kokoro.from_session(session, str(voices))
source = (ROOT / 'src/lessons.ts').read_text(encoding='utf-8').split('export const coachText', 1)[1]
entries = re.findall(r"^\s+(?:'([^']+)'|(\w+)): '([^']*)',?$", source, re.M)
stage = ROOT / '.voice-models/rendered'
stage.mkdir(exist_ok=True)
manifest = {'engine':'Kokoro-82M v1.0', 'voice':'af_heart', 'speed':0.94, 'clips':{}}
previous_path = ROOT / 'public/coach/manifest.json'
previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
for quoted, plain, text in entries:
    key = quoted or plain
    existing = ROOT / 'public/coach' / (key+'.wav')
    old = previous.get('clips', {}).get(key, {})
    if all(previous.get(k)==manifest[k] for k in ('engine','voice','speed')) and old.get('text')==text and existing.exists() and hashlib.sha256(existing.read_bytes()).hexdigest()==old.get('sha256'):
        manifest['clips'][key] = old
        (stage / existing.name).write_bytes(existing.read_bytes())
        print('Unchanged: '+key, flush=True)
        continue
    # Spell sung vowels so the speech engine pronounces the intended sound.
    spoken = re.sub(r'\boo\b', 'ooh', text)
    samples, rate = engine.create(spoken, voice='af_heart', speed=0.94, lang='en-us')
    samples = np.asarray(samples, dtype=np.float32)
    if not np.isfinite(samples).all() or len(samples) < rate * .3 or np.max(np.abs(samples)) < .01:
        raise ValueError('Invalid audio: '+key)
    peak = float(np.max(np.abs(samples)))
    samples *= min(1.5, .89 / peak)
    path = stage / (key+'.wav')
    sf.write(path, samples, rate, subtype='PCM_16')
    duration = len(samples)/rate
    if duration > 110:
        raise ValueError('Clip exceeds player timeout: '+key)
    manifest['clips'][key] = {'seconds':round(duration,3),'text':text,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    print(key+': '+str(round(duration,2))+' seconds', flush=True)
# Publish only after every clip succeeds, so failed generation preserves the old set.
for key in manifest['clips']:
    path = stage / (key+'.wav')
    (ROOT / 'public/coach' / path.name).write_bytes(path.read_bytes())
(ROOT / 'public/coach/manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Published '+str(len(entries))+' neural coach clips.',flush=True)
