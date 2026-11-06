"""Rebuild local brand audio. Speech requires the ignored .tooling/phoneme-tts install."""
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tooling/phoneme-tts'))
import numpy as np


def alarm():
    import subprocess
    source = ROOT / 'assets/brand/missile-alert-loop.mp3'
    decoded = ROOT / '.preview-refresh/missile-original.f32'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),
                    '-ac','1','-ar','24000','-f','f32le',str(decoded)],check=True)
    rate=24000
    recording=np.fromfile(decoded,dtype='<f4').astype(float)
    # Phase-preserving cleanup with a strict attenuation floor. The final dry/wet
    # mix can attenuate any frequency by at most 4%, retaining the original punch.
    size,hop=2048,256
    window=np.hanning(size)
    padded=np.pad(recording,(size,size))
    starts=list(range(0,len(padded)-size+1,hop))
    spectra=np.array([np.fft.rfft(padded[start:start+size]*window) for start in starts])
    times=(np.array(starts)+size/2-size)/rate
    quiet=(times>=0)&(times<4)&(times%1>.76)&(times%1<.94)
    noise=np.median(abs(spectra[quiet]),axis=0)
    gain=np.clip(1-noise/(abs(spectra)+1e-9),.8,1)
    restored=np.zeros_like(padded);weight=np.zeros_like(padded)
    for start,frame in zip(starts,np.fft.irfft(spectra*gain,n=size)):
        restored[start:start+size]+=frame*window
        weight[start:start+size]+=window**2
    cleaned=(restored/np.maximum(weight,1e-9))[size:size+len(recording)]
    sound=(recording*.8+cleaned*.2)*.68
    output=ROOT / 'assets/brand/missile-alert-original-light.wav'
    with wave.open(str(output),'wb') as wav:
        wav.setparams((1,2,rate,len(sound),'NONE','not compressed'))
        wav.writeframes((np.clip(sound,-1,1)*32767).astype('<i2').tobytes())
    difference=np.sqrt(np.mean((sound-recording*.68)**2))/np.sqrt(np.mean((recording*.68)**2))
    assert difference<.015,'Cleanup must remain extremely close to the original'
    print(f'{output.name}: original recording, {difference*100:.3f}% RMS processing difference, lower volume')


def names():
    from kokoro_onnx import Kokoro
    import soundfile as sf
    folder = ROOT / '.tooling/phoneme-tts'
    engine = Kokoro(str(folder / 'kokoro-v1.0.onnx'), str(folder / 'voices-v1.0.bin'))
    base = 'ˌsɛɹiˈɔːɹə'
    voice = 'bf_emma'
    assert voice in engine.get_voices()
    for name, phonemes in [('seriaura', base), ('siriaura', 'ˌsɪɹiˈɔːɹə'), ('ser-eye-aura', 'sɜːɹˈaɪˌɔːɹə'), ('sewiauwa', base.replace('ɹ', 'w'))]:
        assert engine.tokenizer.known(phonemes) == phonemes
        samples, rate = engine.create(phonemes, voice=voice, speed=.95, lang='en-gb', is_phonemes=True)
        # Every name uses one continuous inference and exactly the same voice and settings.
        output = ROOT / f'assets/brand/{name}-emma.wav'
        sf.write(str(output), samples, rate, subtype='PCM_16')
        print(f'{output.name}: {len(samples) / rate:.2f} seconds, {phonemes}')


if __name__ == '__main__':
    alarm()
    names()
