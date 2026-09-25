# Teaching evidence and implementation decisions

Reviewed 2026-09-24. This is an evidence-informed design rationale, not validation of VoiceRemedy. Automated tests verify software behavior, not that people learn to sing.

## What the research supports, and what it does not

1. Berglin, Pfordresher & Demorest (2022), The effect of visual and auditory feedback on adult poor-pitch remediation, Psychology of Music. https://doi.org/10.1177/03057356211026730
   In a randomized, short adult training study, improvement was strongest in the visual-feedback condition, especially for short melodies. This supports offering pitch-matching practice and visual guidance. It does not establish this app's effectiveness, an ideal practice dose, or improvements in tone quality and expression.

2. Demorest, Nichols & Pfordresher (2018), The effect of focused instruction on young children's singing accuracy, Psychology of Music. Author institution summary: https://pure.psu.edu/en/publications/the-effect-of-focused-instruction-on-young-childrens-singing-accu/ ; DOI https://doi.org/10.1177/0305735617713120
   Over seven months, kindergarteners receiving specialist instruction improved more on pitch-matching tasks, but neither group improved on the familiar-song-from-memory task. Therefore, success at matching notes is not treated as proof of being able to sing a song. The app includes separate connected-phrase and whole-song practice. The school study is not evidence that an unsupervised app reproduces specialist teaching.

3. Blanco, Tassani & Ramirez (2021), Effects of Visual and Auditory Feedback in Violin and Singing Voice Pitch Matching Tasks, Frontiers in Psychology. https://doi.org/10.3389/fpsyg.2021.684693
   This experiment examined different feedback conditions and a retention block. Feedback effects depend on task and modality, and the paper describes mixed results in earlier work. A better score while using guidance is not the same as retained learning. The optional no-live-hints round is a design inference from this distinction, not a proven superior treatment. It still plays the reference and provides a final score, so it is not an unaided memory test.

4. NIDCD, Taking Care of Your Voice. https://www.nidcd.nih.gov/health/taking-care-your-voice
   Public-health guidance supports avoiding vocal extremes and resting a hoarse or tired voice. The app offers transposition, pauses, shorter turns, and explicit comfort/rest guidance. It does not prescribe treatment, infer healthy technique from pitch, or assess vocal injury.

## Resulting teaching structure

- Listen to the reference, then answer: microphone measurement excludes the reference and spoken cues.
- Start with an easy pitch, then small patterns, song lines, and connected whole verses.
- Separate note learning from lyric learning: humming first is suggested; Ode to Joy uses doo without an English lyric adaptation.
- Give practical pitch feedback after an attempt; retain live hints as an optional aid.
- Offer a round with live hints off to encourage listening. Revisit familiar material on another day. No exact daily duration is claimed to be a scientifically established dose.
- Return from a difficult verse to the weakest measured line. This is a practical curriculum choice, not a validated diagnostic method.
- Preserve musical duration ratios at a slower teaching tempo. Every new song note lasts at least 0.6 seconds, leaving time after the 250 ms attack exclusion for multiple pitch measurements. That minimum is an engineering constraint, not a claim about human motor learning.
- Include breath spaces between lines. Learners may pause earlier; there is no forced breath-holding or maximum-range exercise.

## Boundaries and remaining evaluation

The score is the percentage of accepted pitch frames within 35 cents of the reference. The 35-cent window, minimum sample count, participation threshold, and advancement thresholds are product heuristics, not clinical or standardized mastery cutoffs. They do not measure rhythm accuracy, breath support, tone quality, vowels, expression, or vocal health. Noise, accompaniment, octave errors, and device microphones can mislead detection.

Needed before claiming demonstrated teaching effectiveness: supervised trials with beginners of different ages, baseline and delayed no-hint assessments, unfamiliar-song transfer, independent teacher ratings, and physical-device microphone tests. Improvements in measured pitch alone would still not establish comprehensive singing proficiency. No guaranteed progression from never singing to expert singing is claimed.

5. Paney & Tharp (2021), The effect of concurrent visual feedback on adult singing accuracy, Psychology of Music. https://doi.org/10.1177/0305735619854534
   In a ten-week randomized adult study, both groups improved, but concurrent visual feedback did not produce significantly higher scores than the control condition. This directly cautions against presenting a live pitch display as sufficient, uniquely effective instruction. Findings differ from the shorter poor-pitch remediation study; population, task, and training design matter.

Voice-placement note: the main session status explicitly reports when the separate voice check is active. The stable-hum and octave-shift thresholds are engineering heuristics, not standardized clinical measures. Octave recommendations require agreement across measured notes, sufficient participation, and a target that fits the detector range; mixed offsets and insufficient samples do not trigger automatic recommendations.
