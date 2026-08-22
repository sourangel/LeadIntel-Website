(function () {
  'use strict';

  /* Mobile menu — the nav links collapse below 980px. */
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveal — cards fade up the first time they enter the viewport.
     The .reveal class is only ever added from here, so with JS off (or
     reduced motion on) nothing is hidden. */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.stat, .stage, .step, .feature, .card, .tier, .contact-card, .pullquote, .closer, .faq details'
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('in-view');
        io.unobserve(el);
        /* the stagger delay must not linger, or it delays hover transitions */
        setTimeout(function () { el.style.transitionDelay = ''; }, 800);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 });
    Array.prototype.forEach.call(targets, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  }

  /* Homepage sample queue: one lead resolves from scoring, and every
     time the alert clock hits zero a fresh lead arrives. Decorative
     only — absent on other pages. Reduced motion removes the motion,
     not the information: the pill renders already-resolved and the
     queue holds still. */
  var slot = document.querySelector('[data-score-slot]');
  if (slot) {
    if (reduceMotion) {
      slot.className = 'pill pill-warm';
      slot.textContent = 'Warm 64';
    } else {
      setTimeout(function () {
        slot.className = 'pill pill-warm';
        slot.textContent = 'Warm 64';
      }, 2600);
    }
  }

  /* Reference leads across the trades LeadIntel chases. No particular
     order — a hot, a warm, and a cold each for concrete, plumbing,
     HVAC, and roofing, plus hot leads for solar, custom homes,
     landscaping, and pest control. */
  var SAMPLES = [
    { init: 'CV', title: 'Stamped patio + driveway — Fountain Hills, AZ', est: 'est. $21,000', pill: 'pill-hot', label: 'Hot 92' },
    { init: 'KS', title: 'Water heater replacement — Gilbert, AZ', est: 'est. $2,400', pill: 'pill-warm', label: 'Warm 68' },
    { init: 'RB', title: 'Full tear-off reroof — Scottsdale, AZ', est: 'est. $24,000', pill: 'pill-hot', label: 'Hot 95' },
    { init: 'TM', title: 'Thermostat swap — Surprise, AZ', est: 'est. $350, below minimum', pill: 'pill-cold', label: 'Cold 24' },
    { init: 'JP', title: '12kW solar install — Peoria, AZ', est: 'est. $31,000', pill: 'pill-hot', label: 'Hot 90' },
    { init: 'AV', title: 'Whole-house repipe — Mesa, AZ', est: 'est. $12,800', pill: 'pill-hot', label: 'Hot 88' },
    { init: 'LG', title: 'Sidewalk crack repair — Buckeye, AZ', est: 'est. $900, below minimum', pill: 'pill-cold', label: 'Cold 31' },
    { init: 'RW', title: 'AC + furnace replacement — Phoenix, AZ', est: 'est. $14,200', pill: 'pill-hot', label: 'Hot 91' },
    { init: 'MC', title: 'Full yard redesign — Queen Creek, AZ', est: 'est. $19,500', pill: 'pill-hot', label: 'Hot 86' },
    { init: 'DH', title: 'Tile roof repair — Tempe, AZ', est: 'est. $3,900', pill: 'pill-warm', label: 'Warm 64' },
    { init: 'ES', title: 'Custom build, 2,800 sqft — Cave Creek, AZ', est: 'est. $580,000', pill: 'pill-hot', label: 'Hot 97' },
    { init: 'BN', title: 'Dripping faucet — Casa Grande, AZ', est: 'est. $180, below minimum', pill: 'pill-cold', label: 'Cold 19' },
    { init: 'GF', title: 'Mini-split install — Glendale, AZ', est: 'est. $4,800', pill: 'pill-warm', label: 'Warm 71' },
    { init: 'PT', title: 'Termite treatment — Goodyear, AZ', est: 'est. $3,200', pill: 'pill-hot', label: 'Hot 84' },
    { init: 'JR', title: 'Backyard patio slab — Avondale, AZ', est: 'est. $7,200', pill: 'pill-warm', label: 'Warm 66' },
    { init: 'WK', title: 'Shingle patch — Wickenburg, AZ', est: 'est. $600, out of area', pill: 'pill-cold', label: 'Cold 27' }
  ];
  var next = 0;

  var queue = document.querySelector('.queue');
  var clock = document.querySelector('[data-countdown]');

  function spawnLead() {
    var s = SAMPLES[next];
    next = (next + 1) % SAMPLES.length;

    var row = document.createElement('article');
    row.className = 'lead entering';
    row.innerHTML =
      '<div class="lead-avatar" aria-hidden="true">' + s.init + '</div>' +
      '<div class="lead-body">' +
        '<div class="lead-title">' + s.title + '</div>' +
        '<div class="lead-meta">Submitted 0:02 ago</div>' +
      '</div>' +
      '<span class="pill pill-scoring">Scoring…</span>';
    queue.insertBefore(row, queue.firstChild);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { row.classList.remove('entering'); });
    });

    /* the newcomer scores a beat later, like the original top row */
    setTimeout(function () {
      var pill = row.querySelector('.pill');
      pill.className = 'pill ' + s.pill;
      pill.textContent = s.label;
      row.querySelector('.lead-meta').textContent = 'Submitted 0:05 ago · ' + s.est;
    }, 2600);

    /* keep three rows: fade the oldest out, then drop it */
    var rows = queue.querySelectorAll('.lead');
    if (rows.length > 3) {
      var last = rows[rows.length - 1];
      last.classList.add('leaving');
      setTimeout(function () { last.remove(); }, 380);
    }
  }

  /* The clock counts down to zero; at zero the alert "fires" and a new
     lead lands in the queue, then the clock winds back up. */
  if (clock && queue && !reduceMotion) {
    var t = 3;
    setInterval(function () {
      t = t > 0 ? t - 1 : 12;
      clock.textContent = '00:' + String(t).padStart(2, '0');
      if (t === 0) spawnLead();
    }, 1000);
  }

  /* Intake form — "Get started now" opens it; #get-started from another
     page's CTA opens it on arrival. Posts to the Make scenario that
     writes to Airtable. Do not change the URL, method, or payload keys. */
  var INTAKE_WEBHOOK_URL = 'https://hook.us2.make.com/g3tym115ddjvvxjman4ahfihmaq6da1i';

  var modal = document.getElementById('intakeModal');
  if (modal) {
    var card = modal.querySelector('.modal-card');
    var formState = document.getElementById('intakeFormState');
    var successState = document.getElementById('intakeSuccess');
    var errorState = document.getElementById('intakeError');
    var intakeForm = document.getElementById('intakeForm');
    var submitBtn = document.getElementById('intakeSubmit');
    var lastFocus = null;

    function showForm() {
      formState.hidden = false;
      successState.hidden = true;
      errorState.hidden = true;
    }

    function openModal(trigger) {
      lastFocus = trigger || document.activeElement;
      showForm();
      modal.hidden = false;
      document.body.classList.add('modal-open');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add('open'); });
      });
      setTimeout(function () { intakeForm.querySelector('input').focus(); }, reduceMotion ? 0 : 220);
    }

    function closeModal() {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
      var finish = function () { modal.hidden = true; };
      if (reduceMotion) finish(); else setTimeout(finish, 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.js-get-started'), function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(el);
      });
    });

    document.getElementById('intakeClose').addEventListener('click', closeModal);
    document.getElementById('intakeRetry').addEventListener('click', function () {
      showForm();
      intakeForm.querySelector('input').focus();
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      /* keep Tab inside the dialog */
      var focusable = Array.prototype.filter.call(
        card.querySelectorAll('button, input, textarea, a[href], [tabindex="-1"]'),
        function (el) { return !el.disabled && el.offsetParent !== null; }
      );
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* arriving from another page's CTA, or the hash changing in place */
    if (window.location.hash === '#get-started') openModal();
    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#get-started' && modal.hidden) openModal();
    });

    intakeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!intakeForm.reportValidity()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

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
        source: 'Form'
      };

      fetch(INTAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          formState.hidden = true;
          successState.hidden = false;
          successState.focus();
        })
        .catch(function () {
          formState.hidden = true;
          errorState.hidden = false;
          errorState.focus();
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send my details';
        });
    });
  }
})();
