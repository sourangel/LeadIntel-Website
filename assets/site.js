/* ============================================================
   LeadIntel CRM — shared site behavior (all pages)
   ============================================================ */
(function () {
  'use strict';

  var CALENDLY_URL = 'https://calendly.com/juneflows26/30min';
  // Live automation pipeline (Make.com -> Airtable -> email).
  // Do not change the URL, method, or payload keys.
  var WEBHOOK_URL = 'https://hook.us2.make.com/g3tym115ddjvvxjman4ahfihmaq6da1i';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Scroll-linked effects (one rAF-throttled handler):
     nav elevation, reading-progress bar, hero drift ---------- */
  var nav = document.querySelector('.nav');
  var progressBar = document.getElementById('scrollProgress');
  var heroInner = document.querySelector('.hero-inner');
  var heroDriftMQ = window.matchMedia('(min-width: 980px)');

  var onScroll = function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > 8);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    if (heroInner && !reducedMotion && heroDriftMQ.matches) {
      // gentle parallax: hero content drifts up and fades as you scroll away
      var d = Math.min(y, 720);
      heroInner.style.transform = 'translateY(' + d * 0.14 + 'px)';
      heroInner.style.opacity = Math.max(1 - d / 860, 0);
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('navBurger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        mobileMenu.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length && 'IntersectionObserver' in window && !reducedMotion) {
    // stagger children of [data-reveal-stagger] groups
    document.querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
      var kids = group.querySelectorAll('[data-reveal]');
      kids.forEach(function (kid, i) {
        kid.style.setProperty('--reveal-delay', (i * 0.09).toFixed(2) + 's');
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Timeline: activate steps + draw progress line ---------- */
  var timeline = document.querySelector('.timeline');
  if (timeline && 'IntersectionObserver' in window) {
    var steps = timeline.querySelectorAll('.tl-step');
    var seen = 0;
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          seen = Math.max(seen, Array.prototype.indexOf.call(steps, entry.target) + 1);
          timeline.style.setProperty('--tl-progress', (seen / steps.length).toFixed(3));
          stepIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4, rootMargin: '0px 0px -60px 0px' });
    steps.forEach(function (s) { stepIO.observe(s); });
  }

  /* ---------- Hero ticker simulation (index only) ---------- */
  var scoreA = document.getElementById('scoreA');
  var clk = document.getElementById('clk');
  if (scoreA) {
    setTimeout(function () { scoreA.textContent = 'HOT · 96'; }, 1400);
  }
  if (clk) {
    var seconds = 4;
    setInterval(function () {
      seconds = seconds <= 0 ? 12 : seconds - 1;
      clk.textContent = '00:' + String(seconds).padStart(2, '0');
    }, 1000);
  }

  /* ---------- Book a Demo -> Calendly ---------- */
  document.querySelectorAll('.js-book-demo').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.open(CALENDLY_URL, '_blank');
    });
  });

  /* ---------- Lead form modal (index only; other pages link to
     index.html#get-started which auto-opens it) ---------- */
  var demoModal = document.getElementById('demoModal');
  if (demoModal) {
    var modalClose = document.getElementById('modalClose');
    var formState = document.getElementById('formState');
    var successState = document.getElementById('successState');
    var errorState = document.getElementById('errorState');
    var demoForm = document.getElementById('demoForm');
    var formSubmitBtn = document.getElementById('formSubmitBtn');
    var lastFocus = null;

    var openModal = function () {
      lastFocus = document.activeElement;
      demoModal.classList.add('open');
      formState.style.display = 'block';
      successState.classList.remove('active');
      errorState.classList.remove('active');
      document.body.style.overflow = 'hidden';
      var first = demoModal.querySelector('input');
      if (first) setTimeout(function () { first.focus(); }, 260);
    };
    var closeModal = function () {
      demoModal.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll('.js-get-started').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    modalClose.addEventListener('click', closeModal);
    demoModal.addEventListener('click', function (e) { if (e.target === demoModal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && demoModal.classList.contains('open')) closeModal();
    });

    // arriving from another page's CTA
    if (window.location.hash === '#get-started') {
      openModal();
    }

    demoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      formSubmitBtn.disabled = true;
      formSubmitBtn.textContent = 'Sending…';

      var payload = {
        name: document.getElementById('f-name').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        business_name: document.getElementById('f-business').value.trim(),
        website: document.getElementById('f-website').value.trim(),
        trade: document.getElementById('f-trade').value.trim(),
        lead_volume: document.getElementById('f-volume').value.trim(),
        current_process: document.getElementById('f-process').value.trim(),
        pain_point: document.getElementById('f-pain').value.trim(),
        source: 'form'
      };

      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          formState.style.display = 'none';
          successState.classList.add('active');
        })
        .catch(function () {
          formState.style.display = 'none';
          errorState.classList.add('active');
        })
        .finally(function () {
          formSubmitBtn.disabled = false;
          formSubmitBtn.textContent = 'Send my details';
        });
    });
  }
})();
