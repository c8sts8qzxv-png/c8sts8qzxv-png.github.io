/* ============================================================================
   connection.js — the online/offline banner
   ----------------------------------------------------------------------------
   The same thing both native apps show (src/components/OfflineBanner.tsx), in
   the same two states and on the same clock, so that somebody who meets it in
   the app and then on the site is not meeting two different products.

   Two states, and their asymmetry is the whole design:

   The offline copy is two words. It used to read "No internet connection",
   which wrapped the pill onto two lines on a phone; the pill is a state
   indicator, not a sentence, and the shorter string is the whole message.

     offline   stays until the condition it reports actually changes. It has
               no dismiss and no timer, because the page behind it is quietly
               not loading and taking the explanation away would leave that
               unexplained.
     restored  three seconds, then gone. It is an answer to a question the
               visitor already had; once read it is furniture.

   A recovery is never announced without a loss first. On a cold start
   `navigator.onLine` is true and there is nothing to report - a "Connection
   restored" on first paint would be a lie about an event that never happened.

   `navigator.onLine` is a coarse signal: it reports whether the OS has a
   network interface, not whether anything is reachable through it. That is
   why the offline copy says what it will do rather than diagnosing - it is
   honest about a thing it cannot actually see.
   ========================================================================== */
(function (global) {
  'use strict';

  var RESTORED_MS = 3000;

  var el = null;
  var textEl = null;
  var hideTimer = null;
  var hasBeenOffline = false;

  function build() {
    el = document.createElement('div');
    el.className = 'conn';
    // polite, not assertive: it must not interrupt a screen reader mid-word.
    // aria-live on a container that is already in the DOM is what makes the
    // change announced at all - an element inserted with the text already in
    // it is often missed entirely.
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    var pill = document.createElement('div');
    pill.className = 'conn__pill';

    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon icon--sm');
    icon.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#ic-wifi');
    icon.appendChild(use);

    textEl = document.createElement('span');

    pill.appendChild(icon);
    pill.appendChild(textEl);
    el.appendChild(pill);
    document.body.appendChild(el);
  }

  function show(kind, message) {
    if (!el) build();
    clearTimeout(hideTimer);
    textEl.textContent = message;
    el.classList.toggle('is-restored', kind === 'restored');
    // Read back before adding the class so the transition has a frame to
    // start from; without it a banner re-shown while still fading out jumps.
    void el.offsetWidth;
    el.classList.add('is-on');
    if (kind === 'restored') {
      hideTimer = setTimeout(function () { el.classList.remove('is-on'); }, RESTORED_MS);
    }
  }

  function onOffline() {
    hasBeenOffline = true;
    show('offline', 'No connection');
  }

  function onOnline() {
    if (!hasBeenOffline) return;
    show('restored', 'Connection restored');
  }

  global.addEventListener('offline', onOffline);
  global.addEventListener('online', onOnline);

  // A page loaded while already offline never fires the event - the state was
  // true before anything was listening.
  if (global.navigator && global.navigator.onLine === false) onOffline();

  // Exposed so the two states can be looked at without unplugging anything:
  //   TraverseConnection.preview('offline')
  //   TraverseConnection.preview('restored')
  global.TraverseConnection = {
    preview: function (kind) {
      show(kind, kind === 'restored' ? 'Connection restored' : 'No connection');
    },
  };
})(window);
