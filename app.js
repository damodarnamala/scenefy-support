/* Scenefy site — shared interactions.
   Everything here degrades to a perfectly readable static page if JS is unavailable,
   and every motion path is skipped when the visitor asks for reduced motion. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Scroll reveal ------------------------------------------------ */

  var revealables = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    // Anything already on screen at load is revealed outright rather than waiting for an
    // observer callback: above-the-fold content must never depend on an event that a headless
    // renderer, a restored scroll position, or a stalled frame might not deliver.
    revealables.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Stagger siblings so a grid of cards arrives as a wave, not a slab.
        var siblings = Array.prototype.slice.call(entry.target.parentNode.children);
        var delay = Math.min(siblings.indexOf(entry.target), 5) * 70;
        setTimeout(function () { entry.target.classList.add('in'); }, delay);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---- Nav border on scroll + reading progress ---------------------- */

  var nav = document.querySelector('.nav');
  var bar = document.querySelector('.progress');
  var top = document.querySelector('.totop');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('scrolled', y > 8);
    if (top) top.classList.toggle('show', y > 600);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  if (top) {
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---- Pointer-tracked card glow ------------------------------------ */

  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* ---- FAQ filter ---------------------------------------------------- */

  var search = document.getElementById('faq-search');
  if (search) {
    var items = Array.prototype.slice.call(document.querySelectorAll('details.qa'));
    var empty = document.querySelector('.noresults');

    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var hits = 0;

      items.forEach(function (item) {
        var match = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
        item.style.display = match ? '' : 'none';
        // Open matches while filtering so the answer is visible without a second click,
        // and collapse everything again once the field is cleared.
        item.open = q ? match : false;
        if (match) hits++;
      });

      // Section headings whose questions all vanished would otherwise float alone.
      document.querySelectorAll('[data-faq-group]').forEach(function (group) {
        var visible = group.querySelectorAll('details.qa:not([style*="none"])').length;
        group.style.display = visible ? '' : 'none';
      });

      if (empty) empty.style.display = hits ? 'none' : 'block';
    });

    // "/" focuses search, Escape clears it — cheap keyboard affordance.
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== search) {
        e.preventDefault();
        search.focus();
      } else if (e.key === 'Escape' && document.activeElement === search) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
        search.blur();
      }
    });
  }

  /* ---- Table-of-contents scroll spy ---------------------------------- */

  var toc = document.querySelector('.toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a'));
    var headings = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-88px 0px -70% 0px' });

    headings.forEach(function (h) { spy.observe(h); });
  }

  /* ---- Copy email ---------------------------------------------------- */

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      var done = function () {
        var original = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('done'); }, 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var f = document.createElement('textarea');
        f.value = text;
        document.body.appendChild(f);
        f.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(f);
      }
    });
  });

  /* ---- Current page in nav ------------------------------------------- */

  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav .links a').forEach(function (a) {
    var target = a.getAttribute('href');
    if (target === here || (here === 'index.html' && target === './')) a.classList.add('active');
  });
})();
