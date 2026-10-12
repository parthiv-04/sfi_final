import { useState } from 'react'
import { DEBRIEF_QUESTIONS } from '../learning'
import { NETWORK_CONFIG } from './config'
import type { PublicRoom } from './protocol'
export function Discussion({ room, host = false, onQuestion, onAnswer, answer = '', disabled = false }: { room: PublicRoom; host?: boolean; onQuestion?: (index: number) => void; onAnswer?: (answer: string) => void; answer?: string; disabled?: boolean }) {
  const [text, setText] = useState(answer)
  const index = room.discussionIndex
  if (index < 0) return host ? <button className="primary" onClick={() => onQuestion?.(0)}>Discuss together</button> : null
  const question = DEBRIEF_QUESTIONS[index]
  return <section className="discussion workspace"><p className="eyebrow">{question ? `Discussion ${index + 1}/${DEBRIEF_QUESTIONS.length}` : 'Remember together'}</p>{question ? <><h2>{question[0]}</h2><p className="discussion-question">{question[1]}</p></> : <><h2>One thing I’ll remember</h2>{!host && onAnswer && <form className="phone-form" onSubmit={(e) => { e.preventDefault(); onAnswer(text) }}><label>Anonymous answer<textarea maxLength={NETWORK_CONFIG.maxReflectionLength} value={text} onChange={(e) => setText(e.target.value)} /></label><button className="primary" disabled={disabled || !text.trim()}>Submit answer</button></form>}<div className="word-wall" aria-live="polite">{room.wordWall.map((word, i) => <p key={i}>{word}</p>)}</div></>}{host && <div className="phone-actions"><button className="quiet" disabled={index <= 0} onClick={() => onQuestion?.(index - 1)}>Back</button>{index < DEBRIEF_QUESTIONS.length && <button className="primary" onClick={() => onQuestion?.(index + 1)}>Next</button>}<button className="quiet" onClick={() => onQuestion?.(-1)}>Results</button></div>}</section>
}
