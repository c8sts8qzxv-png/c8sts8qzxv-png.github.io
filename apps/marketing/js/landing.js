/* ============================================================================
   landing.js — the page around the app
   ----------------------------------------------------------------------------
   Renders the parts of the page that come from the fixtures in js/data.js,
   drives the demo phone, and sizes it.

   Gone with the Uber skin: the campus switcher (nav and headline), the dark
   mode toggle, and the scroll-reveal fade. uber.com has none of the three,
   and only one campus is open, so the page renders the live campus.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.TraverseData;
  var App = global.TraverseApp;
  var M = global.TraverseMap;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#ic-' + name + '"/></svg>';
  }

  // The campus you can actually ride on. schoolByCode falls back to the live
  // campus rather than SCHOOLS[0], so this can never land on a closed school.
  var school = D.liveSchools()[0] || D.SCHOOLS[0];

  /* ======================================================================
     Hero
     ====================================================================== */

  function renderHero() {
    $('#hero-campus').textContent = school.short;
    $('#hero-campus-title').textContent = school.short;
    $('#widget-origin').textContent = school.nodes[0].name;
    $('#widget-destination').textContent = school.nodes[3].name;

    // The table prices a party as one total, so that is the thing worth saying.
    $('#widget-meta').textContent = 'Your campus sets the fare · groups pay one price';

    // Counted, never typed: a hand-typed "3" outlived the tier it counted.
    var live = D.liveSchools();
    $('#stat-campuses').textContent = live.length;
    $('#stat-campuses-label').textContent = live.length === 1 ? 'campus open now' : 'campuses open now';
    // The real count, not the length of the demo sample (see data.js stopCount).
    $('#stat-stops').textContent = school.stopCount || school.nodes.length;
    var ways = 1 + (school.independentEnabled ? 1 : 0);
    $('#stat-tiers').textContent = ways;
    $('#stat-tiers-label').textContent = ways === 1 ? 'way to ride' : 'ways to ride';

    drawMap($('#hero-map'), { cars: true, labels: true });
  }

  function drawMap(host, opts) {
    if (!host) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.innerHTML = '';
    host.appendChild(svg);
    M.render(svg, school, {
      originId: school.nodes[0].id,
      destinationId: school.nodes[3].id,
      cars: opts.cars,
      labels: opts.labels,
    });
  }

  /* ======================================================================
     Features — uber.com "Explore" cards
     ====================================================================== */

  var FEATURES = [
    { icon: 'car', title: 'Book a ride right now', body: 'Pick where you are going, see who is actually nearby, and book. The list shows real seat counts, not a spinner and a promise.' },
    { icon: 'users', title: 'Share it and pay less', body: 'If someone is already heading your way, the app pools you into their car instead of sending a second one. Same driver, a route that already made sense.' },
    { icon: 'calendar-clock', title: 'Book ahead', body: 'Need a ride in three hours, or tomorrow at 6am? Reserve it. A driver is matched close to the time you asked for.' },
    { icon: 'calendar-sync', title: 'Set a routine ride', body: 'Every weekday at 5:05am, set once. Pause it when you are away, cancel it when the semester ends. It keeps booking itself.' },
    { icon: 'gift', title: 'Split with friends', body: 'Organise a ride together and everyone pays their own share, instead of one person covering the car and chasing the rest.' },
    { icon: 'person', title: 'Book for someone else', body: 'A friend without the app, or a visitor. Book and pay for them; they get the driver details and a tracking link by text. No account needed.' },
    { icon: 'ticket', title: 'Passes and bundles', body: 'A pass for a set number of days, or a bundle of a fixed number of rides. Either way it covers your own seat — and the app says so before you buy.' },
    { icon: 'pin', title: 'Save the spots you use', body: 'Drop a pin where you actually stand, name it yourself, pick it again next time. Your history records the nearest stop and how far off it was.' },
    { icon: 'cash', title: 'Pay how you like', body: 'Settle with the driver after the ride, or from a wallet where your campus has a top-up rail running. A low balance never blocks a booking.' },
    { icon: 'compass', title: 'Watch it come in', body: 'Once a driver accepts you get the car, the plate and a number to call. The route draws as the stops you already know by name.' },
    { icon: 'star', title: 'Bring people in, earn on it', body: 'Every rider gets a code at sign-up. When someone joins on it you earn a share of the platform’s own cut — never of their fare — paid into your wallet automatically.' },
    { icon: 'shield', title: 'Get help fast', body: 'One button texts a trusted contact your ride details and where you are. The alert is recorded, not only sent, so there is something to look at afterwards.' },
    { icon: 'phone', title: 'Call without swapping numbers', body: 'Ring your driver from inside the app or the website. Neither of you ever sees the other\u2019s number, and the call goes through a relay when a campus network will not let two phones talk directly.' },
    { icon: 'users', title: 'More of you than one car holds', body: 'Six friends are a car of four and a car of two, each priced on its own and each matched to its own driver. Nobody is left working out who owes what.' },
    { icon: 'calendar-clock', title: 'A full time slot is not a dead end', body: 'If the hour you asked for is taken, join the waitlist, take a nearby time, do both, or split the party across two times \u2014 the app prices each option before you choose.' },
    { icon: 'ticket', title: 'Promo codes', body: 'A code takes an amount off the fare or off a pass, and the app shows the new total before you book rather than after.' },
  ];

  function renderFeatures() {
    $('#feature-grid').innerHTML = FEATURES.map(function (f) {
      return '<li class="card">' +
        '<div class="card__text">' +
          '<h3 class="card__title">' + esc(f.title) + '</h3>' +
          '<p class="card__body">' + esc(f.body) + '</p>' +
        '</div>' +
        '<span class="card__art" aria-hidden="true">' + icon(f.icon) + '</span>' +
      '</li>';
    }).join('');
  }

  /* ======================================================================
     Ride types
     ====================================================================== */

  function seatRow(tier) {
    var meta = D.RIDE_TIERS.filter(function (t) { return t.tier === tier; })[0];
    var out = [];
    for (var i = 0; i < 4; i++) {
      if (i === 0) out.push('<span class="seat is-you" title="You">' + icon('person', 'icon--sm') + '</span>');
      else if (i < meta.seatsSold) out.push('<span class="seat" title="Sold to someone else">' + icon('person', 'icon--sm') + '</span>');
      else out.push('<span class="seat is-empty" title="Not sold"></span>');
    }
    return out.join('');
  }

  /* No money on these cards, deliberately. A ride type is a choice about who
     else is in the car; what it costs is stated below, as prices. */
  function renderTiers() {
    var offered = { standard: true, independent: school.independentEnabled };
    $('#tier-cards').innerHTML = D.RIDE_TIERS.map(function (t) {
      var on = offered[t.tier];
      return '<article class="tier-card' + (on ? '' : ' is-off') + '">' +
        '<div class="tier-card__top">' +
          '<h3 class="tier-card__name">' + icon(t.icon, 'icon--lg') + esc(t.label) + '</h3>' +
          (t.tier === 'standard' ? '<span class="pill pill--black">Most booked</span>' : '') +
        '</div>' +
        '<p class="tier-card__blurb">' + esc(t.blurb) + '</p>' +
        (on ? '' : '<p class="tier-card__off">' + esc(school.short) + ' has this ride type switched off</p>') +
        '<div class="tier-card__seats" aria-label="Seats sold on this ride type">' + seatRow(t.tier) + '</div>' +
      '</article>';
    }).join('');
  }

  function renderPasses() {
    $('#pass-list').innerHTML = D.PASS_PRODUCTS.map(function (p) {
      return '<li class="pass">' +
        '<p><span class="pass__name">' + esc(p.name) + '</span>' +
          '<span class="pass__desc">' + esc(D.describeProduct(p)) + '</span></p>' +
        '<span class="pass__price">Set by campus</span>' +
      '</li>';
    }).join('');
  }

  /* ======================================================================
     Demo steps
     ====================================================================== */

  var STEPS = [
    { target: 'home', title: 'Open the app', body: 'Campus map, and one question: where are you going?' },
    { target: 'plan', title: 'Pick your stops', body: 'Only the stops your campus actually has. Pickup and dropoff cannot be the same one.' },
    { target: 'drivers', title: 'Choose a ride', body: 'Prices from your campus’s fare table, by distance. Cards show seats taken, ETA, and whether it is a shared car.' },
    { target: 'confirm', title: 'Confirm and pay', body: 'Add seats and watch the group price appear. Paying from the wallet costs less. Nothing is charged yet.' },
    { target: 'trip', title: 'Follow the trip', body: 'Driver, car, plate, and a route that moves. The fare comes out at drop-off.' },
    { target: 'wallet', title: 'Check the wallet', body: 'Where the money went, and how to add more. Passes and promo codes live here too.' },
  ];

  function renderSteps() {
    $('#demo-steps').innerHTML = STEPS.map(function (s, i) {
      return '<li><button class="step" type="button" data-target="' + s.target + '">' +
        '<span class="step__n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span><span class="step__title">' + esc(s.title) + '</span>' +
        '<span class="step__body">' + esc(s.body) + '</span></span>' +
      '</button></li>';
    }).join('');
  }

  $('#demo-steps').addEventListener('click', function (ev) {
    var step = ev.target.closest('[data-target]');
    if (!step) return;
    $$('.step').forEach(function (n) { n.classList.remove('is-on'); n.removeAttribute('aria-current'); });
    step.classList.add('is-on');
    step.setAttribute('aria-current', 'step');
    App.jumpTo(step.getAttribute('data-target'));
    if (isPhone()) openDemo();
    else if (!inView($('#device-fit'))) $('#device-fit').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= (global.innerHeight || document.documentElement.clientHeight);
  }

  /* ======================================================================
     FAQ — native <details>, as uber.com/ride
     ====================================================================== */

  var FAQ = [
    ['Is the price on screen the price I pay?',
      'Yes. The app will not let you book until the server has quoted the fare — there is no compiled-in fallback price anywhere in the rider app, deliberately. If the quote has not arrived, the button says “Getting the fare…” rather than guessing a number that looks right and is not.'],
    ['What happens if I cancel?',
      'Nothing is refunded, because nothing has been charged. The fare comes out at drop-off, not when you book. The driver is told straight away so the seat goes back to the car.'],
    ['Does sharing make me late?',
      'It is allowed to, but only by an amount the campus sets. Every pooled match is scored on the extra delay it adds to the trip already running, and if that exceeds the cap the match is rejected and you get your own car instead.'],
    ['Does a pass cover my friends?',
      'No — a pass covers your own seat. If you book for three, you pay for the other two. The app says this on the pass before you buy it, because the wrong moment to find out is at drop-off.'],
    ['What if I have no money in the wallet?',
      'Book anyway. “Pay later” settles with the driver directly, or you can top up before the ride ends. A low balance disables the wallet option, not the booking.'],
    ['Do I need money in the app before I can ride?',
      'No. Paying the driver after the trip works on every campus and always has. The wallet is the other option, and which top-up rail is switched on is a campus decision — the app offers wallet payment only where one is actually running.'],
    ['Do I have to install anything?',
      'No. rider.traversegh.com is the same app, opened as a web page \u2014 booking, tracking, calling, SOS, reserving, routines, the wallet, all of it. The Android and iOS builds are the same code for people who would rather have an icon on their home screen.'],
    ['Why is there no password?',
      'Because a password on a phone that already receives a code is one more thing to forget and one more thing to leak. Signing in is a code to your email, then a code to your phone. Administrators still use passwords; riders and drivers do not.'],
    ['Can a driver see who I am before the ride?',
      'No. Rider and driver identities stay hidden from each other until a ride is confirmed. That is deliberate — it stops anyone reading a list, picking a person out of it, and going around the app to reach them.'],
    ['What if the paperwork on a car has lapsed?',
      'The app records every licence, insurance and roadworthiness date and flags the moment one lapses. It does not quietly drop that driver from dispatch. A driver who vanishes from the queue with nothing said to anybody is the worse failure, so a person who can see the flag makes the call.'],
    ['Why does my history say “≈80 m from Balme Library”?',
      'Because you booked from a map pin rather than a listed stop, and that is where you actually stood. A phone’s idea of its own position on a campus is routinely out by about that much, so the app records the nearest stop and the distance rather than pretending to be precise.'],
  ];

  function renderFaq() {
    $('#faq').innerHTML = FAQ.map(function (row) {
      return '<details class="faq__item">' +
        '<summary class="faq__q">' + esc(row[0]) + icon('chevron-down', 'icon--lg faq__chev') + '</summary>' +
        '<p class="faq__a">' + esc(row[1]) + '</p>' +
      '</details>';
    }).join('');
  }

  /* ======================================================================
     Off-campus place list

     The list ships open. This re-opens it for somebody who collapsed it and
     then followed the footer link back expecting to see it.
     ====================================================================== */

  function renderOffCampus() {
    var places = $('#off-campus-places');
    var elsewhere = $('#off-campus-elsewhere');
    if (!places) return;
    var belongsTo = places.getAttribute('data-campus');
    var mine = !belongsTo || belongsTo === school.code;
    places.hidden = !mine;
    if (elsewhere) elsewhere.hidden = mine;
  }

  function openOffCampusIfTargeted() {
    if (global.location.hash !== '#off-campus') return;
    var panel = $('#off-campus .place-panel');
    if (panel) panel.open = true;
  }
  global.addEventListener('hashchange', openOffCampusIfTargeted);

  /* ======================================================================
     The phone: sizing, and the full-screen overlay on a phone
     ====================================================================== */

  var fit = $('#device-fit');
  var DEVICE_W = 463; // iPhone 15 Pro Max body, in pt - see css/app.css

  function sizeDevice() {
    var avail = fit.parentElement.clientWidth;
    var scale = Math.min(1, avail / DEVICE_W);
    fit.style.setProperty('--device-scale', scale.toFixed(4));
  }
  if ('ResizeObserver' in global) new ResizeObserver(sizeDevice).observe(fit.parentElement);
  else global.addEventListener('resize', sizeDevice);

  var overlay = $('#demo-overlay');
  var inlineHost = $('#device-screen');
  var overlayHost = $('#device-screen-overlay');
  var lastFocused = null;

  // Below 600px the inline phone is a scaled-down preview, too small to use,
  // so interacting opens the app full screen instead.
  function isPhone() { return global.matchMedia('(max-width: 599px)').matches; }

  function openDemo() {
    lastFocused = document.activeElement;
    App.mountInto(overlayHost);
    overlay.classList.add('is-open');
    document.body.classList.add('is-locked');
    $('#demo-close').focus();
  }

  function closeDemo() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    // Wait for the fade before moving the app back, or the overlay visibly
    // empties itself on the way out.
    setTimeout(function () {
      if (!overlay.classList.contains('is-open')) App.mountInto(inlineHost);
    }, 220);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  $$('[data-open-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (isPhone()) openDemo();
      else $('#device-fit').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // On a phone, tapping the preview itself opens the real-size app.
  fit.addEventListener('click', function (ev) {
    if (!isPhone()) return;
    ev.preventDefault();
    ev.stopPropagation();
    openDemo();
  }, true);

  $('#demo-close').addEventListener('click', closeDemo);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && overlay.classList.contains('is-open')) closeDemo();
  });

  /* ======================================================================
     Boot
     ====================================================================== */

  renderHero();
  renderFeatures();
  renderTiers();
  renderPasses();
  drawMap($('#pool-stage'), { cars: true, labels: true });
  renderSteps();
  renderFaq();
  renderOffCampus();
  openOffCampusIfTargeted();
  sizeDevice();
  App.mountInto(inlineHost);
})(window);
