import type { PolicyScenario } from '../round2/types'
export function PolicySettings({value,onChange}:{value:PolicyScenario;onChange:(policy:PolicyScenario)=>void}) {
 return <label className="field">Policy scenario<select value={value} onChange={e=>onChange(e.target.value as PolicyScenario)}><option value="none">None · current channels</option><option value="A">A · more company-farmer channels</option><option value="B">B · cheaper organic farming</option><option value="C">C · support Mae Tha emergency food bank</option></select></label>
}
