/* ============================================================================
   data.js — the demo's fixtures
   ----------------------------------------------------------------------------
   Campuses, stops and coordinates are copied from Kay_Rides/prisma/seed.ts, and
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
  var FARE = {
    baseFarePesewas: 500,          // @default(500)
    comfortSurchargePct: 50,       // @default(50)
    independentSurchargePct: 150,  // @default(150)
    partyDiscountSchedule: { 3: 10 }, // @default("{\"3\":10}")
  };

  /* -- ride tiers (rider-app/src/rideTier.ts), copy verbatim ---------- */
  var RIDE_TIERS = [
    {
      tier: 'standard',
      label: 'Standard',
      blurb: 'Share the ride. Best price.',
      icon: 'car',
      seatsSold: 4,
    },
    {
      tier: 'comfort',
      label: 'Comfort',
      blurb: 'Still shared, but one seat fewer - no middle seat.',
      icon: 'car-estate',
      seatsSold: 3,
    },
    {
      tier: 'independent',
      label: 'Independent',
      blurb: 'The whole car to you. Nobody else joins.',
      icon: 'car-key',
      seatsSold: 1,
    },
  ];

  /* -- campuses (prisma/seed.ts) -------------------------------------- */
  var SCHOOLS = [
    {
      code: 'UPSA',
      name: 'University of Professional Studies, Accra',
      short: 'UPSA',
      comfortEnabled: true,
      independentEnabled: true,
      nodes: [
        { name: 'Main Gate', type: 'gate', lat: 5.6614, lng: -0.16644 },
        { name: 'Junior Common Room (JCR)', type: 'hall', lat: 5.6704, lng: -0.16294 },
        { name: 'Dr. Matthew Opoku Prempeh Hostel', type: 'hall', lat: 5.6694, lng: -0.16144 },
        { name: 'Joshua Alabi Library', type: 'landmark', lat: 5.667, lng: -0.16654 },
        { name: 'UPSA Business School Block', type: 'department', lat: 5.6644, lng: -0.16794 },
        { name: 'Student Canteen', type: 'landmark', lat: 5.6624, lng: -0.16194 },
        { name: 'Ewontoma Medical Centre', type: 'landmark', lat: 5.6574, lng: -0.16944 },
        { name: 'Central Administration Building', type: 'hall', lat: 5.6699, lng: -0.16444 },
      ],
    },
    {
      code: 'UG-LEGON',
      name: 'University of Ghana, Legon',
      short: 'Legon',
      comfortEnabled: true,
      independentEnabled: true,
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
    {
      code: 'GIMPA',
      name: 'Ghana Institute of Management and Public Administration',
      short: 'GIMPA',
      comfortEnabled: true,
      independentEnabled: false,
      nodes: [
        { name: 'Main Gate', type: 'gate', lat: 5.6598, lng: -0.1668 },
        { name: 'GIMPA Main Library', type: 'landmark', lat: 5.6584, lng: -0.1657 },
        { name: 'Law Faculty Building', type: 'department', lat: 5.6578, lng: -0.1649 },
        { name: 'GIMPA Executive Conference Centre', type: 'landmark', lat: 5.6591, lng: -0.1645 },
        { name: 'School of Business Block', type: 'department', lat: 5.6572, lng: -0.1662 },
      ],
    },
    {
      code: 'CENTRAL-UNI',
      name: 'Central University',
      short: 'Central',
      comfortEnabled: false,
      independentEnabled: false,
      nodes: [
        { name: 'Main Gate', type: 'gate', lat: 5.7268, lng: 0.0338 },
        { name: 'Central University Library', type: 'landmark', lat: 5.7279, lng: 0.0349 },
        { name: 'Eagle Square', type: 'landmark', lat: 5.7274, lng: 0.0344 },
        { name: 'Central Business School', type: 'department', lat: 5.7283, lng: 0.0356 },
        { name: 'Administration Block', type: 'hall', lat: 5.7271, lng: 0.033 },
      ],
    },
    {
      code: 'ASHESI',
      name: 'Ashesi University',
      short: 'Ashesi',
      comfortEnabled: true,
      independentEnabled: true,
      nodes: [
        { name: 'Main Gate', type: 'gate', lat: 5.7601, lng: -0.2097 },
        { name: 'Ashesi Library', type: 'landmark', lat: 5.7596, lng: -0.2088 },
        { name: 'King Engineering Building', type: 'department', lat: 5.759, lng: -0.208 },
        { name: 'Databank Foundation Hall', type: 'hall', lat: 5.7603, lng: -0.2078 },
        { name: 'Natembea Health Centre', type: 'landmark', lat: 5.7588, lng: -0.2096 },
      ],
    },
  ];

  SCHOOLS.forEach(function (s) {
    s.nodes.forEach(function (n, i) { n.id = s.code + '-' + i; n.schoolCode = s.code; });
  });

  function schoolByCode(code) {
    return SCHOOLS.filter(function (s) { return s.code === code; })[0] || SCHOOLS[0];
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

  function fareWhenBookerPaysAll(perSeat, partySize, schedule) {
    return applyGroupDiscount(perSeat * partySize, partySize, schedule);
  }

  function fareWithoutGroupDiscount(perSeat, partySize) {
    return perSeat * partySize;
  }

  /** Mirrors tierFarePerSeat on the server. */
  function tierPerSeatPesewas(tier) {
    var pct = tier === 'comfort' ? FARE.comfortSurchargePct
      : tier === 'independent' ? FARE.independentSurchargePct
        : 0;
    return Math.round(FARE.baseFarePesewas * (1 + pct / 100));
  }

  /** "10% off for 3+ seats" (rider-app/src/fare.ts formatPartyDiscountSummary) */
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

  /* -- passes (mirrors campusPassCopy.ts shapes) ---------------------- */
  var PASS_PRODUCTS = [
    { id: 'p-week', name: 'Week pass', pricePesewas: 2500, durationDays: 7, ridesIncluded: null, maxRidesPerDay: 4, coversComfort: false, coversIndependent: false },
    { id: 'p-bundle20', name: '20-ride bundle', pricePesewas: 8000, durationDays: 60, ridesIncluded: 20, maxRidesPerDay: 0, coversComfort: true, coversIndependent: false },
    { id: 'p-term', name: 'Semester pass', pricePesewas: 18000, durationDays: 120, ridesIncluded: null, maxRidesPerDay: 3, coversComfort: true, coversIndependent: false },
  ];

  function describeProduct(p) {
    var parts = [formatGhs(p.pricePesewas)];
    if (p.ridesIncluded != null) {
      parts.push(p.ridesIncluded + ' ride' + (p.ridesIncluded === 1 ? '' : 's'));
      parts.push('use within ' + p.durationDays + ' days');
    } else {
      parts.push('unlimited for ' + p.durationDays + ' days');
    }
    if (p.maxRidesPerDay > 0) parts.push('up to ' + p.maxRidesPerDay + ' a day');
    return parts.join(' · ');
  }

  /* -- demo rider -----------------------------------------------------
     A generic student, deliberately not anyone real: this page is public, and
     a demo persona is the sort of detail that quietly becomes a person's name
     and phone number sitting in a search index. The number is inside Ghana's
     reserved 24 555 01xx test range. */
  var RIDER = {
    fullName: 'Akosua Danso',
    phone: '+233 24 555 0142',
    email: 'a.danso@upsamail.edu.gh',
    schoolCode: 'UPSA',
    balancePesewas: 4250,
    tripCount: 38,
    reservedCount: 2,
    referralCode: 'AKOS-7T3P',
  };

  var TRIP_HISTORY = [
    { from: 'Main Gate', to: 'Joshua Alabi Library', when: 'Today, 8:12 AM', farePesewas: 500, tier: 'standard', pooled: true, seats: 1 },
    { from: 'Student Canteen', to: 'Junior Common Room (JCR)', when: 'Yesterday, 6:40 PM', farePesewas: 1350, tier: 'standard', pooled: false, seats: 3, note: 'Group of 3 — 10% off' },
    { from: 'Joshua Alabi Library', to: 'Main Gate', when: 'Mon, 9:05 PM', farePesewas: 750, tier: 'comfort', pooled: true, seats: 1 },
    { from: 'Central Administration Building', to: 'Ewontoma Medical Centre', when: 'Sun, 11:20 AM', farePesewas: 1250, tier: 'independent', pooled: false, seats: 1 },
    { from: 'Main Gate', to: 'UPSA Business School Block', when: 'Fri, 7:55 AM', farePesewas: 500, tier: 'standard', pooled: true, seats: 1, note: 'Picked up at ≈80 m from Main Gate' },
  ];

  var WALLET_LEDGER = [
    { kind: 'Top-up', detail: 'MTN MoMo · 024•••0142', amountPesewas: +2000, when: 'Today, 7:58 AM' },
    { kind: 'Ride', detail: 'Main Gate → Joshua Alabi Library', amountPesewas: -500, when: 'Today, 8:12 AM' },
    { kind: 'Referral', detail: 'Kwame joined on AKOS-7T3P', amountPesewas: +120, when: 'Yesterday' },
    { kind: 'Ride', detail: 'Canteen → JCR (×3)', amountPesewas: -1350, when: 'Yesterday, 6:40 PM' },
    { kind: 'Top-up', detail: 'MTN MoMo · 024•••0142', amountPesewas: +5000, when: 'Mon' },
  ];

  global.KayData = {
    FARE: FARE,
    RIDE_TIERS: RIDE_TIERS,
    SCHOOLS: SCHOOLS,
    DRIVER_POOL: DRIVER_POOL,
    PASS_PRODUCTS: PASS_PRODUCTS,
    RIDER: RIDER,
    TRIP_HISTORY: TRIP_HISTORY,
    WALLET_LEDGER: WALLET_LEDGER,
    schoolByCode: schoolByCode,
    tierPerSeatPesewas: tierPerSeatPesewas,
    discountPctForPartySize: discountPctForPartySize,
    applyGroupDiscount: applyGroupDiscount,
    fareWhenBookerPaysAll: fareWhenBookerPaysAll,
    fareWithoutGroupDiscount: fareWithoutGroupDiscount,
    formatPartyDiscountSummary: formatPartyDiscountSummary,
    formatGhs: formatGhs,
    formatSeatRatio: formatSeatRatio,
    formatMinutes: formatMinutes,
    formatEtaRange: formatEtaRange,
    describeProduct: describeProduct,
  };
})(window);
