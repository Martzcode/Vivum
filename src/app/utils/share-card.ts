export type ShareTheme = 'cream' | 'sage' | 'night';
export type ShareFormat = 'square' | 'portrait';

export interface ShareCardContent {
  text: string;
  reference: string;
  versionLabel: string;
}

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  accent: string;
  muted: string;
}

/** Mêmes teintes que l'interface : neutre chaud, sauge, mode sombre. */
export const SHARE_THEMES: Record<ShareTheme, ThemeColors> = {
  cream: { background: '#f7f5f0', surface: '#efece5', text: '#2f332f', accent: '#4a7c6f', muted: '#80867e' },
  sage: { background: '#4a7c6f', surface: '#43726a', text: '#ffffff', accent: '#d8e8e2', muted: '#bcd5cc' },
  night: { background: '#1e2220', surface: '#252a27', text: '#dde0d9', accent: '#86b9aa', muted: '#7f867e' },
};

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Inter', 'Segoe UI', system-ui, sans-serif";

/** Découpe un texte en lignes qui tiennent dans `maxWidth`. */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Dessine la carte. `logo` est optionnel (chargement asynchrone). */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  content: ShareCardContent,
  theme: ShareTheme,
  format: ShareFormat,
  logo?: CanvasImageSource | null,
): void {
  const { width, height } = SHARE_SIZES[format];
  const colors = SHARE_THEMES[theme];
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // Cadre discret.
  const inset = 44;
  ctx.strokeStyle = colors.accent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  roundRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 36);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const padX = 130;
  const maxTextWidth = width - padX * 2;
  const footerHeight = 150;
  const headerHeight = 280;
  const referenceHeight = 170;
  const available = height - headerHeight - footerHeight - referenceHeight;

  // Guillemet décoratif.
  ctx.fillStyle = colors.accent;
  ctx.globalAlpha = 0.45;
  ctx.font = `700 190px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', width / 2, 250);
  ctx.globalAlpha = 1;

  // Taille de police : la plus grande qui tient dans la zone.
  let fontSize = 62;
  let lines: string[] = [];
  let lineHeight = 0;
  for (; fontSize >= 26; fontSize -= 2) {
    ctx.font = `400 ${fontSize}px ${SERIF}`;
    lines = wrapLines(content.text, maxTextWidth, value => ctx.measureText(value).width);
    lineHeight = Math.round(fontSize * 1.5);
    if (lines.length * lineHeight <= available) break;
  }

  const blockHeight = lines.length * lineHeight;
  const top = headerHeight + Math.max(0, (available - blockHeight) / 2);

  ctx.fillStyle = colors.text;
  ctx.font = `400 ${fontSize}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + index * lineHeight));

  // Filet + référence.
  const refY = top + blockHeight + 56;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(width / 2 - 40, refY, 80, 4);

  ctx.fillStyle = colors.accent;
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(content.reference, width / 2, refY + 34);

  ctx.fillStyle = colors.muted;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(content.versionLabel, width / 2, refY + 90);

  // Signature.
  const footerY = height - footerHeight + 20;
  const logoSize = 48;
  ctx.font = `700 32px ${SANS}`;
  const label = 'Vivum';
  const labelWidth = ctx.measureText(label).width;
  const gap = logo ? 14 : 0;
  const total = (logo ? logoSize : 0) + gap + labelWidth;
  const startX = (width - total) / 2;

  if (logo) {
    ctx.drawImage(logo, startX, footerY - logoSize / 2 + 12, logoSize, logoSize);
  }
  ctx.fillStyle = colors.text;
  ctx.globalAlpha = 0.75;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, startX + (logo ? logoSize + gap : 0), footerY + 12);
  ctx.globalAlpha = 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
