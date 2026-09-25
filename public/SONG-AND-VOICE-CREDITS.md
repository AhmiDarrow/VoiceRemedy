# Song and voice credits

## Traditional song lessons

VoiceRemedy includes its own simple teaching arrangements of public-domain compositions and first-verse texts. No commercial recordings or modern arrangements were copied. Reference notes are synthesized in the app.

- Mary Had a Little Lamb: text by Sarah Josepha Hale (1830); familiar traditional melody associated with Merrily We Roll Along / Goodnight, Ladies. This is the familiar modern nursery-rhyme tune, not Lowell Mason's different 1831 setting. Historical reference: https://en.wikipedia.org/wiki/Mary_Had_a_Little_Lamb
- Twinkle, Twinkle, Little Star: text from Jane Taylor's The Star (1806); traditional French melody Ah! vous dirai-je, maman, published in the eighteenth century. Historical reference: https://en.wikipedia.org/wiki/Twinkle,_Twinkle,_Little_Star

The app uses beginner practice pacing, explicit breath pauses, and syllable-by-syllable highlighting. These arrangements are teaching versions, not performances of a particular recording.

## Bundled neural narration

All 26 coach clips are generated locally from VoiceRemedy's teaching scripts with Kokoro-82M v1.0, female American English voice af_heart, at speed 0.94. This is synthetic speech, not a human recording or a clone commissioned for this app.

Model: https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0)
Voice documentation: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
Build-time renderer: https://github.com/thewh1teagle/kokoro-onnx (MIT)

Only finished WAV clips ship in the app. No speech model, Python runtime, network service, account, or API key is needed during use. public/coach/manifest.json records script text, duration, and SHA-256 for each clip.

The clips were generated and checked without speaker playback to respect the user's background-testing preference. Duration, finite samples, non-silence, peak headroom, and matching script inventory were checked; subjective pleasantness and pronunciation still need a listening review.

## Additional public-domain repertoire (0.6.0)

- Row, Row, Row Your Boat: familiar melody and text documented together in The Franklin Square Song Collection (1881), associated with Eliphalet Oram Lyte. https://en.wikipedia.org/wiki/Row,_Row,_Row_Your_Boat
- Are You Sleeping? / Frere Jacques: traditional tune documented by the eighteenth century, with the traditional English nursery text. https://en.wikipedia.org/wiki/Fr%C3%A8re_Jacques
- London Bridge Is Falling Down: traditional rhyme; the familiar melody is documented in A. H. Rosewig's 1879 collection. https://en.wikipedia.org/wiki/London_Bridge_Is_Falling_Down
- Ode to Joy: opening theme from Beethoven's Symphony No. 9 (1824), taught on doo. No modern English lyric translation, commercial recording, or modern arrangement is used. https://en.wikipedia.org/wiki/Symphony_No._9_(Beethoven)

These are original single-line teaching transcriptions, slowed for practice, with added breath pauses. Ode to Joy teaches the opening theme, not the complete symphonic movement. The songbook now contains six songs/themes and 34 song lessons. There are 31 bundled neural coach clips.

## Note placement narration (0.7.0)

Three additional neural clips guide the note/octave check and explain lower/higher octave mismatches. The current pack contains 34 clips. The displayed note describes a stable sampled hum, not a fixed octave assigned to a person.
