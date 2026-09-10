/* ============================================================================
   landing.js — the page around the app
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.TraverseData;
  var T = global.TraverseTheme;
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

  function school() { return D.schoolByCode(T.school); }

  /* ======================================================================
     Campus switcher

     Two of these now: the one in the nav, and the campus name inside the
     headline. One factory builds both - a hand-wired second copy is exactly
     how the two would drift apart.
     ====================================================================== */

  var SWITCHERS = [];

  function makeSwitcher(rootId, btnId, menuId, labelId) {
    var root = $('#' + rootId), btn = $('#' + btnId), menu = $('#' + menuId);
    if (!root || !btn || !menu) return null;

    var api = {
      root: root,
      btn: btn,
      isOpen: function () { return root.classList.contains('is-open'); },
      close: function () {
        root.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      },
      render: function () {
        menu.innerHTML = D.schoolsForDisplay().map(function (s) {
          var pal = T.getSchoolPalette(s.code);
          var on = s.code === T.school;
          /* is-on was styled in landing.css but never applied by the original
             render, so the selected row had no highlight. */
          return '<button class="switcher__item press' + (on ? ' is-on' : '') + '"' +
            ' role="menuitemradio" aria-checked="' + on + '" data-school="' + esc(s.code) + '">' +
            '<span class="switcher__dots">' +
              '<span class="switcher__dot" style="background:' + pal.primary + '"></span>' +
              '<span class="switcher__dot" style="background:' + pal.secondary + '"></span>' +
            '</span>' +
            '<span style="flex:1;min-width:0">' +
              '<span class="switcher__name" style="display:block">' + esc(s.short) +
                (s.live ? '' : '<span class="soon">Coming soon</span>') + '</span>' +
              '<span class="switcher__code" style="display:block">' + esc(s.name) + '</span>' +
            '</span>' +
            (on ? icon('check', 'icon--sm') : '') +
          '</button>';
        }).join('');
        if (labelId && $('#' + labelId)) $('#' + labelId).textContent = school().short;
      },
    };

    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = root.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      /* Only ever one open at a time, or picking a campus from the headline
         leaves the nav copy hanging open behind it. */
      if (open) SWITCHERS.forEach(function (o) { if (o !== api) o.close(); });
    });

    menu.addEventListener('click', function (ev) {
      var item = ev.target.closest('[data-school]');
      if (!item) return;
      T.setSchool(item.getAttribute('data-school'));
      SWITCHERS.forEach(function (o) { o.close(); });
    });

    SWITCHERS.push(api);
    return api;
  }

  makeSwitcher('switcher', 'switcher-btn', 'switcher-menu', 'switcher-label');
  makeSwitcher('hero-switcher', 'hero-switcher-btn', 'hero-switcher-menu', 'hero-switcher-label');

  function renderSwitcher() {
    SWITCHERS.forEach(function (s) { s.render(); });
  }

  document.addEventListener('click', function (ev) {
    SWITCHERS.forEach(function (s) { if (!s.root.contains(ev.target)) s.close(); });
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var open = SWITCHERS.filter(function (s) { return s.isOpen(); })[0];
    if (open) { open.close(); open.btn.focus(); return; }
    if (overlay.classList.contains('is-open')) closeDemo();
  });

  /* ======================================================================
     Mode toggle
     ====================================================================== */

  var modeToggle = $('#mode-toggle');

  function renderModeToggle() {
    var dark = T.mode === 'dark';
    $('#mode-icon').setAttribute('href', dark ? '#ic-sun' : '#ic-moon');
    modeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  modeToggle.addEventListener('click', function () { T.toggleMode(); });

  /* ======================================================================
     Content that depends on the selected campus
     ====================================================================== */

  var FEATURES = [
    { icon: 'car', gold: false, title: 'Book a ride right now', body: 'Pick where you are going, see who is actually nearby, and book. The list shows real seat counts, not a spinner and a promise.' },
    { icon: 'users', gold: true, title: 'Share it and pay less', body: 'If someone is already heading your way, the app pools you into their car instead of sending a second one. Same driver, a route that already made sense.' },
    { icon: 'calendar-clock', gold: false, title: 'Book ahead', body: 'Need a ride in three hours, or tomorrow at 6am? Reserve it. A driver is matched close to the time you asked for.' },
    { icon: 'calendar-sync', gold: false, title: 'Set a routine ride', body: 'Every weekday at 5:05am, set once. Pause it when you are away, cancel it when the semester ends. It keeps booking itself.' },
    { icon: 'gift', gold: true, title: 'Split with friends', body: 'Organise a ride together and everyone pays their own share, instead of one person covering the car and chasing the rest.' },
    { icon: 'person', gold: false, title: 'Book for someone else', body: 'A friend without the app, or a visitor. Book and pay for them; they get the driver details and a tracking link by text. No account needed.' },
    { icon: 'ticket', gold: false, title: 'Passes and bundles', body: 'A pass for a set number of days, or a bundle of a fixed number of rides. Either way it covers your own seat — and the app says so before you buy.' },
    { icon: 'pin', gold: false, title: 'Save the spots you use', body: 'Drop a pin where you actually stand, name it yourself, pick it again next time. Your history records the nearest stop and how far off it was.' },
    { icon: 'cash', gold: true, title: 'Pay how you like', body: 'Settle with the driver after the ride, or from a wallet where your campus has a top-up rail running. A low balance never blocks a booking.' },
    { icon: 'compass', gold: false, title: 'Watch it come in', body: 'Once a driver accepts you get the car, the plate and a number to call. The route draws as the stops you already know by name.' },
    { icon: 'star', gold: true, title: 'Bring people in, earn on it', body: 'Every rider gets a code at sign-up. When someone joins on it you earn a share of the platform’s own cut — never of their fare — paid into your wallet automatically.' },
    { icon: 'shield', gold: false, title: 'Get help fast', body: 'One button texts a trusted contact your ride details and where you are. The alert is recorded, not only sent, so there is something to look at afterwards.' },
  ];

  function renderFeatures() {
    $('#feature-grid').innerHTML = FEATURES.map(function (f, i) {
      return '<article class="feature reveal" style="--reveal-delay:' + Math.min(i * 50, 300) + 'ms">' +
        '<div class="feature__icon' + (f.gold ? ' feature__icon--gold' : '') + '">' + icon(f.icon) + '</div>' +
        '<h3>' + esc(f.title) + '</h3>' +
        '<p>' + esc(f.body) + '</p>' +
      '</article>';
    }).join('');
  }

  function seatRow(tier) {
    var meta = D.RIDE_TIERS.filter(function (t) { return t.tier === tier; })[0];
    var capacity = 4;
    var out = [];
    for (var i = 0; i < capacity; i++) {
      if (i === 0) out.push('<span class="tier-card__seat is-you" title="You">' + icon('person', 'icon--sm') + '</span>');
      else if (i < meta.seatsSold) out.push('<span class="tier-card__seat" title="Sold to someone else">' + icon('person', 'icon--sm') + '</span>');
      else out.push('<span class="tier-card__seat is-empty" title="Not sold"></span>');
    }
    return out.join('');
  }

  function renderTiers() {
    var s = school();
    var offered = { standard: true, comfort: s.comfortEnabled, independent: s.independentEnabled };

    $('#tier-cards').innerHTML = D.RIDE_TIERS.map(function (t, i) {
      var on = offered[t.tier];
      return '<article class="tier-card' + (t.tier === 'standard' ? ' is-featured' : '') + '"' +
        (on ? '' : ' style="opacity:.55"') + '>' +
        (t.tier === 'standard' ? '<span class="tier-card__flag">Most booked</span>' : '') +
        '<div style="display:flex;align-items:center;gap:10px">' + icon(t.icon, 'icon--lg') +
          '<span class="tier-card__name">' + esc(t.label) + '</span></div>' +
        (on
          ? '<div class="tier-card__price" style="font-size:1.5rem">' +
              (t.tier === 'standard'
                ? 'Base fare'
                : '+' + (t.tier === 'comfort' ? D.FARE.comfortSurchargePct : D.FARE.independentSurchargePct) + '%') +
            '</div>' +
            '<div class="tier-card__unit">per seat' +
              (t.tier === 'standard' ? ', as your campus sets it' : ' on your campus\u2019s base fare') +
            '</div>'
          : '<div class="tier-card__price" style="font-size:1.25rem">Not offered</div>' +
            '<div class="tier-card__unit">' + esc(s.short) + ' has this tier switched off</div>') +
        '<p class="tier-card__blurb">' + esc(t.blurb) + '</p>' +
        '<div class="tier-card__seats" aria-label="Seats sold on this tier">' + seatRow(t.tier) + '</div>' +
      '</article>';
    }).join('');
  }

  function renderPasses() {
    $('#pass-list').innerHTML = D.PASS_PRODUCTS.map(function (p) {
      return '<div class="row">' +
        '<span class="row__label" style="color:var(--on-surface);font-weight:700">' + esc(p.name) +
          '<span style="display:block;font-weight:400;font-size:var(--fs-sm);color:var(--on-surface-variant)">' +
            esc(D.describeProduct(p)) + '</span></span>' +
        '<span class="row__value" style="font-size:var(--fs-sm)">Set by campus</span>' +
      '</div>';
    }).join('');
  }

  function renderCampuses() {
    $('#campus-grid').innerHTML = D.schoolsForDisplay().map(function (s, i) {
      var p = T.getSchoolPalette(s.code);
      var on = s.code === T.school;
      var tiers = ['Standard'];
      if (s.comfortEnabled) tiers.push('Comfort');
      if (s.independentEnabled) tiers.push('Independent');
      return '<button class="feature press reveal" data-school="' + esc(s.code) + '"' +
        ' style="--reveal-delay:' + Math.min(i * 60, 300) + 'ms;text-align:left;width:100%' +
        (on ? ';border-color:var(--primary);box-shadow:var(--shadow-3)' : '') + '">' +
        '<div style="display:flex;gap:6px;margin-bottom:var(--sp-md)">' +
          '<span style="width:34px;height:34px;border-radius:11px;background:' + p.primary + '"></span>' +
          '<span style="width:34px;height:34px;border-radius:11px;background:' + p.secondary + '"></span>' +
        '</div>' +
        '<h3>' + esc(s.short) + (on ? ' ' + icon('check-circle', 'icon--sm') : '') +
          (s.live ? '' : '<span class="soon">Coming soon</span>') + '</h3>' +
        '<p>' + esc(s.name) + '</p>' +
        '<p style="margin-top:var(--sp-sm)"><strong>' + s.nodes.length + ' stops</strong> · ' + esc(tiers.join(', ')) + '</p>' +
        (s.live
          ? ''
          : '<p style="margin-top:var(--sp-sm);font-size:var(--fs-sm);color:var(--on-surface-variant)">' +
              'Pick it to see the app in this school\u2019s colours. Riding opens once the campus does.</p>') +
      '</button>';
    }).join('');
  }

  $('#campus-grid').addEventListener('click', function (ev) {
    var card = ev.target.closest('[data-school]');
    if (card) T.setSchool(card.getAttribute('data-school'));
  });

  function renderHeroBits() {
    var s = school();
    $('#widget-origin').textContent = s.nodes[0].name;
    $('#widget-destination').textContent = s.nodes[3].name;
    // A discount clause only when the campus actually has one. There is no
    // built-in group discount now, so the common case is no clause at all -
    // and concatenating a null summary would print "· null" on every campus.
    var discount = D.formatPartyDiscountSummary();
    $('#widget-meta').textContent =
      'Your campus sets the fare' + (discount ? ' · ' + discount : '');
    // Count the campuses that are actually open, not the ones this page can
    // draw. Summing all five read as five live services when there is one.
    var live = D.liveSchools();
    $('#stat-campuses').textContent = live.length;
    $('#stat-campuses-label').textContent = live.length === 1 ? 'campus open now' : 'campuses open now';
    // Stops for the campus on screen - the total across five schools is not a
    // number any single rider can use.
    $('#stat-stops').textContent = s.nodes.length;
    $('#footer-note').textContent = 'Showing ' + s.short + ' · ' + T.mode;
  }

  /* ======================================================================
     Pooling diagram
     ====================================================================== */

  function renderPoolDiagram() {
    var host = $('#pool-stage');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.innerHTML = '';
    host.appendChild(svg);
    M.render(svg, school(), {
      originId: school().nodes[0].id,
      destinationId: school().nodes[3].id,
      cars: true,
      labels: true,
    });
  }

  /* ======================================================================
     Demo steps
     ====================================================================== */

  var STEPS = [
    { target: 'home', title: 'Open the app', body: 'Campus map, and one question: where are you going?' },
    { target: 'plan', title: 'Pick your stops', body: 'Only the stops your campus actually has. Pickup and dropoff cannot be the same one.' },
    { target: 'drivers', title: 'Choose a ride', body: 'Tiers priced off your campus’s base fare. Cards show seats taken, ETA, and whether it is a shared car.' },
    { target: 'confirm', title: 'Confirm and pay', body: 'Add seats and watch the group discount appear. Wallet or pay later. Nothing is charged yet.' },
    { target: 'trip', title: 'Follow the trip', body: 'Driver, car, plate, and a route that moves. The fare comes out at drop-off.' },
    { target: 'wallet', title: 'Check the wallet', body: 'Where the money went, topped up from campus MoMo.' },
  ];

  function renderSteps() {
    $('#demo-steps').innerHTML = STEPS.map(function (s, i) {
      return '<button class="demo__step press" role="listitem" data-target="' + s.target + '">' +
        '<span class="demo__step-num">' + (i + 1) + '</span>' +
        '<span><span class="demo__step-title" style="display:block">' + esc(s.title) + '</span>' +
        '<span class="demo__step-body" style="display:block">' + s.body + '</span></span>' +
      '</button>';
    }).join('');
  }

  $('#demo-steps').addEventListener('click', function (ev) {
    var step = ev.target.closest('[data-target]');
    if (!step) return;
    $$('.demo__step').forEach(function (n) { n.classList.remove('is-on'); });
    step.classList.add('is-on');
    App.jumpTo(step.getAttribute('data-target'));
    if (isNarrow()) openDemo();
  });

  /* ======================================================================
     FAQ
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
    $('#faq').innerHTML = FAQ.map(function (row, i) {
      return '<div class="faq__item">' +
        '<button class="faq__q press" aria-expanded="false" aria-controls="faq-a-' + i + '">' +
          esc(row[0]) +
          '<span class="faq__sign">' + icon('plus', 'icon--sm') + '</span>' +
        '</button>' +
        '<div class="faq__a" id="faq-a-' + i + '"><div><p>' + row[1] + '</p></div></div>' +
      '</div>';
    }).join('');
  }

  $('#faq').addEventListener('click', function (ev) {
    var q = ev.target.closest('.faq__q');
    if (!q) return;
    var item = q.parentElement;
    var open = item.classList.toggle('is-open');
    q.setAttribute('aria-expanded', String(open));
  });

  /* ======================================================================
     Off-campus disclosure

     Somebody arriving on #off-campus - from the footer link, or a link a
     friend sent them - wants the list of places, not a collapsed summary
     they have to spot and click a second time. Opening it on arrival is the
     entire reason the section carries an id.

     Progressive, not required: with scripting off the <details> still opens
     on click, which is why it is a <details> and not the FAQ's button.
     ====================================================================== */

  function openOffCampusIfTargeted() {
    if (window.location.hash !== '#off-campus') return;
    var note = document.querySelector('#off-campus .aside-note');
    if (note) note.open = true;
  }

  window.addEventListener('hashchange', openOffCampusIfTargeted);
  openOffCampusIfTargeted();

  /* ======================================================================
     Demo overlay
     ====================================================================== */

  var overlay = $('#demo-overlay');
  var inlineHost = $('#device-screen');
  var overlayHost = $('#device-screen-overlay');
  var lastFocused = null;

  function isNarrow() { return global.matchMedia('(max-width: 860px)').matches; }

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
    // Wait for the fade before moving the app back, otherwise the overlay
    // visibly empties itself on the way out.
    setTimeout(function () {
      if (!overlay.classList.contains('is-open')) App.mountInto(inlineHost);
    }, 260);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  $$('[data-open-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-demo-screen');
      if (target) App.jumpTo(target);
      // On a wide screen the inline device is already visible, so the overlay
      // would be a second copy of something the visitor can see. Scroll to it
      // instead; only narrow screens, where the inline device does not fit,
      // get the full-screen treatment.
      if (isNarrow()) openDemo();
      else document.getElementById('demo').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  $('#demo-close').addEventListener('click', closeDemo);

  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) closeDemo();
  });

  /* ======================================================================
     Reveal on scroll
     ====================================================================== */

  var observer = null;
  function observeReveals() {
    var nodes = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in global)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          observer.unobserve(e.target);
        });
      // A POSITIVE bottom margin, which grows the root box downward: an element
      // 14% of a viewport below the fold already counts as intersecting, so its
      // fade has started by the time it is actually looked at. With a negative
      // margin (the more common copy-paste) the fade only begins once the
      // element is well inside the viewport, and anyone scrolling briskly sees
      // a band of blank page — which is exactly what this was doing.
      }, { rootMargin: '0px 0px 14% 0px', threshold: 0 });
    }
    nodes.forEach(function (n) { observer.observe(n); });

    // A visitor who never scrolls must still see the hero. IntersectionObserver
    // does fire for already-visible elements, but only on its first callback
    // tick — this is the belt to that braces, and it also covers the case where
    // the observer is throttled on a slow device.
    requestAnimationFrame(function () {
      nodes.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < (global.innerHeight || 0) && r.bottom > 0) n.classList.add('is-in');
      });
    });
  }

  /* ======================================================================
     Nav shadow
     ====================================================================== */

  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('is-stuck', global.scrollY > 8); }
  global.addEventListener('scroll', onScroll, { passive: true });

  /* ======================================================================
     Boot
     ====================================================================== */

  // The off-campus list is a real list of real places around ONE campus. On
  // any other campus it would be a promise about somewhere else entirely, so
  // it is hidden rather than translated. With scripting off nothing hides it,
  // which is correct: the default campus is the one the list belongs to.
  function renderOffCampus() {
    var sec = $('#off-campus');
    if (!sec) return;
    var belongsTo = sec.getAttribute('data-campus');
    sec.hidden = !!belongsTo && belongsTo !== T.school;
  }

  function renderAll() {
    renderSwitcher();
    renderOffCampus();
    renderModeToggle();
    renderHeroBits();
    renderTiers();
    renderPasses();
    renderCampuses();
    renderPoolDiagram();
    observeReveals();
  }

  // Rebuilt on every theme change, because the campus drives prices, stop
  // names, which tiers exist, and the map.
  T.onChange(renderAll);

  renderFeatures();
  renderSteps();
  renderFaq();
  // The inline device is the app's home on every screen size — on a phone it
  // simply goes full-bleed. The overlay is a temporary borrow, so booting into
  // it would leave the visible frame empty until something opened it.
  App.mountInto(inlineHost);
  T.apply();          // paints the palette and fires renderAll through onChange
  onScroll();
})(window);
