/* ============================================================================
   data.js — the demo's fixtures
   ----------------------------------------------------------------------------
   Campuses, stops and coordinates are copied from traverse/prisma/seed.ts, and
   the fare rules from prisma/schema.prisma's School defaults, so numbers on
   screen are the numbers the product actually computes rather than plausible
   placeholders. Where seed.ts carries a correction note (UPSA's coordinates
   were 250km wrong until 2026-07-18) the corrected values are the ones here.

   Drivers and trips are invented — there is no driver fixture in seed.ts with
   names attached — but they obey the real constraints: capacity 4, pooled
   candidates carry an added detour, seats are shown occupied/total.
   ========================================================================== */
(function (global) {
  'use strict';

  /* -- fare rules (prisma/schema.prisma School defaults) -------------- */
  /* -- fares (prisma/schema.prisma School.distanceBands + School.fareTable) --
     Distance-banded pricing replaced the flat fare on 2026-09-14; the
     operator's 2026-09-18 list has two bands, short (up to 3 km) and long.
     There is no base fare: a campus states each price outright, by ride type,
     distance band, party size, and whether the rider earned the promo column.

     Party prices are TOTALS for the group (index 0 = one rider). The four-rider
     column is a full car - sold on busy days, or when one booking asks for four.

     Live table read from the API on 19 Oct 2026. Solo (`independent`) is
     switched off on the campus, and nothing is cheaper for booking ahead (the
     advance-booking lead time is 0) or for paying a particular way (the wallet
     is gone), so the `promo` columns are not reachable and are not kept here.
     A rider does not measure their trip; they know whether it is a hop or a
     haul, and the app quotes the exact fare before they book either way. */
  var FARE = {
    bands: ['short', 'long'],
    shortMaxM: 3000,
    standard: {
      short: { normal: [800, 1200, 1200, 1400] },
      long:  { normal: [1500, 1700, 1700, 1900] }
    },
    // Empty, matching the schema default. There is no built-in group discount
    // any more - the party column above IS the group price.
    partyDiscountSchedule: {}
  };

  /* -- ride type ----------------------------------------------------
     One. Solo (the `independent` tier) is switched off on the live campus, so
     it is not offered here either. */
  var RIDE_TIERS = [
    {
      tier: 'standard',
      label: 'Standard',
      blurb: 'Share the ride. Someone else may be going your way.',
      icon: 'car',
      seatsSold: 4,
    },
  ];

  /* -- campuses (prisma/seed.ts) -------------------------------------- */
  var SCHOOLS = [
{
      code: 'UG-LEGON',
      name: 'University of Ghana, Legon',
      short: 'Legon',
      live: true,
      independentEnabled: false,
      /* How many stops the campus actually has. The eight below are a sample
         for the demo widget and the hero map - putting all 300 in a static file
         would bloat the page for no gain - but the headline number has to be
         the real one, so it is stated here rather than counted from the sample.
         Check it against admin -> Campus stops when it changes. */
      stopCount: 294,
      nodes: [
        { name: 'Main Gate', type: 'gate', lat: 5.6465, lng: -0.1919 },
        { name: 'Commonwealth Hall', type: 'hall', lat: 5.6464, lng: -0.18668 },
        { name: 'Volta Hall', type: 'hall', lat: 5.6517, lng: -0.1886 },
        { name: 'Akuafo Hall', type: 'hall', lat: 5.643, lng: -0.1847 },
        { name: 'Balme Library', type: 'landmark', lat: 5.65197, lng: -0.18654 },
        { name: 'Business School', type: 'department', lat: 5.648, lng: -0.181 },
        { name: 'Night Market', type: 'landmark', lat: 5.6475, lng: -0.1855 },
        { name: 'Sarbah Hall', type: 'hall', lat: 5.644, lng: -0.187 },
      ],
    },
  ];

  SCHOOLS.forEach(function (s) {
    s.nodes.forEach(function (n, i) { n.id = s.code + '-' + i; n.schoolCode = s.code; });
  });

  function liveSchools() {
    return SCHOOLS.filter(function (s) { return s.live; });
  }

  // Ordered for display: the campus you can actually ride on today first, the
  // rest behind it. Both the switcher menu and the campus grid read this, so
  // a school going live is a one-word change in the fixture above.
  function schoolsForDisplay() {
    return liveSchools().concat(SCHOOLS.filter(function (s) { return !s.live; }));
  }

  function schoolByCode(code) {
    // The fallback is the live campus, never SCHOOLS[0] - otherwise an
    // unknown or stale code silently lands on a school that is not open yet.
    return SCHOOLS.filter(function (s) { return s.code === code; })[0]
      || liveSchools()[0] || SCHOOLS[0];
  }

  /* -- drivers -------------------------------------------------------- */
  var DRIVER_POOL = [
    { name: 'Kwabena A.', car: 'Toyota Vitz', plate: 'GR 4821-22', rating: 4.9, trips: 1240, capacity: 4 },
    { name: 'Ama Serwaa', car: 'Hyundai i10', plate: 'GT 1177-23', rating: 4.8, trips: 860, capacity: 4 },
    { name: 'Yaw Mensah', car: 'Kia Picanto', plate: 'GW 3390-21', rating: 4.7, trips: 2013, capacity: 4 },
    { name: 'Efua Boateng', car: 'Toyota Corolla', plate: 'GE 7745-24', rating: 5.0, trips: 412, capacity: 4 },
    { name: 'Kofi Adjei', car: 'Nissan Note', plate: 'GN 5502-22', rating: 4.8, trips: 1588, capacity: 4 },
    { name: 'Adwoa Nyarko', car: 'Suzuki Alto', plate: 'GC 2264-23', rating: 4.9, trips: 733, capacity: 4 },
  ];

  /* -- fare maths (rider-app/src/fare.ts) ----------------------------- */

  function discountPctForPartySize(partySize, schedule) {
    schedule = schedule || FARE.partyDiscountSchedule;
    var bestSize = 0, bestPct = 0;
    Object.keys(schedule).forEach(function (key) {
      var size = Number(key), pct = Number(schedule[key]);
      if (!Number.isInteger(size) || size < 1) return;
      if (size <= partySize && size >= bestSize) {
        bestSize = size;
        bestPct = Math.max(0, Math.min(100, Math.round(pct)));
      }
    });
    return bestPct;
  }

  function applyGroupDiscount(farePesewas, partySize, schedule) {
    var pct = discountPctForPartySize(partySize, schedule);
    if (pct <= 0) return farePesewas;
    return Math.round(farePesewas * (1 - pct / 100));
  }

  /**
   * What a whole party pays, read from the table - never the solo price
   * multiplied. Mirrors SchoolFareService.quoteParty: a standard party is its
   * own column (two riders on a short trip pay GHS 12, not 2 × GHS 8).
   */
  function partyTotalPesewas(tier, partySize, band) {
    band = band || 'short';
    var row = FARE.standard[band].normal;
    return row[Math.max(1, Math.min(row.length, partySize)) - 1];
  }

  /**
   * What one rider pays, from the campus table.
   *
   * Mirrors SchoolFareService.quotePerSeatPesewas. `band` defaults to short,
   * the ordinary trip, because the demo has no distance to work from.
   */
  function tierPerSeatPesewas(tier, band) {
    band = band || 'short';
    return FARE.standard[band].normal[0];
  }

  /** e.g. "10% off for 3+ seats", or null when the campus set no discount. */
  function formatPartyDiscountSummary(schedule) {
    schedule = schedule || FARE.partyDiscountSchedule;
    var entries = Object.keys(schedule)
      .map(function (k) { return { size: Number(k), pct: Math.round(Number(schedule[k])) }; })
      .filter(function (e) { return Number.isInteger(e.size) && e.size >= 1 && e.pct > 0; })
      .sort(function (a, b) { return a.size - b.size; });
    if (!entries.length) return null;
    return entries.map(function (e, i) {
      var range = entries[i + 1] ? String(e.size) : e.size + '+';
      return e.pct + '% off for ' + range + ' seats';
    }).join(' · ');
  }

  /* -- formatting (rider-app/src/format.ts) --------------------------- */

  function formatGhs(pesewas) { return 'GHS ' + (pesewas / 100).toFixed(2); }

  function formatSeatRatio(seatsAvailable, capacity) {
    var total = capacity > 0 ? capacity : Math.max(seatsAvailable, 0);
    var occupied = Math.max(0, total - seatsAvailable);
    return occupied + '/' + total;
  }

  function formatMinutes(seconds) {
    return Math.max(1, Math.round(seconds / 60)) + ' min';
  }

  function formatEtaRange(etaSeconds, capSeconds) {
    var low = Math.max(1, Math.round(etaSeconds / 60));
    var high = Math.max(low, Math.round((etaSeconds + capSeconds) / 60));
    return low === high ? low + ' min' : low + '-' + high + ' min';
  }

  /* -- demo rider -----------------------------------------------------
     A generic student, deliberately not anyone real: this page is public, and
     a demo persona is the sort of detail that quietly becomes a person's name
     and phone number sitting in a search index. The number is inside Ghana's
     reserved 24 555 01xx test range. */
  var RIDER = {
    fullName: 'Akosua Danso',
    phone: '+233 24 555 0142',
    schoolCode: 'UG-LEGON',
    tripCount: 38,
    reservedCount: 2,
  };

  /* Invented rides on real Legon stops, priced from the table above: 8 for one
     on a short trip, 12 for two or three together, 15 for one on a long one. */
  var TRIP_HISTORY = [
    { from: 'Main Gate', to: 'Balme Library', when: 'Today, 8:12 AM', farePesewas: 800, tier: 'standard', pooled: true, seats: 1 },
    { from: 'Night Market', to: 'Akuafo Hall', when: 'Yesterday, 6:40 PM', farePesewas: 1200, tier: 'standard', pooled: false, seats: 2, note: 'Two seats' },
    { from: 'Balme Library', to: 'Main Gate', when: 'Mon, 9:05 PM', farePesewas: 800, tier: 'standard', pooled: true, seats: 1 },
    { from: 'Business School', to: 'Volta Hall', when: 'Sun, 11:20 AM', farePesewas: 800, tier: 'standard', pooled: false, seats: 1 },
    { from: 'Main Gate', to: 'Sarbah Hall', when: 'Fri, 7:55 AM', farePesewas: 800, tier: 'standard', pooled: true, seats: 1, note: 'Picked up at ≈80 m from Main Gate' },
  ];

  global.TraverseData = {
    FARE: FARE,
    RIDE_TIERS: RIDE_TIERS,
    SCHOOLS: SCHOOLS,
    DRIVER_POOL: DRIVER_POOL,
    RIDER: RIDER,
    TRIP_HISTORY: TRIP_HISTORY,
    schoolByCode: schoolByCode,
    liveSchools: liveSchools,
    schoolsForDisplay: schoolsForDisplay,
    tierPerSeatPesewas: tierPerSeatPesewas,
    partyTotalPesewas: partyTotalPesewas,
    discountPctForPartySize: discountPctForPartySize,
    applyGroupDiscount: applyGroupDiscount,
    formatPartyDiscountSummary: formatPartyDiscountSummary,
    formatGhs: formatGhs,
    formatSeatRatio: formatSeatRatio,
    formatMinutes: formatMinutes,
    formatEtaRange: formatEtaRange,
  };
})(window);
