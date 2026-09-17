/* ============================================================================
   site.js — the shell every page shares: the phone / tablet menu
   ----------------------------------------------------------------------------
   uber.com below 1120px: a round button in the bar swaps between a menu and a
   close glyph and opens a full-height white panel under the bar. Loaded by
   the landing page, the legal documents and the 404.
   ========================================================================== */
(function (global) {
  'use strict';

  var btn = document.querySelector('.nav__menu-btn');
  var menu = document.getElementById('menu');
  if (!btn || !menu) return;

  function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }

  function setOpen(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    // Hidden from the tab order and screen readers while closed, or keyboard
    // users walk through eight links they cannot see.
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
  }

  setOpen(false);

  btn.addEventListener('click', function () { setOpen(!isOpen()); });

  // Following a link closes the menu, including in-page anchors, which would
  // otherwise scroll the page underneath a panel that is still covering it.
  menu.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
  });

  // Widening past the breakpoint hides the panel with CSS; the scroll lock on
  // <body> has to be released too or the page stays frozen.
  var wide = global.matchMedia('(min-width: 1120px)');
  function onWide() { if (wide.matches && isOpen()) setOpen(false); }
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);
})(window);
