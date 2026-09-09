/**
 * Four icons, drawn rather than pulled in as a font.
 *
 * An icon font would be ~300KB for the four glyphs actually used here, and
 * on a campus data bundle that is a real cost for decoration. Stroked paths
 * inherit currentColor, so they follow the campus accent for free.
 */
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconRoute = () => (
  <svg {...base}><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="5" r="2.4" />
    <path d="M8.4 19h5.1a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h5.1" /></svg>
);
export const IconWallet = () => (
  <svg {...base}><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <path d="M3 9h15" /><circle cx="17" cy="14" r="1.1" fill="currentColor" stroke="none" /></svg>
);
export const IconClock = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>
);
export const IconPerson = () => (
  <svg {...base}><circle cx="12" cy="8.5" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
);
