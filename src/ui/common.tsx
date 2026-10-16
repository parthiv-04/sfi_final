import { ROUND2_CONFIG as C } from '../round2/config'
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Sprite } from './Sprite';
import type { SpriteName } from './sprites';

/** Animation time scale: 1 normal, 0.3 reduced motion, 0 when the player skips. */
export const TimeScale = createContext(1);

type Vars = Record<string, string | number>;
/** Build a style with CSS custom properties (--d delay s, --dur duration s, --dx/--dy for fly). */
export const vars = (v: Vars, extra: CSSProperties = {}): CSSProperties => {
  const out: Record<string, string | number> = { ...extra };
  for (const k of Object.keys(v)) out[`--${k}`] = v[k];
  return out as CSSProperties;
};

/** Counts from `from` to `to` over `seconds` (after `delay`), honouring the time scale. */
export function CountUp({ from, to, seconds = 1, delay = 0 }: { from: number; to: number; seconds?: number; delay?: number }) {
  const scale = useContext(TimeScale);
  const [value, setValue] = useState(scale === 0 ? to : from);
  useEffect(() => {
    if (scale === 0 || from === to) {
      setValue(to);
      return;
    }
    setValue(from);
    const startAt = performance.now() + delay * scale * 1000;
    const span = seconds * scale * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - startAt) / span));
      setValue(Math.round((from + (to - from) * p) * C.quantityPrecision) / C.quantityPrecision);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, seconds, delay, scale]);
  return <>{value}</>;
}

/** Scale layout with zoom so SVGs render at display resolution instead of stretching a composited layer. */
export function Stage({ w = 320, h = 200, children, label }: { w?: number; h?: number; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setK((el.clientWidth || w) / w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} className="stage-fit" style={{ height: h * k + 8 }} role="img" aria-label={label}>
      <div className="stage" style={{ width: w, height: h, zoom: k }}>
        {children}
      </div>
    </div>
  );
}

export function Backdrop({ sky = 'day', ground = 'grass' }: { sky?: 'day' | 'rain' | 'night'; ground?: 'grass' | 'dry' | 'soil' }) {
  const cls = sky === 'day' ? '' : sky;
  return (
    <>
      <div className={`sky ${cls}`} />
      <div className="loop drift" style={{ left: 30, top: 14, ['--loopdur' as string]: '6s', animationTimingFunction: 'linear', animationDirection: 'alternate' }}>
        <Sprite name="cloud" scale={3} />
      </div>
      {sky === 'day' && (
        <div className="loop bob" style={{ left: 268, top: 10, ['--loopdur' as string]: '2.4s' }}>
          <Sprite name="sun" scale={3} />
        </div>
      )}
      <div className={`ground ${ground === 'grass' ? '' : ground}`} />
    </>
  );
}

/** One unit of produce: a pixel crate. */
export function Crate({ x, y, rot, style, className = '' }: { x: number; y: number; rot?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ left: x, top: y, ...style }}>
      <Sprite name={rot ? 'crateRot' : 'crate'} scale={2} />
    </div>
  );
}

export function Coin({ x, y, style, className = '' }: { x: number; y: number; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ left: x, top: y, ...style }}>
      <Sprite name="coin" scale={3} />
    </div>
  );
}

export function Pixel({ name, x, y, scale = 3, className = '', style, shirt, flip, label }: {
  name: SpriteName; x: number; y: number; scale?: number; className?: string; style?: CSSProperties; shirt?: string; flip?: boolean; label?: string;
}) {
  return (
    <div className={className} style={{ left: x, top: y, ...style }}>
      <Sprite name={name} scale={scale} shirt={shirt} flip={flip} label={label} />
    </div>
  );
}
