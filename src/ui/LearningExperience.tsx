import { useState } from 'react'
import { Sprite } from './Sprite'
import { FlowScene } from './scenes'

export const LEARNING_GOAL = 'Balance farm income with keeping vulnerable households fed during floods and market closures.'
export function PracticeTask({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  const [choice, setChoice] = useState<'sell' | 'share' | null>(null)
  const fed = choice === 'share' ? 4 : 0
  return <section className="workspace practice-task"><p className="eyebrow">Practice · your farm is not affected</p><h2>The river is rising</h2><p>Four households cannot afford market prices. You have four crates. Choose where they go.</p>
    <div className="practice-choices"><button type="button" className="quiet channel-market" aria-pressed={choice === 'sell'} disabled={disabled} onClick={() => setChoice('sell')}><Sprite name="market" scale={3} />Sell · earn $16</button><button type="button" className="quiet channel-hub" aria-pressed={choice === 'share'} disabled={disabled} onClick={() => setChoice('share')}><Sprite name="personFed" scale={3} />Share · earn $4</button></div>
    {choice && <div aria-live="polite"><FlowScene key={choice} label={choice === 'share' ? 'Four crates reach the community kitchen' : 'Four crates go to paying market buyers'} lanes={[{ from: 'farmer', to: choice === 'share' ? 'storehouse' : 'market', units: 4, tag: choice === 'share' ? 'Kitchen: 4 crates' : 'Market: 4 crates', recipients: choice === 'share' }]} />
      <div className="practice-households">{[0, 1, 2, 3].map((i) => <Sprite key={i} name={fed ? 'personFed' : 'personHungry'} scale={3} />)}<strong>{fed}/4 vulnerable households fed · Earned ${fed ? 4 : 16}</strong></div>
      <p>{fed ? 'The kitchen reaches all four households. You earn less, but nobody in this group goes hungry.' : 'You earn more, but these four households still cannot afford food. The market serves paying buyers.'}</p>
      <button type="button" className="primary" disabled={disabled} onClick={onContinue}>Start the game</button>
    </div>}
    <p className="hint">{LEARNING_GOAL}</p><button type="button" className="quiet" disabled={disabled} onClick={onContinue}>Already played? Skip practice</button>
  </section>
}
