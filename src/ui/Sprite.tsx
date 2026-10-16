import { memo, useMemo, type CSSProperties } from 'react';
import { PALETTE, SPRITES, type SpriteName } from './sprites';

interface Props {
  name: SpriteName;
  scale?: number; // screen pixels per sprite pixel
  shirt?: string; // colour for 'x'
  accent?: string; // colour for 'z'
  flip?: boolean;
  label?: string; // accessible name; omit for decorative sprites
  className?: string;
  style?: CSSProperties;
}

/** Draws a pixel grid as crisp SVG. Runs of the same colour in a row are merged into one rect. */
function SpriteImpl({ name, scale = 4, shirt = '#4aa3df', accent = '#4aa3df', flip, label, className, style }: Props) {
  const rows: readonly string[] = SPRITES[name];
  const width = Math.max(...rows.map((r) => r.length));
  const rects = useMemo(() => {
    const colour = (ch: string): string | null =>
      ch === 'x' ? shirt : ch === 'z' ? accent : (PALETTE[ch] ?? null);
    const out: { x: number; y: number; w: number; fill: string }[] = [];
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const fill = colour(row[x]);
        let run = 1;
        while (x + run < row.length && row[x + run] === row[x]) run++;
        if (fill) out.push({ x, y, w: run, fill });
        x += run;
      }
    });
    return out;
  }, [rows, shirt, accent]);

  return (
    <svg
      className={className}
      style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }}
      width={width * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

export const Sprite = memo(SpriteImpl);
