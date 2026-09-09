/** Pesewas are the integer unit the backend stores; never do money in floats. */
export function formatGhs(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
