# VoiceRemedy 0.5.0

## Familiar songs
- Mary Had a Little Lamb: four line lessons and the whole first verse.
- Twinkle, Twinkle, Little Star: six line lessons and the whole first verse.
- Syllable highlighting, reference melodies, echo-to-phrase progression, and breathing spaces.
- Whole verses begin in phrase mode. Difficult verses lead back to the weakest measured line.
- Traditional public-domain material in original teaching arrangements; no commercial recordings.

## Neural female narration
Replaced all 26 coach clips with Kokoro-82M af_heart speech, rendered locally at a relaxed pace with peak headroom. The finished recordings ship in both installers, with no inference runtime or internet dependency on the learner's device. Generation is reproducible using scripts/generate-neural-coach.py.

## Validation
82 automated tests pass, including song selection, phrase-mode entry, lyric/note alignment, whole-verse construction, weakest-line selection, and exact voice-asset inventory and hashes. Tests use synthetic input and silent audio doubles. Real-device singing and subjective voice-quality listening remain unverified.

Windows remains unsigned; Android/Fire is debug-signed for personal sideloading.
