from pathlib import Path
from urllib.request import urlretrieve
root=Path(".voice-models")
base="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
for name in ["kokoro-v1.0.onnx","voices-v1.0.bin"]:
    path=root/name
    if not path.exists():
        print("Downloading "+name,flush=True)
        urlretrieve(base+name,path.with_suffix(path.suffix+".part"))
        path.with_suffix(path.suffix+".part").replace(path)
    print(name, path.stat().st_size,flush=True)
