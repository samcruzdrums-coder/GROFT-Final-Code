import { useEffect, useRef } from 'react';

type GlobeCenter = { lo: number; la: number };

type EarthGlobeCanvasProps = {
  center: GlobeCenter;
  zoom: number;
  onReady: (ready: boolean) => void;
};

type TextureData = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

const MAP_ASSET = `${import.meta.env.BASE_URL}earth-texture.png`;

export function EarthGlobeCanvas({
  center,
  zoom,
  onReady,
}: EarthGlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<() => void>(() => {});
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);

  centerRef.current = center;
  zoomRef.current = zoom;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: false });
    if (!canvas || !context) {
      onReady(false);
      return;
    }

    let cancelled = false;
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let texture: TextureData | null = null;

    const render = () => {
      if (cancelled || !texture || !width || !height) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (cancelled || !texture) return;

        const dpr = pixelRatio;
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.475 * zoomRef.current;
        const diameter = Math.max(1, Math.ceil(radius * 2 * dpr));
        const image = context.createImageData(diameter, diameter);
        const output = image.data;
        const { pixels, width: mapWidth, height: mapHeight } = texture;

        const latitudeCenter = centerRef.current.la * Math.PI / 180;
        const longitudeCenter = centerRef.current.lo * Math.PI / 180;
        const sinLatitude = Math.sin(latitudeCenter);
        const cosLatitude = Math.cos(latitudeCenter);
        const sinLongitude = Math.sin(longitudeCenter);
        const cosLongitude = Math.cos(longitudeCenter);
        const sunX = -0.45;
        const sunY = 0.54;
        const sunZ = 0.71;

        for (let y = 0; y < diameter; y += 1) {
          const viewY = 1 - ((y + 0.5) / diameter) * 2;
          for (let x = 0; x < diameter; x += 1) {
            const viewX = ((x + 0.5) / diameter) * 2 - 1;
            const depthSquared = 1 - viewX * viewX - viewY * viewY;
            if (depthSquared <= 0) continue;

            const viewZ = Math.sqrt(depthSquared);

            // Undo the globe's latitude and longitude rotation to sample the map.
            const worldY = cosLatitude * viewY + sinLatitude * viewZ;
            const rotatedZ = -sinLatitude * viewY + cosLatitude * viewZ;
            const worldX = cosLongitude * viewX + sinLongitude * rotatedZ;
            const worldZ = -sinLongitude * viewX + cosLongitude * rotatedZ;
            const latitude = Math.asin(Math.max(-1, Math.min(1, worldY)));
            const longitude = Math.atan2(worldX, worldZ);

            const mapX = ((longitude + Math.PI) / (2 * Math.PI)) * mapWidth;
            const wrappedX = ((mapX % mapWidth) + mapWidth) % mapWidth;
            const x0 = Math.floor(wrappedX);
            const x1 = (x0 + 1) % mapWidth;
            const mixX = wrappedX - x0;
            const mapY = Math.max(
              0,
              Math.min(mapHeight - 1, ((Math.PI / 2 - latitude) / Math.PI) * mapHeight),
            );
            const y0 = Math.floor(mapY);
            const y1 = Math.min(mapHeight - 1, y0 + 1);
            const mixY = mapY - y0;
            const topLeft = (y0 * mapWidth + x0) * 4;
            const topRight = (y0 * mapWidth + x1) * 4;
            const bottomLeft = (y1 * mapWidth + x0) * 4;
            const bottomRight = (y1 * mapWidth + x1) * 4;
            const light = Math.max(0, viewX * sunX + viewY * sunY + viewZ * sunZ);
            const shade = 0.54 + light * 0.46;
            const destination = (y * diameter + x) * 4;

            for (let channel = 0; channel < 3; channel += 1) {
              const top = pixels[topLeft + channel] * (1 - mixX)
                + pixels[topRight + channel] * mixX;
              const bottom = pixels[bottomLeft + channel] * (1 - mixX)
                + pixels[bottomRight + channel] * mixX;
              output[destination + channel] = Math.round(
                (top * (1 - mixY) + bottom * mixY) * shade,
              );
            }
            output[destination + 3] = 255;
          }
        }

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.putImageData(
          image,
          Math.round(cx * dpr - diameter / 2),
          Math.round(cy * dpr - diameter / 2),
        );
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const halo = context.createRadialGradient(
          cx,
          cy,
          radius * 0.97,
          cx,
          cy,
          radius * 1.11,
        );
        halo.addColorStop(0, 'rgba(90, 177, 242, 0)');
        halo.addColorStop(0.48, 'rgba(90, 177, 242, 0.12)');
        halo.addColorStop(1, 'rgba(90, 177, 242, 0)');
        context.fillStyle = halo;
        context.beginPath();
        context.arc(cx, cy, radius * 1.11, 0, Math.PI * 2);
        context.fill();

        for (let index = 0; index < 110; index += 1) {
          const starX = width * (((index * 157 + 43) % 997) / 997);
          const starY = height * (((index * 263 + 89) % 991) / 991);
          if (Math.hypot(starX - cx, starY - cy) < radius * 1.08) continue;
          context.fillStyle = `rgba(210, 225, 244, ${0.18 + (index % 5) * 0.08})`;
          context.fillRect(starX, starY, index % 11 === 0 ? 1.4 : 0.8, 0.8);
        }

        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(173, 213, 245, 0.5)';
        context.lineWidth = 1;
        context.shadowColor = 'rgba(100, 177, 236, 0.48)';
        context.shadowBlur = Math.min(14, width * 0.035);
        context.stroke();
        context.shadowBlur = 0;
      });
    };

    renderRef.current = render;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      render();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const source = document.createElement('canvas');
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      const sourceContext = source.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) {
        onReady(false);
        return;
      }
      sourceContext.drawImage(image, 0, 0);
      const map = sourceContext.getImageData(0, 0, source.width, source.height);
      texture = { pixels: map.data, width: source.width, height: source.height };
      onReady(true);
      render();
    };
    image.onerror = () => {
      if (!cancelled) onReady(false);
    };
    image.src = MAP_ASSET;

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      renderRef.current = () => {};
      onReady(false);
    };
  }, [onReady]);

  useEffect(() => {
    renderRef.current();
  }, [center, zoom]);

  return (
    <div className="earth-renderer" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="earth-renderer-canvas"
        data-testid="earth-renderer"
      />
    </div>
  );
}
