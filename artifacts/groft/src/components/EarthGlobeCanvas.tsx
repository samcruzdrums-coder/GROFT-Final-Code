import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoCircle } from 'd3-geo';

/** Real-world coastlines and country borders (Apache-2.0 ECharts world map, pinned version). */
const WORLD_SRC = 'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/world.js';
type Feature = { type: 'Feature'; properties: any; geometry: any };

function decodeRing(s: string, off: number[], scale: number): number[][] {
  const out: number[][] = [];
  let px = off[0], py = off[1];
  for (let i = 0; i < s.length; i += 2) {
    let x = s.charCodeAt(i) - 64, y = s.charCodeAt(i + 1) - 64;
    x = (x >> 1) ^ -(x & 1); y = (y >> 1) ^ -(y & 1);
    x += px; y += py; px = x; py = y;
    out.push([x / scale, y / scale]);
  }
  return out;
}
const area = (r: number[][]) => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return a / 2; };
// d3 expects exterior rings clockwise and holes counter-clockwise.
const orient = (rings: number[][][]) => rings.map((r, i) => { const clockwise = area(r) < 0; return (i === 0) === clockwise ? r : r.slice().reverse(); });

function decode(json: any): Feature[] | null {
  const scale = json.UTF8Scale ?? 1024;
  const feats: Feature[] = [];
  for (const f of json.features || []) {
    const g = f.geometry; if (!g) continue;
    let polys: number[][][][] = [];
    if (json.UTF8Encoding && g.encodeOffsets) {
      if (g.type === 'Polygon') polys = [g.coordinates.map((s: string, i: number) => decodeRing(s, g.encodeOffsets[i], scale))];
      else if (g.type === 'MultiPolygon') polys = g.coordinates.map((p: string[], pi: number) => p.map((s, i) => decodeRing(s, g.encodeOffsets[pi][i], scale)));
    } else if (g.type === 'Polygon') polys = [g.coordinates];
    else if (g.type === 'MultiPolygon') polys = g.coordinates;
    polys = polys.filter((p) => p.length && p[0].length > 2);
    // Skip rings that wrap the whole planet in planar space (Antarctica); a polar cap is drawn instead.
    polys = polys.filter((p) => { const xs = p[0].map((c) => c[0]); return Math.max(...xs) - Math.min(...xs) < 300; });
    if (!polys.length) continue;
    feats.push({ type: 'Feature', properties: f.properties || {}, geometry: { type: 'MultiPolygon', coordinates: polys.map(orient) } });
  }
  // Sanity check so a format surprise falls back to the built-in silhouettes instead of drawing garbage.
  if (feats.length < 50) return null;
  for (const f of feats) for (const p of f.geometry.coordinates) for (const c of p[0]) if (!(Math.abs(c[0]) <= 181 && Math.abs(c[1]) <= 91)) return null;
  return feats;
}

let worldPromise: Promise<Feature[] | null> | null = null;
function loadWorld(): Promise<Feature[] | null> {
  if (worldPromise) return worldPromise;
  worldPromise = new Promise((resolve) => {
    const w = window as any, prev = w.echarts; let captured: any = null;
    w.echarts = { registerMap: (_n: string, g: any) => { captured = g; } };
    const s = document.createElement('script');
    s.src = WORLD_SRC; s.async = true;
    const done = (v: Feature[] | null) => { w.echarts = prev; resolve(v); };
    s.onload = () => { try { done(captured ? decode(captured) : null); } catch { done(null); } };
    s.onerror = () => done(null);
    document.head.appendChild(s);
    setTimeout(() => resolve(null), 15000);
  });
  return worldPromise;
}

/** Draws the real-world globe beneath the app's accessible SVG marker layer. */
export function EarthGlobeCanvas({ center, zoom, onReady }: { center: { lo: number; la: number }; zoom: number; onReady: (ready: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<Feature[] | null>(null);
  const drawRef = useRef<() => void>(() => {});
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const size = Math.min(rect.width, rect.height) * .475 * zoom;
      const x = rect.width / 2, y = rect.height / 2;
      const proj = geoOrthographic().translate([x, y]).scale(size).rotate([-center.lo, -center.la]).clipAngle(90).precision(.5);
      const path = geoPath(proj, ctx);
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.clip();
      const ocean = ctx.createRadialGradient(x - size * .32, y - size * .38, size * .08, x, y, size);
      ocean.addColorStop(0, '#2f7fb0'); ocean.addColorStop(.6, '#14507e'); ocean.addColorStop(1, '#082a4d');
      ctx.fillStyle = ocean; ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = 'rgba(197,225,255,.10)'; ctx.lineWidth = .6; ctx.stroke();
      const feats = world.current;
      if (feats) {
        ctx.beginPath(); path(geoCircle().center([0, -90]).radius(19.5)()); ctx.fillStyle = '#eef4f7'; ctx.fill();
        for (const f of feats) {
          ctx.beginPath(); path(f as any);
          const lat = f.geometry.coordinates[0]?.[0]?.[0]?.[1] ?? 0, a = Math.abs(lat);
          ctx.fillStyle = a > 62 ? '#dfe8e6' : a < 28 && Math.abs(lat) > 12 && (f.properties?.name || '').match(/Sahara|Libya|Egypt|Algeria|Niger|Mali|Mauritania|Chad|Saudi|Iraq|Oman|Yemen|Namibia|Botswana|Australia|Iran|Pakistan|Afghanistan|Turkmenistan|Uzbekistan|Mongolia|Kuwait|Qatar|United Arab/i) ? '#b8a46a' : a < 12 ? '#2f7a45' : '#6b9150';
          ctx.fill();
          ctx.strokeStyle = 'rgba(25,45,25,.45)'; ctx.lineWidth = .5; ctx.stroke();
        }
      }
      const shade = ctx.createRadialGradient(x - size * .3, y - size * .35, size * .15, x, y, size * 1.02);
      shade.addColorStop(0, 'rgba(255,255,255,.14)'); shade.addColorStop(.55, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(1,8,22,.62)');
      ctx.fillStyle = shade; ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(173,213,245,.5)'; ctx.lineWidth = 1; ctx.stroke();
    };
    drawRef.current = draw;
    draw();
    let live = true;
    loadWorld().then((g) => { if (!live) return; world.current = g; draw(); onReady(!!g); });
    const observer = new ResizeObserver(() => drawRef.current()); observer.observe(canvas);
    return () => { live = false; observer.disconnect(); };
  }, [center.lo, center.la, zoom, onReady]);
  return <canvas ref={ref} className="earth-renderer-canvas" aria-hidden="true" />;
}
