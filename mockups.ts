import type { ProductType, ProductColor } from '@/types';

/**
 * Generate an SVG mockup string for a product type + side + color.
 * These are inline SVGs rendered as data URLs so they work without
 * any external image hosting. The canvas area (printable zone) is
 * drawn as a faint dashed rectangle for visual reference.
 */

interface MockupParams {
  type: ProductType;
  side: 'front' | 'back';
  color: string;
  showPrintArea?: boolean;
  printArea?: { x: number; y: number; width: number; height: number };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function shade(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (255 * percent) / 100)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

export function generateMockupSvg({
  type,
  side,
  color,
  showPrintArea = true,
  printArea,
}: MockupParams): string {
  const baseColor = color;
  const dark = shade(color, -20);
  const darker = shade(color, -35);
  const light = shade(color, 12);

  let body = '';

  if (type === 'hoodie') {
    if (side === 'front') {
      body = `
        <!-- Hood -->
        <path d="M 120 60 Q 200 20 280 60 L 300 100 L 260 110 Q 200 80 140 110 L 100 100 Z" fill="${darker}"/>
        <!-- Body -->
        <path d="M 100 100 Q 70 120 60 170 L 55 420 Q 55 440 75 440 L 325 440 Q 345 440 345 420 L 340 170 Q 330 120 300 100 L 260 110 Q 200 140 140 110 Z" fill="${baseColor}"/>
        <!-- Shoulders -->
        <path d="M 60 170 Q 90 150 120 155 L 130 200 L 70 210 Z" fill="${dark}"/>
        <path d="M 340 170 Q 310 150 280 155 L 270 200 L 330 210 Z" fill="${dark}"/>
        <!-- Pocket -->
        <path d="M 130 300 L 270 300 L 260 370 L 140 370 Z" fill="${dark}" opacity="0.5" stroke="${darker}" stroke-width="1.5"/>
        <!-- Drawstrings -->
        <line x1="160" y1="90" x2="170" y2="170" stroke="${darker}" stroke-width="3" stroke-linecap="round"/>
        <line x1="240" y1="90" x2="230" y2="170" stroke="${darker}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="168" cy="172" r="4" fill="${darker}"/>
        <circle cx="232" cy="172" r="4" fill="${darker}"/>
        <!-- Sleeve cuffs -->
        <rect x="50" y="200" width="28" height="12" rx="4" fill="${dark}"/>
        <rect x="322" y="200" width="28" height="12" rx="4" fill="${dark}"/>
        <!-- Bottom cuff -->
        <rect x="55" y="425" width="290" height="15" rx="4" fill="${dark}"/>
      `;
    } else {
      body = `
        <!-- Hood back -->
        <path d="M 110 50 Q 200 10 290 50 L 300 120 Q 200 90 100 120 Z" fill="${darker}"/>
        <!-- Body -->
        <path d="M 100 120 Q 70 140 60 185 L 55 420 Q 55 440 75 440 L 325 440 Q 345 440 345 420 L 340 185 Q 330 140 300 120 Z" fill="${baseColor}"/>
        <!-- Shoulders -->
        <path d="M 60 185 Q 90 165 120 170 L 130 210 L 70 220 Z" fill="${dark}"/>
        <path d="M 340 185 Q 310 165 280 170 L 270 210 L 330 220 Z" fill="${dark}"/>
        <!-- Sleeve cuffs -->
        <rect x="50" y="215" width="28" height="12" rx="4" fill="${dark}"/>
        <rect x="322" y="215" width="28" height="12" rx="4" fill="${dark}"/>
        <!-- Bottom cuff -->
        <rect x="55" y="425" width="290" height="15" rx="4" fill="${dark}"/>
      `;
    }
  } else if (type === 'tshirt') {
    if (side === 'front') {
      body = `
        <!-- Collar -->
        <path d="M 160 60 Q 200 80 240 60 L 235 75 Q 200 92 165 75 Z" fill="${dark}"/>
        <!-- Body -->
        <path d="M 160 60 Q 140 65 100 85 L 55 120 L 70 145 L 100 130 L 100 430 Q 100 445 115 445 L 285 445 Q 300 445 300 430 L 300 130 L 330 145 L 345 120 L 300 85 Q 260 65 240 60 L 235 75 Q 200 95 165 75 Z" fill="${baseColor}"/>
        <!-- Sleeve seams -->
        <path d="M 100 85 L 55 120 L 70 145 L 105 128 Z" fill="${dark}" opacity="0.6"/>
        <path d="M 300 85 L 345 120 L 330 145 L 295 128 Z" fill="${dark}" opacity="0.6"/>
        <!-- Bottom hem -->
        <rect x="100" y="435" width="200" height="10" fill="${dark}" opacity="0.4"/>
      `;
    } else {
      body = `
        <!-- Back collar -->
        <path d="M 155 55 Q 200 75 245 55 L 242 68 Q 200 85 158 68 Z" fill="${dark}"/>
        <!-- Body -->
        <path d="M 155 55 Q 135 62 100 82 L 55 118 L 70 143 L 100 128 L 100 430 Q 100 445 115 445 L 285 445 Q 300 445 300 430 L 300 128 L 330 143 L 345 118 L 300 82 Q 265 62 245 55 Z" fill="${baseColor}"/>
        <path d="M 100 82 L 55 118 L 70 143 L 105 126 Z" fill="${dark}" opacity="0.6"/>
        <path d="M 300 82 L 345 118 L 330 143 L 295 126 Z" fill="${dark}" opacity="0.6"/>
        <rect x="100" y="435" width="200" height="10" fill="${dark}" opacity="0.4"/>
      `;
    }
  } else if (type === 'sweatshirt') {
    if (side === 'front') {
      body = `
        <!-- Crew collar -->
        <path d="M 165 55 Q 200 85 235 55 L 230 75 Q 200 100 170 75 Z" fill="${darker}"/>
        <!-- Body -->
        <path d="M 165 55 Q 140 62 100 85 L 55 125 L 72 150 L 100 135 L 100 430 Q 100 445 115 445 L 285 445 Q 300 445 300 430 L 300 135 L 328 150 L 345 125 L 300 85 Q 260 62 235 55 L 230 75 Q 200 100 170 75 Z" fill="${baseColor}"/>
        <!-- Sleeves -->
        <path d="M 100 85 L 55 125 L 72 150 L 105 130 Z" fill="${dark}"/>
        <path d="M 300 85 L 345 125 L 328 150 L 295 130 Z" fill="${dark}"/>
        <!-- Ribbed cuffs -->
        <rect x="50" y="140" width="28" height="14" rx="3" fill="${darker}"/>
        <rect x="322" y="140" width="28" height="14" rx="3" fill="${darker}"/>
        <!-- Bottom rib -->
        <rect x="100" y="430" width="200" height="15" rx="3" fill="${darker}"/>
      `;
    } else {
      body = `
        <path d="M 160 50 Q 200 80 240 50 L 237 65 Q 200 90 163 65 Z" fill="${darker}"/>
        <path d="M 160 50 Q 135 60 100 82 L 55 122 L 72 147 L 100 133 L 100 430 Q 100 445 115 445 L 285 445 Q 300 445 300 430 L 300 133 L 328 147 L 345 122 L 300 82 Q 265 60 240 50 Z" fill="${baseColor}"/>
        <path d="M 100 82 L 55 122 L 72 147 L 105 130 Z" fill="${dark}"/>
        <path d="M 300 82 L 345 122 L 328 147 L 295 130 Z" fill="${dark}"/>
        <rect x="50" y="140" width="28" height="14" rx="3" fill="${darker}"/>
        <rect x="322" y="140" width="28" height="14" rx="3" fill="${darker}"/>
        <rect x="100" y="430" width="200" height="15" rx="3" fill="${darker}"/>
      `;
    }
  } else if (type === 'cap') {
    if (side === 'front') {
      body = `
        <!-- Crown -->
        <path d="M 60 180 Q 60 70 200 70 Q 340 70 340 180 L 340 195 L 60 195 Z" fill="${baseColor}"/>
        <!-- Front panel highlight -->
        <path d="M 120 75 Q 200 55 280 75 Q 280 150 200 155 Q 120 150 120 75 Z" fill="${light}" opacity="0.3"/>
        <!-- Brim -->
        <path d="M 40 195 Q 200 235 360 195 L 360 210 Q 200 250 40 210 Z" fill="${dark}"/>
        <!-- Button -->
        <circle cx="200" cy="72" r="5" fill="${darker}"/>
        <!-- Seam lines -->
        <line x1="120" y1="75" x2="120" y2="195" stroke="${dark}" stroke-width="1" opacity="0.4"/>
        <line x1="280" y1="75" x2="280" y2="195" stroke="${dark}" stroke-width="1" opacity="0.4"/>
        <line x1="200" y1="70" x2="200" y2="195" stroke="${dark}" stroke-width="1" opacity="0.3"/>
      `;
    } else {
      body = `
        <!-- Back crown -->
        <path d="M 80 180 Q 80 80 200 80 Q 320 80 320 180 L 320 195 L 80 195 Z" fill="${baseColor}"/>
        <!-- Strap -->
        <rect x="130" y="195" width="140" height="30" rx="5" fill="${dark}"/>
        <!-- Strap holes -->
        <circle cx="160" cy="210" r="3" fill="${darker}"/>
        <circle cx="180" cy="210" r="3" fill="${darker}"/>
        <circle cx="200" cy="210" r="3" fill="${darker}"/>
        <circle cx="220" cy="210" r="3" fill="${darker}"/>
        <circle cx="240" cy="210" r="3" fill="${darker}"/>
        <!-- Seams -->
        <line x1="200" y1="80" x2="200" y2="195" stroke="${dark}" stroke-width="1" opacity="0.3"/>
      `;
    }
  }

  const printAreaRect =
    showPrintArea && printArea
      ? `<rect x="${printArea.x}" y="${printArea.y}" width="${printArea.width}" height="${printArea.height}" fill="none" stroke="rgba(99,102,241,0.35)" stroke-width="1" stroke-dasharray="6 4"/>`
      : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
    <rect width="400" height="480" fill="transparent"/>
    ${body}
    ${printAreaRect}
  </svg>`;

  return svg;
}

export function mockupToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getMockupUrl(
  type: ProductType,
  side: 'front' | 'back',
  color: string,
  printArea?: { x: number; y: number; width: number; height: number },
  showPrintArea = false,
): string {
  return mockupToDataUrl(
    generateMockupSvg({ type, side, color, printArea, showPrintArea }),
  );
}

export function getMockupColors(productType: ProductType): ProductColor[] {
  const all: Record<ProductType, ProductColor[]> = {
    hoodie: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Тёмно-серый', hex: '#3d3d3d' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Бежевый', hex: '#d4c5a9' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Синий', hex: '#1f3a5f' },
      { name: 'Белый', hex: '#f5f5f5' },
    ],
    tshirt: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Белый', hex: '#f5f5f5' },
      { name: 'Тёмно-синий', hex: '#1a2a44' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Оранжевый', hex: '#d97834' },
      { name: 'Розовый', hex: '#e8b4bc' },
    ],
    sweatshirt: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Тёмно-серый', hex: '#3d3d3d' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Кремовый', hex: '#ede5d6' },
      { name: 'Оливковый', hex: '#5d6b4e' },
      { name: 'Синий', hex: '#1f3a5f' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Белый', hex: '#f5f5f5' },
    ],
    cap: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Белый', hex: '#f5f5f5' },
      { name: 'Тёмно-синий', hex: '#1a2a44' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Красный', hex: '#c0392b' },
    ],
  };
  return all[productType];
}
