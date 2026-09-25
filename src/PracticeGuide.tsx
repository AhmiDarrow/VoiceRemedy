import { Headphones, Mic, Leaf } from 'lucide-react'
export function PracticeGuide() {
  return <section className="practice-guide" aria-labelledby="practice-guide-title">
    <span className="eyebrow">YOU DO NOT NEED TO KNOW MUSIC YET</span>
    <h2 id="practice-guide-title">A little routine you can return to.</h2>
    <div className="routine-steps">
      <div><Headphones size={19}/><h3>Hear it first</h3><p>Listen once. Imagine the note before you answer. The letter, such as C4, is just the note’s name.</p></div>
      <div><Mic size={19}/><h3>Try one small sound</h3><p>Hum gently when it is your turn. If the line sits low, move your pitch up a little; if it sits high, settle down.</p></div>
      <div><Leaf size={19}/><h3>Rest, then try again</h3><p>Choose one thing from your feedback. Repeat while it feels easy, then connect the notes in Phrase mode.</p></div>
    </div>
    <details><summary>What if I cannot match the note yet?</summary><p>That is a starting point, not a verdict. Use “Find my comfortable note” so the target starts near your own hum. Hear it again, then make a small, slow slide toward it. You do not need to sing louder. If the display jumps, try one voice in a quieter room.</p></details>
    <details><summary>How should I use the lessons?</summary><p>Start with a warm-up and your recommended lesson. Repeat it a few times with comfortable breaks. When the notes become familiar, sing the phrase. Finish with an easy hum or quiet rest. Return another day; you do not need to finish the course in one sitting.</p></details>
    <details><summary>How will I know I am learning?</summary><p>Notice whether you find a note more quickly, need fewer corrections, and remember a phrase by ear. Milestones use repeated pitch results, but comfort, clear words, timing, and expression matter too. The app does not score those qualities. At the end, try singing the little song away from the screen.</p></details>
  </section>
}
