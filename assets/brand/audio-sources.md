# Brand-page audio

## Current alarm

`missile-alert-original-light.wav` restores the actual source recording.
It mixes 80% untouched audio with 20% phase-preserving spectral cleanup.
The final mix can attenuate a frequency by no more than 4%; a generator check
limits the RMS processing difference to under 1.5%. This preserves the timbre,
transients and dynamics; it deliberately does not remove all background voices.
The mix is attenuated to 68% and played at 0.6 volume. The original four
675 ms sound-on windows still drive the warning from the audio playhead.
No synthesized tones, added impacts or saturation remain in this version.

Source: Missile Alert by BOMB SIREN, CC BY 3.0.
https://soundbible.com/2056-Missile-Alert.html
https://soundbible.com/mp3/BOMB_SIREN-BOMB_SIREN-247265934.mp3
The retained source loop is the 4.2–8.2 second segment with edge fades.
Attribution and modifications are also listed on the site's Credits page.

## Current pronunciations

All four `*-emma.wav` clips use Kokoro v1.0 (82M), bf_emma at 0.95 speed,
via kokoro-onnx 0.6.1. This is the same British voice for every name.
Each is one continuous utterance, with explicit phonemes and no syllable joins:

- `seriaura-emma.wav`: /ˌsɛɹiˈɔːɹə/
- `siriaura-emma.wav`: /ˌsɪɹiˈɔːɹə/
- `ser-eye-aura-emma.wav`: /sɜːɹˈaɪˌɔːɹə/
- `sewiauwa-emma.wav`: /ˌsɛwiˈɔːwə/

Seriaura and Sewiauwa differ only in the two ɹ → w phonemes.
All files play locally without a live speech service.

Model: https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0)
Runtime: https://github.com/thewh1teagle/kokoro-onnx (MIT)
