// Pixel scene primitives adapted from Two Farmers, One City to the distribution engine.
import { Fragment } from 'react'
import type { EventKind, Resolution } from '../round2/types'
import { ROUND2_CONFIG as C } from '../round2/config'
import { Backdrop, CountUp, Crate, Pixel, Stage, vars } from './common'
import type { SpriteName } from './sprites'
export function EventScene({ kind }: { kind: EventKind }) {
  return <Stage label={`${kind} season in Chiang Mai`}><Backdrop sky={kind === 'flood' ? 'rain' : 'day'} /><Pixel name="farmer" x={24} y={88} /><Pixel name="market" x={210} y={100} scale={3} />{[0,1,2,3].map(i => <Pixel key={i} name="plant" x={90+i*25} y={112} scale={2} className="loop sway" />)}{kind === 'flood' && <div className="water anim rise" style={vars({h:'90px',dur:1.8})} />}{kind === 'marketClosure' && <><div className="shutter" style={{left:210,top:116,width:70,height:40}} /><Pixel name="lock" x={238} y={120} scale={2} /></>}{kind === 'warning' && <Pixel name="cloud" x={130} y={26} scale={5} />}{kind === 'festival' && <div className="bunting" style={{left:60,top:52,width:240,height:16}} />}</Stage>
}
export function RouteScene({ amount }: { amount: number }) {
  return <Stage label={`${amount} units to schools and hospital`}><Backdrop /><Pixel name="farmer" x={10} y={104} scale={2} /><Pixel name="hospital" x={222} y={97} scale={3} />{amount > 0 ? <Pixel name="truck" x={42} y={112} scale={2} className="anim fly" style={vars({dx:'140px',dy:'0px',arc:'0px',dur:1.1})} /> : <><Pixel name="truck" x={42} y={112} scale={2} /><div className="tag" style={{left:100,top:40}}>No food sent this round</div></>}{Array.from({length: Math.min(12,Math.ceil(amount))},(_,i) => <Crate key={i} x={55} y={100} className="anim fly" style={vars({dx:`${168+(i%3)*10}px`,dy:`${-8-Math.floor(i/3)*12}px`,d:0.25+i*0.08,dur:1.1,arc:'28px'})} />)}</Stage>
}
/** One food route in a reveal: real units travel from source to destination; money, blocks and spoilage only when the engine recorded them. */
export interface Lane { from: SpriteName; shirt?: string; to: SpriteName; tag: string; units: number; money?: number; blocked?: boolean; rotten?: number; rottenAt?: 'from' | 'to'; near?: boolean; recipients?: boolean }
export function FlowScene({ lanes, label }: { lanes: Lane[]; label: string }) {
  return <Stage label={label}><Backdrop />{lanes.map((lane, k) => {
    const y = lanes.length === 1 ? 50 : 8 + k * 96, toX = lane.near ? 120 : 236, crates = lane.units > 0 ? Math.min(8, Math.ceil(lane.units)) : 0
    const coins = lane.money && lane.money > 0 ? Math.min(5, Math.max(1, Math.ceil(lane.money / 4))) : 0, rotten = lane.rotten && lane.rotten > 0 ? Math.min(8, Math.ceil(lane.rotten)) : 0
    return <Fragment key={k}>
      <div className="tag" style={{left:6,top:y}}>{lane.tag}</div>
      <div style={{left:40,top:y+62,width:toX-44,borderTop:`3px ${lane.blocked ? 'solid #d6453d' : 'dashed rgba(43,33,24,.45)'}`}} />
      {lane.from === 'farmer' ? <Pixel name="farmer" x={8} y={y+30} scale={2} shirt={lane.shirt} /> : <Pixel name={lane.from} x={2} y={y+38} scale={2} />}
      <Pixel name={lane.to} x={toX} y={y+34} scale={2.5} />
      {lane.blocked && <><div className="shutter" style={{left:toX+2,top:y+46,width:30,height:16}} /><Pixel name="lock" x={(40+toX)/2-8} y={y+48} scale={2} className="anim pop" style={vars({d:0.2,dur:0.4})} /></>}
      {crates === 0 && !lane.blocked && <div className="label" style={{left:(40+toX)/2-40,top:y+44}}>No food sent</div>}
      {Array.from({length:crates},(_,i) => <Crate key={i} x={36} y={y+46} className="anim fly" style={vars({dx:`${toX-40+(i%3)*7}px`,dy:`${-Math.floor(i/3)*7}px`,d:0.1+i*0.08,dur:0.8,arc:'18px'})} />)}
      {Array.from({length:coins},(_,i) => <Pixel key={i} name="coin" x={toX+10} y={y+40} scale={2} className="anim fly" style={vars({dx:`${-(toX-14)+i*5}px`,dy:'-6px',d:1.05+i*0.07,dur:0.55,arc:'14px'})} />)}
      {Array.from({length:rotten},(_,i) => <Crate key={i} rot x={(lane.rottenAt === 'to' ? toX + 2 : 40) + (i%4)*9} y={y+72-Math.floor(i/4)*8} className="anim appear" style={vars({d:1.1,dur:0.3})} />)}
      {rotten > 0 && <div className="label anim appear" style={vars({d:1.1,dur:0.3},{left:lane.rottenAt === 'to' ? toX - 74 : 80,top:y+78})}>spoiled {lane.rotten}</div>}
      {lane.recipients && lane.units > 0 && [0,1].map(i => <Pixel key={i} name="personFed" x={toX+40+i*16} y={y+36} scale={2} className="anim appear" style={vars({d:1.1+i*0.1,dur:0.3})} />)}
    </Fragment>
  })}</Stage>
}
/** Market shoppers: buyers walk to the stall; shoppers priced out ask "so expensive?" and walk off. Sprites cap at 6 per row; labels are exact. */
export function ShopperScene({ bought, walkOffs, organicWalkOffs, price }: { bought: number; walkOffs: number; organicWalkOffs: number; price: number }) {
  const buyers = Math.min(6, bought), general = Math.min(6, walkOffs), organic = Math.min(6, organicWalkOffs), stallX = 250
  const leaver = (key: string, x: number, y: number, i: number) => <div key={key} className="anim fly" style={vars({ dx: `${-(x + 140)}px`, dy: '0px', arc: '0px', d: 3 + i * 0.2, dur: 3 }, { left: x, top: y })}>
    <Pixel name="personHungry" x={0} y={0} scale={2} />
    <div className="bubble anim appear" style={vars({ d: 0.6 + i * 0.12, dur: 0.3 }, { left: -20, top: -26 })}>so expensive?</div>
  </div>
  return <Stage h={200} label={`${bought} crates bought at $${price}; ${walkOffs} shoppers walked off because the price was above $${C.shoppers.normalPrice}; ${organicWalkOffs} organic shoppers walked off at the organic premium`}><Backdrop />
    <Pixel name="market" x={stallX} y={98} scale={2.5} />
    {Array.from({ length: buyers }, (_, i) => <div key={`b${i}`} className="anim fly" style={vars({ dx: `${stallX - 30 - i * 22}px`, dy: '0px', arc: '0px', d: i * 0.12, dur: 1 }, { left: -10, top: 100 })}><Pixel name="personFed" x={0} y={0} scale={2} /></div>)}
    {Array.from({ length: general }, (_, i) => leaver(`w${i}`, stallX - 40 - i * 24, 150, i))}
    {Array.from({ length: organic }, (_, i) => leaver(`o${i}`, stallX - 40 - (general + i) * 24, 150, general + i))}
    <div className="tag" style={{ left: 6, top: 8 }}>Bought {bought} · walked off {walkOffs + organicWalkOffs}</div>
  </Stage>
}
/** Houses in order: fed, food here but too expensive, no food. One house per lot of households keeps 20–48 households readable. */
export function CityScene({ result }: { result: Resolution }) {
  const lot = C.roundingLot, count = Math.ceil(result.cityNeed / lot), width = Math.max(320,count*38+20)
  const fedCount = result.cityNeed - result.shortfall, dear = result.tooExpensive ?? 0, none = result.noFood ?? result.shortfall
  return <Stage w={width} h={230} label={`${fedCount} households fed; food here, but too expensive for ${dear}; no food for ${none}; each house is ${lot} households`}><Backdrop sky={result.shortfall ? 'night' : 'day'} />
    {dear > 0 && <div className="tag" style={{left:6,top:190}}><span className="price-tag">$$</span> food here, but too expensive</div>}
    {Array.from({length:count},(_,i) => { const x=12+i*38, fed = (i + 1) * lot <= fedCount, tooDear = !fed && i * lot < fedCount + dear; return <Fragment key={i}><Pixel name="house" x={x-4} y={72} scale={2.5} /><Pixel name={fed ? 'personFed' : 'personHungry'} x={x} y={120} scale={3} className={fed?'loop bob':'loop shake'} />{tooDear && <div className="price-tag" style={{left:x+2,top:52}}>$$</div>}{!fed && <div className="loop tear" style={{left:x+4,top:136,width:4,height:6,background:'#4aa3df'}} />}</Fragment> })}</Stage>
}
export function SecurityScene({ result, max }: { result: Resolution; max: number }) {
  const pct = (value: number) => Math.round(value / max * 100)
  return <Stage label={`${pct(result.securityAfter)}% of people have access to food`}><Backdrop /><Pixel name="house" x={16} y={80} scale={4} /><div className="pixel-meter" style={{left:108,top:86,width:190,height:32}}><div className="anim fill" style={vars({w:`${result.securityAfter/max*100}%`,dur:0.7},{height:'100%',background:result.securityAfter?'#4f9d4a':'#d6453d'})} /></div><div className="num-badge" style={{left:150,top:132}}><CountUp from={pct(result.securityBefore)} to={pct(result.securityAfter)} />%</div></Stage>
}
export function RoleScene({ contract, debt, recovery }: { contract: boolean; debt: number; recovery: boolean }) {
  return <Stage h={160} label={contract ? 'Company input advance' : recovery ? 'Soil recovering' : 'Mae Tha mixed crops'}><Backdrop ground={recovery?'soil':'grass'} /><Pixel name="farmer" x={24} y={78} scale={3} shirt={contract?'#4aa3df':'#5cb85c'} />{contract ? <><Pixel name="truck" x={-60} y={100} scale={2} className="anim fly" style={vars({dx:'170px',dy:'0px',arc:'0px',dur:1.2})} /><div className="tag" style={{left:166,top:26}}>Produce owed: {debt}</div></> : <>{[0,1,2,3].map(i=><Pixel key={i} name={recovery?'sprout':'plant'} x={134+i*36} y={112} scale={2} className="loop sway" />)}{recovery && <div className="loop bob label" style={{left:94,top:72}}>z z z</div>}</>}</Stage>
}
/** Organic trap story, one animated panel each: soil recovery, certificate fee, priced-out locals. */
export function OrganicStoryScene({ panel, fee }: { panel: 0 | 1 | 2; fee: number }) {
  if (panel === 0) return <Stage h={160} label="Soil recovering: half the plants grow this year"><Backdrop ground="soil" /><Pixel name="farmer" x={24} y={78} scale={3} shirt="#5cb85c" />{[0,1,2,3].map(i => <Pixel key={i} name={i % 2 ? 'sprout' : 'plant'} x={134+i*36} y={112} scale={2} className="anim appear" style={vars({ d: 0.3 + i * 0.25, dur: 0.4 })} />)}<div className="loop bob label" style={{left:94,top:72}}>z z z</div></Stage>
  if (panel === 1) return <Stage h={160} label={`Certificate fee $${fee} each round`}><Backdrop /><Pixel name="farmer" x={24} y={78} scale={3} shirt="#5cb85c" /><div className="tag" style={{left:170,top:40}}>Organic certificate</div>{fee > 0 && [0,1,2].map(i => <Pixel key={i} name="coin" x={70} y={100} scale={3} className="anim fly" style={vars({ dx: '140px', dy: '-50px', arc: '20px', d: 0.3 + i * 0.25, dur: 0.8 })} />)}<div className="num-badge" style={{left:200,top:90}}>−${fee}</div></Stage>
  return <Stage h={160} label="Most local shoppers walk away from organic prices"><Backdrop /><Pixel name="market" x={240} y={86} scale={2.5} />{[0,1,2].map(i => <div key={i} className="anim fly" style={vars({ dx: `${-(190 - i * 30 + 100)}px`, dy: '0px', arc: '0px', d: 2.6 + i * 0.2, dur: 3 }, { left: 190 - i * 30, top: 100 })}><Pixel name="personHungry" x={0} y={0} scale={2} /><div className="bubble anim appear" style={vars({ d: 0.2 + i * 0.2, dur: 0.3 }, { left: -16, top: -24 })}>so expensive?</div></div>)}<div className="anim fly" style={vars({ dx: '180px', dy: '0px', arc: '0px', d: 0.2, dur: 1 }, { left: 10, top: 100 })}><Pixel name="personFed" x={0} y={0} scale={2} /></div></Stage>
}
