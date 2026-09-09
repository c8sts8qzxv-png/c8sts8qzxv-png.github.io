/* ============================================================================
   map.js — the campus map
   ----------------------------------------------------------------------------
   Drawn as SVG from the real CampusNode coordinates in prisma/seed.ts rather
   than pulled from a tile provider. Three reasons, in order of weight:

     1. A tile provider's raster cannot be themed. The app repaints itself in
        each campus's own colours; a grey OSM raster bolted into the middle of
        that reads as a hole in the design, and in dark mode it reads as a
        torch shone in your eye.
     2. Tiles are a network dependency, and this demo's whole job is to work on
        a phone on a campus connection when the real build will not install.
     3. Every stop drawn here is a stop the product actually has, at the
        coordinate the product actually stores.

   The road network is generated, not surveyed — it is a plausible campus
   layout connecting real stops, not a map of real tarmac. Said plainly here so
   nobody reads it as survey data.
   ========================================================================== */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  /* A seeded PRNG so a campus draws identically every time. A map that
     reshuffles its own greenery on each render looks broken, not organic. */
  function rng(seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /**
   * Equirectangular projection with the cos(lat) correction. At campus scale
   * (under 3km) the error against a proper projection is far below a pixel,
   * and without the correction Ghana's campuses come out visibly stretched
   * east-west.
   */
  function project(nodes, width, height, pad) {
    var lats = nodes.map(function (n) { return n.lat; });
    var lngs = nodes.map(function (n) { return n.lng; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var midLat = (minLat + maxLat) / 2;
    var kx = Math.cos(midLat * Math.PI / 180);

    var spanX = Math.max((maxLng - minLng) * kx, 1e-6);
    var spanY = Math.max(maxLat - minLat, 1e-6);
    // One scale for both axes, so the campus keeps its real shape.
    var scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    var offX = (width - spanX * scale) / 2;
    var offY = (height - spanY * scale) / 2;

    return nodes.map(function (n) {
      return {
        node: n,
        x: offX + (n.lng - minLng) * kx * scale,
        // SVG y grows downward; latitude grows northward.
        y: offY + (maxLat - n.lat) * scale,
      };
    });
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /**
   * Road network: a minimum spanning tree (guarantees every stop is reachable,
   * which is what a campus road network actually is) plus the shortest few
   * extra edges, because a pure tree has no loops and real campuses do.
   */
  function buildRoads(pts, rand) {
    var n = pts.length;
    if (n < 2) return [];
    var inTree = [0], out = [], edges = [];
    for (var i = 1; i < n; i++) out.push(i);

    while (out.length) {
      var best = null;
      inTree.forEach(function (a) {
        out.forEach(function (b) {
          var d = dist(pts[a], pts[b]);
          if (!best || d < best.d) best = { a: a, b: b, d: d };
        });
      });
      edges.push([best.a, best.b]);
      inTree.push(best.b);
      out.splice(out.indexOf(best.b), 1);
    }

    var have = {};
    edges.forEach(function (e) { have[Math.min(e[0], e[1]) + ':' + Math.max(e[0], e[1])] = true; });

    var extras = [];
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        var key = a + ':' + b;
        if (!have[key]) extras.push({ a: a, b: b, d: dist(pts[a], pts[b]) });
      }
    }
    extras.sort(function (p, q) { return p.d - q.d; });
    extras.slice(0, Math.max(1, Math.round(n / 2))).forEach(function (e) {
      edges.push([e.a, e.b]);
    });
    return edges;
  }

  /** A gently bowed path — dead-straight segments read as a wiring diagram. */
  function curvePath(p, q, rand) {
    var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    var dx = q.x - p.x, dy = q.y - p.y;
    var len = Math.hypot(dx, dy) || 1;
    var bow = (rand() - 0.5) * len * 0.12;
    return 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) +
      ' Q' + (mx - dy / len * bow).toFixed(1) + ' ' + (my + dx / len * bow).toFixed(1) +
      ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1);
  }

  var W = 800, H = 800;

  /**
   * @param {SVGElement} svg      target <svg>
   * @param {object}     school   a TraverseData school
   * @param {object}     opts     { originId, destinationId, cars, labels }
   */
  function render(svg, school, opts) {
    opts = opts || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    var rand = rng(school.code);
    var pts = project(school.nodes, W, H, 96);
    var byId = {};
    pts.forEach(function (p) { byId[p.node.id] = p; });

    /* -- land ------------------------------------------------------- */
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'var(--map-land)' }));

    /* -- greens: soft blobs anchored off the stops, so they sit inside
          the campus footprint instead of floating at the edges -------- */
    var greens = el('g', { opacity: '0.9' });
    for (var g = 0; g < 5; g++) {
      var anchor = pts[Math.floor(rand() * pts.length)];
      var rx = 40 + rand() * 90, ry = 34 + rand() * 80;
      greens.appendChild(el('ellipse', {
        cx: (anchor.x + (rand() - 0.5) * 180).toFixed(1),
        cy: (anchor.y + (rand() - 0.5) * 180).toFixed(1),
        rx: rx.toFixed(1), ry: ry.toFixed(1),
        transform: 'rotate(' + (rand() * 90).toFixed(0) + ' ' + anchor.x.toFixed(1) + ' ' + anchor.y.toFixed(1) + ')',
        fill: 'var(--map-green)',
      }));
    }
    svg.appendChild(greens);

    /* -- roads: casing under fill, the standard cartographic trick that
          makes a network read as roads rather than as lines ----------- */
    var roads = buildRoads(pts, rand);
    var paths = roads.map(function (e) { return curvePath(pts[e[0]], pts[e[1]], rand); });

    var casing = el('g', {
      stroke: 'var(--map-road-line)', 'stroke-width': 15,
      fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    var fill = el('g', {
      stroke: 'var(--map-road)', 'stroke-width': 10,
      fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    paths.forEach(function (d) {
      casing.appendChild(el('path', { d: d }));
      fill.appendChild(el('path', { d: d }));
    });
    svg.appendChild(casing);
    svg.appendChild(fill);

    /* -- route ------------------------------------------------------- */
    var origin = opts.originId && byId[opts.originId];
    var destination = opts.destinationId && byId[opts.destinationId];

    if (origin && destination) {
      var routeD = curvePath(origin, destination, rng(school.code + opts.originId + opts.destinationId));
      svg.appendChild(el('path', {
        d: routeD, fill: 'none',
        stroke: 'var(--primary)', 'stroke-width': 13,
        'stroke-linecap': 'round', opacity: '0.16',
      }));
      var line = el('path', {
        d: routeD, fill: 'none',
        stroke: 'var(--primary)', 'stroke-width': 6,
        'stroke-linecap': 'round', class: 'map-route',
      });
      svg.appendChild(line);
      // Draw-on, so the route reads as being computed rather than as having
      // always been there. One-shot: it plays when the route changes, never
      // on a loop, because a looping route line is a distraction on a screen
      // the rider is trying to read a price off.
      try {
        var len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        line.style.transition = 'stroke-dashoffset 640ms var(--ease-out)';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { line.style.strokeDashoffset = '0'; });
        });
      } catch (e) { /* getTotalLength is unsupported in some headless engines */ }
    }

    /* -- other cars circling, for life ------------------------------- */
    if (opts.cars !== false && paths.length) {
      var carCount = Math.min(3, paths.length);
      for (var c = 0; c < carCount; c++) {
        var pathId = 'kr-road-' + school.code + '-' + c;
        var defs = el('defs');
        defs.appendChild(el('path', { id: pathId, d: paths[(c * 2) % paths.length] }));
        svg.appendChild(defs);

        var car = el('circle', { r: 5.5, fill: 'var(--accent-on-surface)', class: 'map-car' });
        var motion = el('animateMotion', {
          dur: (11 + c * 4) + 's',
          repeatCount: 'indefinite',
          begin: (c * -3) + 's',
          rotate: 'auto',
        });
        motion.appendChild(el('mpath', { href: '#' + pathId }));
        // Safari still wants the namespaced form.
        motion.querySelector('mpath').setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + pathId);
        car.appendChild(motion);
        svg.appendChild(car);
      }
    }

    /* -- stops ------------------------------------------------------- */
    var stops = el('g');
    pts.forEach(function (p) {
      var isOrigin = origin && p.node.id === origin.node.id;
      var isDest = destination && p.node.id === destination.node.id;
      var active = isOrigin || isDest;

      var dot = el('g', { class: 'map-stop' + (active ? ' is-active' : '') });
      dot.appendChild(el('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: active ? 13 : 7,
        fill: 'var(--surface)',
        stroke: active ? 'var(--primary)' : 'var(--outline-variant)',
        'stroke-width': active ? 5 : 3,
      }));
      if (isDest) {
        dot.appendChild(el('rect', {
          x: (p.x - 4).toFixed(1), y: (p.y - 4).toFixed(1),
          width: 8, height: 8, rx: 1.5, fill: 'var(--primary)',
        }));
      } else if (isOrigin) {
        dot.appendChild(el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4, fill: 'var(--primary)' }));
      }
      stops.appendChild(dot);

      if (opts.labels !== false && (active || p.node.type === 'gate')) {
        var label = el('text', {
          x: p.x.toFixed(1), y: (p.y - (active ? 24 : 18)).toFixed(1),
          'text-anchor': 'middle', class: 'map-label',
        });
        label.textContent = p.node.name;
        stops.appendChild(label);
      }
    });
    svg.appendChild(stops);

    return { points: pts, byId: byId };
  }

  global.TraverseMap = { render: render, W: W, H: H };
})(window);
