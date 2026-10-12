import { useCallback, useEffect, useRef, useState } from 'react';
import { ROUND2_CONFIG as CONFIG } from '../round2/config';
import {
  destroyedPlants, initMini, plantX, spawnSchedule, spraySpot, stepMini, tapPest,
  type MiniMode, type MiniState,
} from '../round2/minigame';
import { Backdrop, Pixel, Stage } from './common';
import { Sprite } from './Sprite';

interface Props {
  mode: MiniMode;
  seed: number;
  showHelp: boolean; // first season: 3-second "how to play" overlay
  onDone: (destroyedPlantCount: number) => void;
}

const FIELD_W = CONFIG.minigame.fieldWidthPx;
const FIELD_H = CONFIG.minigame.fieldHeightPx;
const HELP_SECONDS = 0;

/** One component, two modes: spray (drag a spray can) and hand (tap pests). */
export function PestGame({ mode, seed, showHelp, onDone }: Props) {
  const [mini, setMini] = useState<MiniState>(() => initMini());
  const [helping, setHelping] = useState(showHelp);
  const [spray, setSpray] = useState<{ x: number; y: number } | null>(null);
  const [residue, setResidue] = useState<boolean[]>(() => Array(CONFIG.minigame.plants).fill(false));
  const state = useRef(mini);
  const finished = useRef(false);
  const schedule = useRef(spawnSchedule(seed, mode));
  const sprayPos = useRef<{ x: number; y: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dur = CONFIG.minigame.durationSec;

  useEffect(() => {
    if (!helping) return;
    const id = window.setTimeout(() => setHelping(false), HELP_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [helping]);

  useEffect(() => {
    if (helping) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      let s = stepMini(state.current, dt, mode, schedule.current);
      if (mode === 'spray' && sprayPos.current) {
        s = spraySpot(s, sprayPos.current.x, sprayPos.current.y);
      }
      state.current = s;
      setMini(s);
      if (s.time >= dur && !finished.current) {
        finished.current = true;
        onDone(destroyedPlants(s));
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [helping, mode, dur, onDone]);

  const toField = useCallback((e: React.PointerEvent) => {
    const el = fieldRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * FIELD_W, y: ((e.clientY - r.top) / r.height) * FIELD_H };
  }, []);

  const sprayAt = (e: React.PointerEvent) => {
    if (mode !== 'spray' || helping) return;
    const p = toField(e);
    sprayPos.current = p;
    setSpray(p);
    // Sprayed crops get a small residue mark (purely visual).
    setResidue((prev) => {
      let changed = false;
      const next = prev.map((v, i) => {
        if (!v && Math.hypot(plantX(i) - p.x, FIELD_H - 70 - p.y) < CONFIG.minigame.spray.sprayRadiusPx) {
          changed = true;
          return true;
        }
        return v;
      });
      return changed ? next : prev;
    });
  };
  const stopSpray = () => {
    sprayPos.current = null;
    setSpray(null);
  };

  const hit = CONFIG.minigame.hand.hitboxPx;
  const remaining = Math.max(0, dur - mini.time);

  return (
    <div>
      <div className="timer" role="progressbar" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(mini.time)} aria-label="Time left">
        <i style={{ width: `${(remaining / dur) * 100}%` }} />
      </div>
      <div
        ref={fieldRef}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); sprayAt(e); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') sprayAt(e); }}
        onPointerUp={stopSpray}
        onPointerCancel={stopSpray}
        className="game-field"
      >
        <Stage w={FIELD_W} h={FIELD_H} label="Pest mini-game field">
          <Backdrop />
          {mini.alive.map((alive, i) => (
            <div key={i} style={{ left: plantX(i) - 18, top: FIELD_H - 86 }}>
              <Sprite name={alive ? 'plant' : 'plantWilted'} scale={3} />
              {alive && residue[i] && (
                <>
                  <div className="residue" style={{ position: 'absolute', left: 6, top: 14 }} />
                  <div className="residue" style={{ position: 'absolute', left: 20, top: 24 }} />
                  <div className="residue" style={{ position: 'absolute', left: 12, top: 30 }} />
                </>
              )}
            </div>
          ))}
          {mini.pests.map((p) =>
            mode === 'hand' ? (
              <button
                key={p.id}
                className="pest-hit"
                aria-label="Pest"
                style={{ left: p.x - hit / 2, top: p.y - hit / 2, width: hit, height: hit }}
                onClick={(e) => { e.stopPropagation(); state.current = tapPest(state.current, p.id); setMini(state.current); }}
              >
                <Sprite name="pest" scale={4} />
              </button>
            ) : (
              <div key={p.id} style={{ left: p.x - 16, top: p.y - 16 }}>
                <Sprite name="pest" scale={4} />
              </div>
            ),
          )}
          {mode === 'spray' && spray && (
            <>
              <div style={{ left: spray.x - CONFIG.minigame.spray.sprayRadiusPx, top: spray.y - CONFIG.minigame.spray.sprayRadiusPx, width: CONFIG.minigame.spray.sprayRadiusPx * 2, height: CONFIG.minigame.spray.sprayRadiusPx * 2, background: 'repeating-conic-gradient(rgba(200,190,240,0.55) 0 25%, rgba(230,225,255,0.35) 0 50%) 0 0/16px 16px', borderRadius: '50%', border: '4px dotted rgba(120,100,200,0.7)' }} />
              <Pixel name="sprayCan" x={spray.x - 16} y={spray.y - 20} scale={4} />
            </>
          )}
          {mode === 'spray' && !spray && !helping && (
            <div className="tag" style={{ left: 90, top: 8 }}>Drag to spray</div>
          )}
          {mode === 'hand' && !helping && <div className="tag" style={{ left: 100, top: 8 }}>Tap the pests</div>}
          {helping && (
            <div className="overlay">
              <Sprite name={mode === 'spray' ? 'sprayCan' : 'pest'} scale={8} />
              <div>{mode === 'spray' ? 'Drag the spray can over the pests.' : 'Tap each pest before it reaches a plant.'}</div>
            </div>
          )}
        </Stage>
      </div>
    </div>
  );
}
