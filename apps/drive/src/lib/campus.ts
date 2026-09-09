/**
 * Campus accent, corrected for contrast.
 *
 * Each school stores a brand colour, and several of them are unusable as a
 * foreground: UG-Legon's is a pure yellow (#FFF700) which measures 1.08:1 on
 * a light background - invisible. Rather than drop the campus identity, the
 * hue is kept and only the lightness is walked until it clears 4.5:1 against
 * the surface it will actually sit on.
 *
 * The correction is computed, not hand-picked, so a school added later gets
 * a legible accent without anyone choosing one for it.
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(hex: string, toward: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (toward[0] - r) * amount,
    g + (toward[1] - g) * amount,
    b + (toward[2] - b) * amount,
  );
}

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];

/**
 * Walk the brand colour toward black (on light grounds) or white (on dark
 * ones) until it clears `target`. Steps of 4% keep the hue recognisable -
 * a bigger jump reaches the ratio sooner but stops looking like the school.
 */
export function legibleAccent(brand: string, ground: string, target = 4.5): string {
  if (contrastRatio(brand, ground) >= target) return brand;
  const groundIsDark = luminance(ground) < 0.2;
  const toward = groundIsDark ? WHITE : BLACK;
  let out = brand;
  for (let amount = 0.04; amount <= 1; amount += 0.04) {
    out = mix(brand, toward, amount);
    if (contrastRatio(out, ground) >= target) return out;
  }
  return out;
}

/** Text colour that sits on top of a filled accent block. */
export function inkOn(accent: string): string {
  return contrastRatio('#FFFFFF', accent) >= 4.5 ? '#FFFFFF' : '#0B0E13';
}

export function applyCampus(brand: string | null | undefined): void {
  const root = document.documentElement;
  if (!brand) return;
  const styles = getComputedStyle(root);
  const ground = styles.getPropertyValue('--ground').trim() || '#0B0E13';
  const accent = legibleAccent(brand, ground);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-ink', inkOn(accent));
  root.style.setProperty('--accent-dim', mix(accent, hexToRgb(ground), 0.78));
}
