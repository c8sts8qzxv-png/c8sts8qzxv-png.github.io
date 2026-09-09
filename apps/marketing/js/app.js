/* ============================================================================
   app.js — the rider app
   ----------------------------------------------------------------------------
   One instance. Its root node is moved between the inline device on the page
   and the full-screen overlay rather than being built twice, so expanding the
   demo never resets what the visitor was in the middle of doing.

   Flow, matching rider-app/app/:
     login -> (tabs)/index -> plan-ride -> driver-list -> book-confirmation
           -> waiting -> (tabs)/trip, with wallet / history / profile alongside.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.TraverseData;
  var T = global.TraverseTheme;
  var M = global.TraverseMap;

  /* ---- helpers ----------------------------------------------------- */

  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /** Everything interpolated into markup goes through this. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#ic-' + name + '"/></svg>';
  }

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }

  var STOP_ICON = {
    gate: 'gate', hall: 'building', landmark: 'pin', department: 'book',
  };

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- state ------------------------------------------------------- */

  var state = {
    signedIn: false,
    schoolCode: T.school,
    origin: null,
    destination: null,
    picking: 'origin',
    tier: 'standard',
    partySize: 1,
    payment: 'prepaid',
    promo: null,
    promoError: null,
    balancePesewas: D.RIDER.balancePesewas,
    driver: null,
    candidates: [],
    tripProgress: 0,
    tab: 'home',
  };

  var stack = ['login'];
  var root = null;
  var screensEl = null;
  var toastEl = null;
  var toastTimer = null;
  var tripTimer = null;
  var searchTimer = null;

  function school() { return D.schoolByCode(state.schoolCode); }

  function availableTiers() {
    var s = school();
    var out = ['standard'];
    if (s.comfortEnabled) out.push('comfort');
    if (s.independentEnabled) out.push('independent');
    return out;
  }

  function perSeat() { return D.tierPerSeatPesewas(state.tier); }

  function rawFare() { return D.fareWithoutGroupDiscount(perSeat(), state.partySize); }

  function discountPct() { return D.discountPctForPartySize(state.partySize); }

  function fareAfterGroup() { return D.fareWhenBookerPaysAll(perSeat(), state.partySize); }

  function fareFinal() {
    var f = fareAfterGroup();
    if (state.promo) f = Math.max(0, f - state.promo.discountPesewas);
    return f;
  }

  /* Independent is the whole car, so the seat cap is the car; the shared tiers
     sell a seat fewer as you go up. Mirrors RIDE_TIERS.seatsSold. */
  function maxPartySize() {
    var t = D.RIDE_TIERS.filter(function (o) { return o.tier === state.tier; })[0];
    return t ? Math.max(1, t.seatsSold) : 4;
  }

  /* ---- candidate generation ---------------------------------------- */

  function makeCandidates() {
    var s = school();
    var seed = (state.origin ? state.origin.id.length : 3) + (state.destination ? state.destination.id.length : 5);
    var n = state.tier === 'independent' ? 2 : 3;
    var out = [];
    for (var i = 0; i < n; i++) {
      var d = D.DRIVER_POOL[(seed + i * 2) % D.DRIVER_POOL.length];
      // Independent sells the whole car, so it is never a pooled candidate.
      var pooled = state.tier !== 'independent' && i % 2 === 1;
      var capacity = d.capacity;
      var taken = pooled ? 1 + (i % 2) : 0;
      out.push({
        driver: d,
        label: 'Driver ' + (i + 1),
        etaSeconds: 120 + i * 95 + (seed % 40) * 3,
        capacity: capacity,
        seatsAvailable: Math.max(1, capacity - taken),
        pooled: pooled,
        addedDetourSeconds: pooled ? 90 + i * 45 : null,
        routeHeadline: pooled
          ? 'Already heading to ' + s.nodes[(seed + i) % s.nodes.length].name
          : 'Waiting at ' + s.nodes[(seed + i + 2) % s.nodes.length].name,
      });
    }
    return out;
  }

  /* ---- navigation --------------------------------------------------- */

  var TABS = ['home', 'trip', 'wallet', 'history', 'profile'];

  function current() { return stack[stack.length - 1]; }

  function go(name) {
    if (name === current()) return;
    stack.push(name);
    render('push');
  }

  function back() {
    if (stack.length <= 1) return;
    stack.pop();
    render('pop');
  }

  function reset(name) {
    stack = [name];
    render('none');
  }

  function selectTab(tab) {
    state.tab = tab;
    // Tabs are siblings, and a tab bar is pressed dozens of times a session.
    // Sliding between siblings would be a lie about the hierarchy, and at that
    // frequency any animation reads as lag — so this is a straight swap.
    stack = [tab];
    render('none');
  }

  /* ---- toast -------------------------------------------------------- */

  function toast(message) {
    if (!toastEl) return;
    toastEl.innerHTML = icon('check-circle', 'icon--sm') + '<span>' + esc(message) + '</span>';
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ============================ screens ============================== */

  function statusBar() {
    return '<div class="device__status">' +
      '<span>9:41</span>' +
      '<span class="device__status-right">' +
        '<svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>' +
        '<svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true"><rect x="0.6" y="0.6" width="20" height="10.8" rx="3" stroke="currentColor" stroke-opacity=".45" stroke-width="1.2"/><rect x="2.2" y="2.2" width="15" height="7.6" rx="1.8" fill="currentColor"/><path d="M22.4 4.2v3.6a2 2 0 0 0 0-3.6z" fill="currentColor" fill-opacity=".45"/></svg>' +
      '</span>' +
    '</div>';
  }

  /* -- login ---------------------------------------------------------- */

  function screenLogin() {
    return '<div class="screen" data-screen="login">' +
      '<div class="login">' +
        '<div class="login__mark">' + icon('car', 'icon--lg') + '</div>' +
        '<h1 class="login__title">Campus rides,<br>without the wait.</h1>' +
        '<p class="login__sub">Sign in with the phone number you registered on ' + esc(school().short) + '.</p>' +
        '<div class="login__field">' +
          '<label for="li-phone">Phone number</label>' +
          '<input id="li-phone" type="tel" inputmode="tel" value="' + esc(D.RIDER.phone) + '" autocomplete="tel">' +
        '</div>' +
        '<div class="login__field">' +
          '<label for="li-pass">Password</label>' +
          '<input id="li-pass" type="password" value="demo-password" autocomplete="current-password">' +
        '</div>' +
        '<button class="a-btn a-btn--primary press" data-act="sign-in">Sign in</button>' +
        '<p class="disclaimer" style="margin-bottom:0">Demonstration build — the fields are pre-filled and no account is created.</p>' +
      '</div>' +
    '</div>';
  }

  /* -- home ----------------------------------------------------------- */

  function screenHome() {
    var s = school();
    var discount = D.formatPartyDiscountSummary();
    var saved = [
      s.nodes[0].name + ' → ' + s.nodes[3].name,
      s.nodes[5].name + ' → ' + s.nodes[1].name,
    ];

    return '<div class="screen screen--map" data-screen="home">' +
      '<div class="map" data-map></div>' +
      '<div class="greet"><span class="greet__hi">Hi,</span><span class="greet__name">' + esc(D.RIDER.fullName.split(' ')[0]) + '</span></div>' +
      '<div class="sheet">' +
        '<div class="sheet__handle"></div>' +
        '<div class="sheet__scroll">' +
          '<div class="sheet__head">' +
            '<div class="sheet__badge">' + icon('route') + '</div>' +
            '<div>' +
              '<div class="sheet__title">Where are you going?</div>' +
              '<div class="sheet__sub">From ' + D.formatGhs(D.FARE.baseFarePesewas) + ' per rider' + (discount ? ' · ' + esc(discount) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="a-btn a-btn--primary press" data-act="plan" data-mode="now">' + icon('search') + 'Find a ride</button>' +
          '<button class="a-btn a-btn--secondary press" data-act="plan" data-mode="reserve">' + icon('calendar-clock', 'icon--sm') + 'Reserve for later</button>' +
          '<button class="a-btn a-btn--secondary press" data-act="plan" data-mode="routine">' + icon('calendar-sync', 'icon--sm') + 'Set up a routine ride</button>' +
          '<div class="a-links">' +
            '<button class="a-link press" data-act="soon" data-label="My reservations">' + icon('calendar-clock', 'icon--sm') + 'My reservations</button>' +
            '<button class="a-link press" data-act="soon" data-label="My routine rides">' + icon('calendar-sync', 'icon--sm') + 'My routine rides</button>' +
          '</div>' +
          '<div class="saved">' +
            '<div class="saved__title">Saved commutes</div>' +
            '<div class="saved__row">' +
              saved.map(function (label) {
                return '<button class="saved__chip press" data-act="plan" data-mode="now">' + esc(label) + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* -- plan a ride ---------------------------------------------------- */

  function screenPlan() {
    var s = school();
    var sameNode = state.origin && state.destination && state.origin.id === state.destination.id;
    var canContinue = !!state.origin && !!state.destination && !sameNode;

    var fieldOrigin =
      '<button class="picker__field press' + (state.picking === 'origin' ? ' is-active' : '') + '" data-act="pick-field" data-which="origin">' +
        '<span class="picker__dot"></span>' +
        '<span><span class="picker__label">Pickup</span>' +
        '<span class="picker__value' + (state.origin ? '' : ' is-empty') + '">' +
          esc(state.origin ? state.origin.name : 'Choose a stop') + '</span></span>' +
      '</button>';

    var fieldDest =
      '<button class="picker__field press' + (state.picking === 'destination' ? ' is-active' : '') + '" data-act="pick-field" data-which="destination">' +
        '<span class="picker__square"></span>' +
        '<span><span class="picker__label">Dropoff</span>' +
        '<span class="picker__value' + (state.destination ? '' : ' is-empty') + '">' +
          esc(state.destination ? state.destination.name : 'Choose a stop') + '</span></span>' +
      '</button>';

    var stops = s.nodes.map(function (n, i) {
      var other = state.picking === 'origin' ? state.destination : state.origin;
      var taken = other && other.id === n.id;
      var chosen = state.picking === 'origin' ? state.origin : state.destination;
      return '<button class="stop press" data-act="pick-stop" data-id="' + esc(n.id) + '"' +
        (taken ? ' disabled' : '') +
        ' style="--stop-delay:' + (i * 45) + 'ms">' +
        '<span class="stop__icon">' + icon(STOP_ICON[n.type] || 'pin', 'icon--sm') + '</span>' +
        '<span style="flex:1;min-width:0">' +
          '<span class="stop__name">' + esc(n.name) + '</span>' +
          '<span class="stop__meta" style="display:block">' + esc(n.type) + (taken ? ' · already chosen' : '') + '</span>' +
        '</span>' +
        (chosen && chosen.id === n.id ? icon('check-circle', 'icon--sm') : '') +
      '</button>';
    }).join('');

    return '<div class="screen" data-screen="plan">' +
      '<div class="appbar">' +
        '<button class="appbar__back press" data-act="back" aria-label="Go back">' + icon('arrow-left', 'icon--sm') + '</button>' +
        '<div style="flex:1">' +
          '<div class="appbar__title" style="font-size:22px;font-weight:800">Find a ride</div>' +
          '<div class="appbar__sub">Search campus stops for pickup and dropoff</div>' +
        '</div>' +
        '<button class="appbar__back press" data-act="swap" aria-label="Swap pickup and dropoff">' + icon('swap', 'icon--sm') + '</button>' +
      '</div>' +
      '<div class="screen__body">' +
        '<div class="picker">' + fieldOrigin + fieldDest + '</div>' +
        (sameNode ? '<p class="note note--bad" style="text-align:center;margin-top:var(--sp-sm)">Pickup and dropoff must be different.</p>' : '') +
        '<div class="stops">' + stops + '</div>' +
      '</div>' +
      '<div style="padding:var(--sp-sm) var(--sp-md) var(--sp-md)">' +
        '<button class="a-btn a-btn--primary press" data-act="see-drivers"' + (canContinue ? '' : ' disabled') + '>' +
          'See available drivers</button>' +
      '</div>' +
    '</div>';
  }

  /* -- driver list ---------------------------------------------------- */

  function screenDrivers() {
    var tiers = availableTiers();
    var tierRows = tiers.length < 2 ? '' :
      '<div class="tiers" role="radiogroup" aria-label="Ride type" style="margin-bottom:var(--sp-md)">' +
      D.RIDE_TIERS.filter(function (o) { return tiers.indexOf(o.tier) !== -1; }).map(function (o) {
        var on = o.tier === state.tier;
        return '<button class="tier press' + (on ? ' is-selected' : '') + '" role="radio" aria-checked="' + on + '"' +
          ' data-act="tier" data-tier="' + o.tier + '" aria-label="' + esc(o.label + '. ' + o.blurb) + '">' +
          icon(o.icon) +
          '<span style="flex:1;min-width:0">' +
            '<span class="tier__label" style="display:block">' + esc(o.label) + '</span>' +
            '<span class="tier__blurb" style="display:block">' + esc(o.blurb) + '</span>' +
          '</span>' +
          '<span class="tier__price">' + D.formatGhs(D.tierPerSeatPesewas(o.tier)) + '</span>' +
          (on ? icon('check-circle', 'icon--sm') : '') +
        '</button>';
      }).join('') + '</div>';

    var list = state.candidates.length
      ? state.candidates.map(function (c, i) {
          return '<button class="cand press" data-act="choose-driver" data-i="' + i + '" style="--stop-delay:' + (i * 55) + 'ms">' +
            '<span class="cand__avatar">' + esc(initials(c.driver.name)) + '</span>' +
            '<span class="cand__body">' +
              '<span class="cand__top">' +
                '<span class="cand__name">' + esc(c.label) + '</span>' +
                '<span class="cand__eta">' + D.formatEtaRange(c.etaSeconds, 180) + '</span>' +
              '</span>' +
              '<span class="cand__meta" style="display:block">' +
                D.formatSeatRatio(c.seatsAvailable, c.capacity) + ' · ' + D.formatGhs(fareAfterGroup()) +
                (rawFare() > fareAfterGroup() ? ' (save ' + D.formatGhs(rawFare() - fareAfterGroup()) + ')' : '') +
              '</span>' +
              '<span class="cand__route" style="display:block">' + (c.pooled ? '🔀 ' : '📍 ') + esc(c.routeHeadline) + '</span>' +
              (c.pooled ? '<span class="pool-badge">' + icon('users', 'icon--sm') + 'Sharing · +' + Math.round(c.addedDetourSeconds / 60) + ' min detour</span>' : '') +
            '</span>' +
            '<span class="cand__chev">' + icon('chevron-right', 'icon--sm') + '</span>' +
          '</button>';
        }).join('')
      : '<div class="center-state">' + icon('car', 'icon--lg') +
        '<div class="center-state__title">No drivers right now</div>' +
        '<p class="center-state__body">Try again in a moment or choose different stops.</p></div>';

    var routeName = (state.origin ? state.origin.name : '') + ' → ' + (state.destination ? state.destination.name : '');

    return '<div class="screen screen--map" data-screen="drivers">' +
      '<div class="map" data-map></div>' +
      '<button class="map-fab map-fab--float press" data-act="back" aria-label="Go back">' + icon('arrow-left', 'icon--sm') + '</button>' +
      '<div class="sheet" style="max-height:74%">' +
        '<div class="sheet__handle"></div>' +
        '<div style="padding-bottom:var(--sp-sm)">' +
          '<div style="font-size:18px;font-weight:800;letter-spacing:-.015em">' + esc(routeName) + '</div>' +
          '<div style="font-size:13px;color:var(--on-surface-variant);margin-top:var(--sp-xs)">' +
            'From ' + D.formatGhs(perSeat()) + ' per seat · ' + state.candidates.length + ' available</div>' +
        '</div>' +
        '<div class="sheet__scroll">' + tierRows + list + '</div>' +
      '</div>' +
    '</div>';
  }

  /* -- confirm -------------------------------------------------------- */

  function screenConfirm() {
    var c = state.driver;
    if (!c) return '<div class="screen" data-screen="confirm"></div>';

    var tierLabel = (D.RIDE_TIERS.filter(function (o) { return o.tier === state.tier; })[0] || {}).label || 'Standard';
    var canAfford = state.balancePesewas >= fareFinal();
    var pct = discountPct();
    var saving = rawFare() - fareAfterGroup();

    return '<div class="screen" data-screen="confirm">' +
      '<div class="appbar">' +
        '<button class="appbar__back press" data-act="back" aria-label="Go back">' + icon('arrow-left', 'icon--sm') + '</button>' +
        '<div class="appbar__title">Confirm your ride</div>' +
      '</div>' +
      '<div class="screen__body">' +

        '<div class="a-card">' +
          '<div style="font-size:13px;color:var(--on-surface-variant)">' +
            esc(state.origin.name) + ' → ' + esc(state.destination.name) + '</div>' +
          '<div style="font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:var(--sp-sm)">' + esc(c.label) + '</div>' +
          '<div style="font-size:13px;color:var(--on-surface-variant);margin-top:2px">' +
            D.formatMinutes(c.etaSeconds) + ' away · ' + D.formatSeatRatio(c.seatsAvailable, c.capacity) + '</div>' +
          (c.pooled ? '<div class="pool-badge" style="margin-top:var(--sp-sm)">' + icon('users', 'icon--sm') +
            'Sharing · +' + Math.round(c.addedDetourSeconds / 60) + ' min detour</div>' : '') +
        '</div>' +

        '<div class="a-card">' +
          '<div class="row"><span class="row__label">Ride type</span><span class="row__value">' + esc(tierLabel) + '</span></div>' +
          '<div class="row"><span class="row__label">Seats</span>' +
            '<span class="stepper">' +
              '<button class="stepper__btn press" data-act="seats" data-delta="-1" aria-label="Remove a seat"' + (state.partySize <= 1 ? ' disabled' : '') + '>−</button>' +
              '<span class="stepper__value" aria-live="polite">' + state.partySize + '</span>' +
              '<button class="stepper__btn press" data-act="seats" data-delta="1" aria-label="Add a seat"' + (state.partySize >= maxPartySize() ? ' disabled' : '') + '>+</button>' +
            '</span>' +
          '</div>' +

          '<div class="label-cap">Promo code</div>' +
          '<div class="field">' +
            '<input id="promo-input" placeholder="Optional" value="' + esc(state.promo ? state.promo.code : '') + '" aria-label="Promo code">' +
            '<button class="field__btn press" data-act="promo">Apply</button>' +
          '</div>' +
          (state.promo
            ? '<p class="note note--good">' + esc(state.promo.code) + ': −' + D.formatGhs(state.promo.discountPesewas) +
              ' → ' + D.formatGhs(fareFinal()) + '</p>'
            : '') +
          (state.promoError ? '<p class="note note--bad">' + esc(state.promoError) + '</p>' : '') +
          (!state.promo && !state.promoError ? '<p class="note note--muted">Try <strong>FRESHER</strong> for 20% off.</p>' : '') +

          '<div class="label-cap">Payment</div>' +
          '<div class="seg" role="group" aria-label="Payment method">' +
            '<button class="seg__btn press' + (state.payment === 'prepaid' ? ' is-on' : '') + '" data-act="pay" data-mode="prepaid"' + (canAfford ? '' : ' disabled') + '>Wallet</button>' +
            '<button class="seg__btn press' + (state.payment === 'pay_after' ? ' is-on' : '') + '" data-act="pay" data-mode="pay_after">Pay later</button>' +
          '</div>' +
          (!canAfford ? '<p class="note note--muted">Balance is low — you can still book and pay cash or top up before the ride ends.</p>' : '') +

          '<div class="row" style="border-top:1px solid var(--outline-variant);margin-top:var(--sp-sm)">' +
            '<span class="row__label">Fare' + (state.partySize > 1 ? ' (×' + state.partySize + ')' : '') + '</span>' +
            '<span class="row__value">' + D.formatGhs(rawFare()) + '</span></div>' +
          (pct > 0
            ? '<div class="row"><span class="row__label row__label--good">Group discount (' + pct + '% off)</span>' +
              '<span class="row__value row__value--good">−' + D.formatGhs(saving) + '</span></div>'
            : '') +
          (state.promo
            ? '<div class="row"><span class="row__label row__label--good">Promo ' + esc(state.promo.code) + '</span>' +
              '<span class="row__value row__value--good">−' + D.formatGhs(state.promo.discountPesewas) + '</span></div>'
            : '') +
          '<div class="row"><span class="row__label">Current balance</span>' +
            '<span class="row__value">' + D.formatGhs(state.balancePesewas) + '</span></div>' +
          '<div class="row row--total">' +
            '<span class="row__label">' + (state.payment === 'prepaid' ? 'Balance after this trip' : 'Total due') + '</span>' +
            '<span class="row__value">' +
              D.formatGhs(state.payment === 'prepaid' ? state.balancePesewas - fareFinal() : fareFinal()) +
            '</span></div>' +
        '</div>' +

        (state.partySize >= 2
          ? '<button class="a-btn a-btn--secondary press" data-act="soon" data-label="Split with friends" style="margin-bottom:var(--sp-md)">' +
            icon('users', 'icon--sm') + 'Split with friends (each pays their share)</button>'
          : '') +

        '<p class="disclaimer">' +
          (state.payment === 'prepaid'
            ? 'Wallet is debited only once the driver accepts — nothing is charged yet.'
            : 'No wallet charge now. Settle with the driver or top up your wallet before the ride ends.') +
        '</p>' +

        '<button class="a-btn a-btn--primary press" data-act="request">Confirm &amp; request driver</button>' +
      '</div>' +
    '</div>';
  }

  /* -- waiting -------------------------------------------------------- */

  function screenWaiting() {
    return '<div class="screen" data-screen="waiting">' +
      '<div class="center-state">' +
        '<div class="radar"><span class="radar__ring"></span><span class="radar__ring"></span><span class="radar__ring"></span><span class="radar__core"></span></div>' +
        '<div class="center-state__title">Waiting for your driver…</div>' +
        '<p class="center-state__body">' +
          (state.payment === 'prepaid'
            ? 'You&rsquo;ll be charged ' + D.formatGhs(fareFinal()) + ' only once they accept.'
            : 'Fare ' + D.formatGhs(fareFinal()) + ' — settle with the driver (or top up) before the ride ends.') +
        '</p>' +
        '<button class="a-btn a-btn--secondary press" style="max-width:230px;margin-top:var(--sp-md)" data-act="cancel-request">Cancel request</button>' +
      '</div>' +
    '</div>';
  }

  /* -- trip ----------------------------------------------------------- */

  function screenTrip() {
    if (!state.driver) {
      return '<div class="screen" data-screen="trip">' +
        '<div class="appbar"><div class="appbar__title">Trip</div></div>' +
        '<div class="center-state">' + icon('route', 'icon--lg') +
          '<div class="center-state__title">No trip in progress</div>' +
          '<p class="center-state__body">Book a ride from Home and it will show up here.</p>' +
          '<button class="a-btn a-btn--primary press" style="max-width:220px;margin-top:var(--sp-md)" data-act="tab" data-tab="home">Find a ride</button>' +
        '</div>' +
      '</div>';
    }

    var c = state.driver;
    var arrived = state.tripProgress >= 100;
    var picked = state.tripProgress >= 45;
    var phase = arrived ? 'Arrived at ' + state.destination.name
      : picked ? 'On the way to ' + state.destination.name
        : c.label + ' is on the way to you';

    return '<div class="screen screen--map" data-screen="trip">' +
      '<div class="map" data-map></div>' +
      '<div class="sheet" style="max-height:70%">' +
        '<div class="sheet__handle"></div>' +
        '<div class="sheet__scroll">' +
          '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--on-surface-variant)">' +
            (arrived ? 'Trip complete' : picked ? 'In the car' : 'Driver en route') + '</div>' +
          '<div style="font-size:22px;font-weight:800;letter-spacing:-.02em;margin:2px 0 var(--sp-sm)">' + esc(phase) + '</div>' +

          '<div class="progress"><div class="progress__bar" data-progress style="width:' + state.tripProgress + '%"></div></div>' +

          '<div class="a-card">' +
            '<div class="driver-card">' +
              '<span class="driver-card__avatar">' + esc(initials(c.driver.name)) + '</span>' +
              '<span>' +
                '<span class="driver-card__name" style="display:block">' + esc(c.driver.name) + '</span>' +
                '<span class="driver-card__car" style="display:block">' + esc(c.driver.car) + ' · ' + esc(c.driver.plate) + '</span>' +
                '<span class="driver-card__car" style="display:block">' + icon('star', 'icon--sm') + ' ' + c.driver.rating + ' · ' + c.driver.trips + ' trips</span>' +
              '</span>' +
              '<span class="driver-card__actions">' +
                '<button class="icon-btn press" data-act="soon" data-label="Call driver" aria-label="Call driver">' + icon('phone', 'icon--sm') + '</button>' +
                '<button class="icon-btn icon-btn--gold press" data-act="soon" data-label="Message driver" aria-label="Message driver">' + icon('message', 'icon--sm') + '</button>' +
              '</span>' +
            '</div>' +
          '</div>' +

          '<div class="timeline">' +
            '<div class="timeline__row">' +
              '<div class="timeline__rail"><span class="timeline__dot"></span><span class="timeline__line"></span></div>' +
              '<div><div class="timeline__label">Pickup</div><div class="timeline__value">' + esc(state.origin.name) + '</div></div>' +
            '</div>' +
            '<div class="timeline__row">' +
              '<div class="timeline__rail"><span class="timeline__dot timeline__dot--sq"></span></div>' +
              '<div><div class="timeline__label">Dropoff</div><div class="timeline__value" style="margin-bottom:0">' + esc(state.destination.name) + '</div></div>' +
            '</div>' +
          '</div>' +

          '<div class="a-card">' +
            '<div class="row"><span class="row__label">Fare</span><span class="row__value">' + D.formatGhs(fareFinal()) + '</span></div>' +
            '<div class="row"><span class="row__label">Paid with</span><span class="row__value">' +
              (state.payment === 'prepaid' ? 'Wallet' : 'Cash to driver') + '</span></div>' +
            '<div class="row"><span class="row__label">Seats</span><span class="row__value">' + state.partySize + '</span></div>' +
          '</div>' +

          (arrived
            ? '<button class="a-btn a-btn--primary press" data-act="finish">Rate and finish</button>'
            : '<button class="a-btn a-btn--secondary press" data-act="cancel-trip">Cancel ride</button>') +
          (arrived ? '' : '<p class="disclaimer">Nothing is refunded on cancelling because nothing has been charged — the fare comes out at drop-off.</p>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* -- wallet --------------------------------------------------------- */

  function screenWallet() {
    return '<div class="screen" data-screen="wallet">' +
      '<div class="appbar"><div class="appbar__title">Wallet</div></div>' +
      '<div class="screen__body">' +
        '<button class="balance press" data-act="topup" style="width:100%;text-align:left;display:block">' +
          '<span class="balance__label" style="display:block">Wallet balance</span>' +
          '<span class="balance__amount" style="display:block">' + D.formatGhs(state.balancePesewas) + '</span>' +
          '<span class="balance__hint" style="display:block">' + icon('plus', 'icon--sm') + ' Tap to add funds</span>' +
        '</button>' +

        '<div class="a-card" style="margin-top:var(--sp-md)">' +
          '<div class="label-cap" style="margin-top:0">Campus passes</div>' +
          D.PASS_PRODUCTS.map(function (p) {
            return '<button class="menu__item press" data-act="soon" data-label="' + esc(p.name) + '">' +
              '<span class="ledger__icon">' + icon('ticket', 'icon--sm') + '</span>' +
              '<span class="menu__label">' + esc(p.name) +
                '<span style="display:block;font-size:12px;font-weight:500;color:var(--on-surface-variant)">' + esc(D.describeProduct(p)) + '</span>' +
              '</span>' + icon('chevron-right', 'icon--sm') +
            '</button>';
          }).join('') +
          '<p class="note note--muted" style="padding:var(--sp-sm) var(--sp-sm) 0">Covers your own seat on each ride — anyone else you book pays their own fare.</p>' +
        '</div>' +

        '<div class="a-card">' +
          '<div class="label-cap" style="margin-top:0">Recent activity</div>' +
          D.WALLET_LEDGER.map(function (r) {
            var inbound = r.amountPesewas > 0;
            return '<div class="ledger__row">' +
              '<span class="ledger__icon">' + icon(inbound ? 'cash' : 'car', 'icon--sm') + '</span>' +
              '<span>' +
                '<span class="ledger__kind" style="display:block">' + esc(r.kind) + '</span>' +
                '<span class="ledger__detail" style="display:block">' + esc(r.detail) + ' · ' + esc(r.when) + '</span>' +
              '</span>' +
              '<span class="ledger__amt' + (inbound ? ' ledger__amt--in' : '') + '">' +
                (inbound ? '+' : '−') + D.formatGhs(Math.abs(r.amountPesewas)) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* -- history -------------------------------------------------------- */

  function screenHistory() {
    return '<div class="screen" data-screen="history">' +
      '<div class="appbar"><div class="appbar__title">History</div></div>' +
      '<div class="screen__body">' +
        '<div class="a-card">' +
          D.TRIP_HISTORY.map(function (t) {
            var tierLabel = (D.RIDE_TIERS.filter(function (o) { return o.tier === t.tier; })[0] || {}).label || '';
            return '<div class="trip-row">' +
              '<span class="ledger__icon">' + icon(t.pooled ? 'users' : 'car', 'icon--sm') + '</span>' +
              '<span style="flex:1;min-width:0">' +
                '<span class="trip-row__route" style="display:block">' + esc(t.from) + ' → ' + esc(t.to) + '</span>' +
                '<span class="trip-row__when" style="display:block">' + esc(t.when) + ' · ' + esc(tierLabel) +
                  (t.pooled ? ' · shared' : '') + '</span>' +
                (t.note ? '<span class="trip-row__note" style="display:block">' + esc(t.note) + '</span>' : '') +
              '</span>' +
              '<span class="trip-row__fare">' + D.formatGhs(t.farePesewas) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="disclaimer">A ride booked from a map pin records where you actually stood — for example &ldquo;Picked up at ≈80 m from Main Gate&rdquo;. You only ever see your own pins.</p>' +
      '</div>' +
    '</div>';
  }

  /* -- profile -------------------------------------------------------- */

  function screenProfile() {
    var s = school();
    var discount = D.formatPartyDiscountSummary();
    return '<div class="screen" data-screen="profile">' +
      '<div class="profile-hero">' +
        '<div class="profile-hero__avatar">' + esc(initials(D.RIDER.fullName)) + '</div>' +
        '<div class="profile-hero__name">' + esc(D.RIDER.fullName) + '</div>' +
        '<div class="profile-hero__school">' + esc(s.name) + '</div>' +
      '</div>' +
      '<div class="screen__body">' +
        '<div class="glance">' +
          '<div class="glance__cell"><div class="glance__value">' + D.formatGhs(state.balancePesewas) + '</div><div class="glance__label">Wallet</div></div>' +
          '<div class="glance__cell"><div class="glance__value">' + D.RIDER.tripCount + '</div><div class="glance__label">Trips</div></div>' +
          '<div class="glance__cell"><div class="glance__value">' + D.RIDER.reservedCount + '</div><div class="glance__label">Reserved</div></div>' +
        '</div>' +

        '<div class="a-card" style="margin-top:var(--sp-md)">' +
          '<div class="label-cap" style="margin-top:0">Ride info</div>' +
          '<div class="row"><span class="row__label">Base fare</span><span class="row__value">' + D.formatGhs(D.FARE.baseFarePesewas) + ' per seat</span></div>' +
          '<div class="row"><span class="row__label">Comfort</span><span class="row__value">' + (s.comfortEnabled ? D.formatGhs(D.tierPerSeatPesewas('comfort')) : 'Not offered here') + '</span></div>' +
          '<div class="row"><span class="row__label">Independent</span><span class="row__value">' + (s.independentEnabled ? D.formatGhs(D.tierPerSeatPesewas('independent')) : 'Not offered here') + '</span></div>' +
          '<div class="row"><span class="row__label">Group discount</span><span class="row__value">' + esc(discount || 'None') + '</span></div>' +
          '<div class="row"><span class="row__label">Pay later</span><span class="row__value">Available when balance is low</span></div>' +
        '</div>' +

        '<div class="a-card">' +
          '<div class="label-cap" style="margin-top:0">Your details</div>' +
          '<div class="row"><span class="row__label">Phone</span><span class="row__value">' + esc(D.RIDER.phone) + '</span></div>' +
          '<div class="row"><span class="row__label">Email</span><span class="row__value">' + esc(D.RIDER.email) + '</span></div>' +
          '<div class="row"><span class="row__label">Campus code</span><span class="row__value">' + esc(s.code) + '</span></div>' +
          '<div class="row"><span class="row__label">Referral code</span><span class="row__value">' + esc(D.RIDER.referralCode) + '</span></div>' +
        '</div>' +

        '<div class="a-card">' +
          '<div class="label-cap" style="margin-top:0">Preferences</div>' +
          '<button class="menu__item press" data-act="toggle-mode">' +
            '<span class="ledger__icon">' + icon(T.mode === 'dark' ? 'sun' : 'moon', 'icon--sm') + '</span>' +
            '<span class="menu__label">Appearance</span>' +
            '<span class="menu__value">' + (T.mode === 'dark' ? 'Dark' : 'Light') + '</span>' +
          '</button>' +
          '<button class="menu__item press" data-act="soon" data-label="Safety">' +
            '<span class="ledger__icon">' + icon('shield', 'icon--sm') + '</span>' +
            '<span class="menu__label">Safety</span>' + icon('chevron-right', 'icon--sm') +
          '</button>' +
          '<button class="menu__item press" data-act="soon" data-label="Help">' +
            '<span class="ledger__icon">' + icon('compass', 'icon--sm') + '</span>' +
            '<span class="menu__label">Help &amp; booking tips</span>' + icon('chevron-right', 'icon--sm') +
          '</button>' +
          '<button class="menu__item press" data-act="sign-out">' +
            '<span class="ledger__icon">' + icon('arrow-left', 'icon--sm') + '</span>' +
            '<span class="menu__label" style="color:var(--danger)">Sign out</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---- tab bar ------------------------------------------------------ */

  var TAB_META = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'trip', label: 'Trip', icon: 'route' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'profile', label: 'Profile', icon: 'account' },
  ];

  function tabBar() {
    var active = current();
    return '<nav class="tabbar" aria-label="Main">' +
      TAB_META.map(function (t) {
        var on = t.id === active;
        return '<button class="tab press' + (on ? ' is-on' : '') + '" data-act="tab" data-tab="' + t.id + '"' +
          (on ? ' aria-current="page"' : '') + '>' +
          '<span class="tab__icon">' + icon(t.icon, 'icon--lg') + '</span>' +
          '<span class="tab__label">' + t.label + '</span>' +
        '</button>';
      }).join('') +
    '</nav>';
  }

  /* ---- render ------------------------------------------------------- */

  var BUILDERS = {
    login: screenLogin, home: screenHome, plan: screenPlan, drivers: screenDrivers,
    confirm: screenConfirm, waiting: screenWaiting, trip: screenTrip,
    wallet: screenWallet, history: screenHistory, profile: screenProfile,
  };

  var SCROLLERS = '.screen__body, .sheet__scroll';

  /* A re-render rebuilds the screen's markup, which throws away where the
     rider had scrolled to. On this screen that is not cosmetic: adding a seat
     or applying a promo re-renders, and without this the rider is thrown back
     to the top of the page every time they change the thing whose effect they
     are trying to read further down. Only same-screen re-renders restore —
     arriving on a genuinely new screen should start at the top. */
  function captureScroll(el) {
    var out = [];
    if (el) Array.prototype.forEach.call(el.querySelectorAll(SCROLLERS), function (n) {
      out.push(n.scrollTop);
    });
    return out;
  }

  function restoreScroll(el, tops) {
    if (!el || !tops || !tops.length) return;
    Array.prototype.forEach.call(el.querySelectorAll(SCROLLERS), function (n, i) {
      if (tops[i]) n.scrollTop = tops[i];
    });
  }

  function render(direction) {
    var name = current();
    var previous = screensEl.querySelector('.screen.is-active');
    var sameScreen = previous && previous.getAttribute('data-screen') === name;
    var tops = sameScreen ? captureScroll(previous) : null;

    var next = h(BUILDERS[name]());
    screensEl.appendChild(next);
    if (tops) restoreScroll(next, tops);

    // Any screen carrying a map gets one drawn now that it is in the document.
    var mapHost = next.querySelector('[data-map]');
    if (mapHost) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      mapHost.appendChild(svg);
      M.render(svg, school(), {
        originId: state.origin && state.origin.id,
        destinationId: state.destination && state.destination.id,
        cars: name !== 'trip',
      });
    }

    var showTabs = TABS.indexOf(name) !== -1;
    root.querySelector('[data-tabbar]').innerHTML = showTabs ? tabBar() : '';
    root.querySelector('[data-status]').innerHTML = name === 'login' ? statusBar() : statusBar();

    if (!previous || direction === 'none' || prefersReducedMotion()) {
      if (previous) previous.remove();
      next.classList.add('is-active');
      return;
    }

    // Two frames: one to commit the incoming screen's off-stage position, one
    // to start the transition from it. Skipping this makes the browser collapse
    // both into a single style resolution and the screen simply appears.
    if (direction === 'pop') next.classList.add('is-entering-back');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        next.classList.add('is-animating');
        previous.classList.add('is-animating', direction === 'pop' ? 'is-leaving-back' : 'is-leaving');
        next.classList.remove('is-entering-back');
        next.classList.add('is-active');

        var done = false;
        function cleanup() {
          if (done) return;
          done = true;
          previous.remove();
          next.classList.remove('is-animating');
        }
        next.addEventListener('transitionend', cleanup, { once: true });
        // transitionend does not fire if the element is hidden mid-flight
        // (tab backgrounded, demo closed). The timer is the guarantee that the
        // outgoing screen is removed either way.
        setTimeout(cleanup, 420);
      });
    });
  }

  /* ---- trip simulation --------------------------------------------- */

  function startTrip() {
    clearInterval(tripTimer);
    state.tripProgress = 0;
    tripTimer = setInterval(function () {
      state.tripProgress = Math.min(100, state.tripProgress + 6);
      var bar = root.querySelector('[data-progress]');
      if (bar) bar.style.width = state.tripProgress + '%';
      if (state.tripProgress >= 100) {
        clearInterval(tripTimer);
        if (current() === 'trip') render('none');
      } else if (state.tripProgress === 48 && current() === 'trip') {
        render('none');
      }
    }, 900);
  }

  /* ---- actions ------------------------------------------------------ */

  var ACTIONS = {
    'sign-in': function () {
      state.signedIn = true;
      reset('home');
      toast('Signed in as ' + D.RIDER.fullName.split(' ')[0]);
    },

    'sign-out': function () {
      state.signedIn = false;
      state.driver = null;
      clearInterval(tripTimer);
      reset('login');
    },

    plan: function (el) {
      var mode = el.getAttribute('data-mode');
      state.picking = 'origin';
      go('plan');
      if (mode && mode !== 'now') {
        toast(mode === 'reserve' ? 'Reserve: pick your stops first' : 'Routine ride: pick your stops first');
      }
    },

    'pick-field': function (el) {
      state.picking = el.getAttribute('data-which');
      render('none');
    },

    'pick-stop': function (el) {
      var id = el.getAttribute('data-id');
      var node = school().nodes.filter(function (n) { return n.id === id; })[0];
      if (!node) return;
      if (state.picking === 'origin') {
        state.origin = node;
        // Auto-advance to dropoff only while it is still empty. Once both are
        // set, tapping a stop should change the field the rider actually
        // selected, not silently move the cursor somewhere else.
        if (!state.destination) state.picking = 'destination';
      } else {
        state.destination = node;
        if (!state.origin) state.picking = 'origin';
      }
      render('none');
    },

    swap: function () {
      var o = state.origin;
      state.origin = state.destination;
      state.destination = o;
      render('none');
    },

    'see-drivers': function () {
      state.candidates = makeCandidates();
      go('drivers');
    },

    tier: function (el) {
      state.tier = el.getAttribute('data-tier');
      if (state.partySize > maxPartySize()) state.partySize = maxPartySize();
      state.candidates = makeCandidates();
      render('none');
    },

    'choose-driver': function (el) {
      state.driver = state.candidates[Number(el.getAttribute('data-i'))];
      go('confirm');
    },

    seats: function (el) {
      var delta = Number(el.getAttribute('data-delta'));
      state.partySize = Math.max(1, Math.min(maxPartySize(), state.partySize + delta));
      render('none');
    },

    pay: function (el) {
      state.payment = el.getAttribute('data-mode');
      render('none');
    },

    promo: function () {
      var input = root.querySelector('#promo-input');
      var code = (input ? input.value : '').trim().toUpperCase();
      if (!code) return;
      if (code === 'FRESHER') {
        var base = fareAfterGroup();
        state.promo = { code: code, discountPesewas: Math.round(base * 0.2) };
        state.promoError = null;
      } else {
        state.promo = null;
        state.promoError = 'Invalid promo';
      }
      render('none');
    },

    request: function () {
      go('waiting');
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        if (current() !== 'waiting') return;
        if (state.payment === 'prepaid') {
          state.balancePesewas = Math.max(0, state.balancePesewas - fareFinal());
        }
        state.tab = 'trip';
        stack = ['trip'];
        render('push');
        startTrip();
        toast(state.driver.driver.name + ' accepted your ride');
      }, 2400);
    },

    'cancel-request': function () {
      clearTimeout(searchTimer);
      back();
    },

    'cancel-trip': function () {
      clearInterval(tripTimer);
      state.driver = null;
      state.tripProgress = 0;
      stack = ['home'];
      state.tab = 'home';
      render('none');
      toast('Ride cancelled — nothing was charged');
    },

    finish: function () {
      clearInterval(tripTimer);
      state.driver = null;
      state.tripProgress = 0;
      stack = ['home'];
      state.tab = 'home';
      render('none');
      toast('Thanks — trip saved to your history');
    },

    topup: function () {
      state.balancePesewas += 2000;
      render('none');
      toast('GHS 20.00 added from MoMo');
    },

    tab: function (el) { selectTab(el.getAttribute('data-tab')); },

    back: function () { back(); },

    'toggle-mode': function () { T.toggleMode(); },

    soon: function (el) {
      toast(el.getAttribute('data-label') + ' — in the app, not in this demo');
    },
  };

  /* ---- mount -------------------------------------------------------- */

  function build() {
    root = h(
      '<div style="display:flex;flex-direction:column;height:100%;position:relative">' +
        '<div data-status></div>' +
        '<div class="screens" data-screens></div>' +
        '<div class="toast" role="status" aria-live="polite"></div>' +
        '<div data-tabbar></div>' +
      '</div>'
    );
    screensEl = root.querySelector('[data-screens]');
    toastEl = root.querySelector('.toast');

    root.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      var fn = ACTIONS[el.getAttribute('data-act')];
      if (fn) { ev.preventDefault(); fn(el); }
    });

    // Enter in the promo field applies it, rather than doing nothing.
    root.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ev.target.id === 'promo-input') {
        ev.preventDefault();
        ACTIONS.promo();
      }
    });

    render('none');
    return root;
  }

  /** Move the single app instance into a new host, keeping all state. */
  function mountInto(host) {
    if (!root) build();
    if (root.parentNode !== host) host.appendChild(root);
  }

  /** Jump the demo to a named point — used by the landing page's shortcuts. */
  function jumpTo(target) {
    var s = school();
    if (!state.signedIn) state.signedIn = true;
    if (target === 'plan') {
      state.origin = state.origin || s.nodes[0];
      state.picking = 'destination';
      stack = ['home', 'plan'];
    } else if (target === 'drivers') {
      state.origin = state.origin || s.nodes[0];
      state.destination = state.destination || s.nodes[3];
      state.candidates = makeCandidates();
      stack = ['home', 'plan', 'drivers'];
    } else if (target === 'confirm') {
      state.origin = state.origin || s.nodes[0];
      state.destination = state.destination || s.nodes[3];
      state.candidates = makeCandidates();
      state.driver = state.candidates[0];
      stack = ['home', 'plan', 'drivers', 'confirm'];
    } else if (target === 'trip') {
      // A shortcut labelled "Follow the trip" that lands on "no trip in
      // progress" demonstrates nothing. Book one first, and start it partway
      // through so the screen shows a ride under way rather than one that has
      // not left yet.
      state.origin = state.origin || s.nodes[0];
      state.destination = state.destination || s.nodes[3];
      if (!state.driver) {
        state.candidates = makeCandidates();
        state.driver = state.candidates[0];
      }
      state.tab = 'trip';
      stack = ['trip'];
      render('none');
      startTrip();
      state.tripProgress = 24;
      var bar = root.querySelector('[data-progress]');
      if (bar) bar.style.width = '24%';
      return;
    } else if (target && BUILDERS[target]) {
      stack = [target];
      if (TABS.indexOf(target) !== -1) state.tab = target;
    } else {
      stack = ['home'];
    }
    render('none');
  }

  /* A campus switch has to reach into the app, not just the page: the stops
     the rider can pick, the tiers on offer and the fares all belong to the
     school. Anything already selected from the old campus is dropped rather
     than carried over as a stop that no longer exists. */
  T.onChange(function () {
    if (!root) return;
    if (state.schoolCode !== T.school) {
      state.schoolCode = T.school;
      state.origin = null;
      state.destination = null;
      state.driver = null;
      state.candidates = [];
      state.tier = 'standard';
      state.partySize = 1;
      state.promo = null;
      state.promoError = null;
      clearInterval(tripTimer);
      clearTimeout(searchTimer);
      state.tripProgress = 0;
      if (['plan', 'drivers', 'confirm', 'waiting', 'trip'].indexOf(current()) !== -1) {
        stack = [state.signedIn ? 'home' : 'login'];
      }
    }
    render('none');
  });

  global.TraverseApp = {
    mountInto: mountInto,
    jumpTo: jumpTo,
    get state() { return state; },
  };
})(window);
